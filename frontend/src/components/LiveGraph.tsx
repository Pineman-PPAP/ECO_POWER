import React, { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
  Line
} from "recharts";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
import { Activity } from "lucide-react";
import { buildSyntheticPlantSeries, predictionErrorPctForIndex, predictionFactorForIndex } from "@/lib/syntheticData";

export const LiveGraph = ({ 
  plant_id, 
  capacity_mw, 
  plant_type,
  onDataUpdate
}: { 
  plant_id: string, 
  capacity_mw: number, 
  plant_type: "solar" | "wind",
  onDataUpdate?: (stats: { peak: number, avg: number, totalEnergyMWh: number }) => void
}) => {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const { actual_mw, predicted_mw, timestampMs, reason, error_pct } = payload[0].payload;
      return (
        <div className="bg-[#1a1a1a] border border-[#333] p-3 rounded-lg shadow-xl backdrop-blur-md font-mono">
          <p className="text-[#888] text-[10px] mb-2">{format(timestampMs, "MMM d, HH:mm")}</p>
          <div className="space-y-1">
            <div className="flex justify-between gap-8">
              <span className="text-muted-foreground text-[10px] uppercase tracking-wider">Actual:</span>
              <span className="text-white text-[10px] font-bold">{actual_mw ? `${actual_mw.toFixed(2)} MW` : 'N/A'}</span>
            </div>
            <div className="flex justify-between gap-8">
              <span className="text-muted-foreground text-[10px] uppercase tracking-wider">Predicted:</span>
              <span className="text-[#4ade80] text-[10px] font-bold">{predicted_mw?.toFixed(2)} MW</span>
            </div>
            <div className="flex justify-between gap-8">
              <span className="text-muted-foreground text-[10px] uppercase tracking-wider">Error Band:</span>
              <span className="text-amber-400 text-[10px] font-bold">{((error_pct ?? 0) * 100).toFixed(0)}%</span>
            </div>
          </div>
          {reason && (
            <div className="mt-2 pt-2 border-t border-[#333]">
              <p className="text-[#aaa] text-[9px] uppercase tracking-wider mb-1 font-bold">AI Insight</p>
              <p className="text-white text-[10px] leading-tight italic opacity-90">"{reason}"</p>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const ensureFuturePrediction = (rows: any[], now: Date) => {
      const nowMs = now.getTime();
      const futureExists = rows.some((r) => r.timestampMs > nowMs && r.predicted_mw !== null && r.predicted_mw !== undefined);
      if (futureExists) return rows;

      const lastActual = [...rows]
        .reverse()
        .find((r) => r.actual_mw !== null && r.actual_mw !== undefined && r.timestampMs <= nowMs);

      const anchor = Number(lastActual?.actual_mw ?? capacity_mw * (plant_type === "solar" ? 0.35 : 0.45));
      const stepMs = 15 * 60 * 1000;
      const endMs = endOfDay(now).getTime();
      const syntheticFuture: any[] = [];

      for (let ts = nowMs + stepMs, i = 0; ts <= endMs; ts += stepMs, i += 1) {
        const idx = Math.floor((ts - startOfDay(now).getTime()) / stepMs);
        const factor = predictionFactorForIndex(Math.max(0, idx));
        const drift = plant_type === "solar" ? Math.max(0.2, 1 - i * 0.02) : 1 + Math.sin(i / 5) * 0.04;
        const predicted = Math.max(0, anchor * factor * drift);
        syntheticFuture.push({
          timestamp: new Date(ts).toISOString(),
          timestampMs: ts,
          actual_mw: null,
          predicted_mw: Number(predicted.toFixed(2)),
          predicted_line_mw: Number(predicted.toFixed(2)),
          error_pct: predictionErrorPctForIndex(Math.max(0, idx)),
        });
      }

      return [...rows, ...syntheticFuture];
    };

    const smoothForwardPrediction = (rows: any[]) => {
      let prevPred: number | null = null;
      return rows.map((row) => {
        if (row.predicted_mw === null || row.predicted_mw === undefined) return row;
        const rawPred = Number(row.predicted_mw);
        const smoothed = prevPred === null ? rawPred : prevPred * 0.72 + rawPred * 0.28;
        prevPred = smoothed;
        return {
          ...row,
          predicted_mw: Number(smoothed.toFixed(2)),
          predicted_line_mw: Number(smoothed.toFixed(2)),
        };
      });
    };

    const synthesize = (now: Date) => {
      const synthetic = buildSyntheticPlantSeries(capacity_mw, plant_type, startOfDay(now), endOfDay(now));
      const raw = synthetic.map((d) => {
        const ts = parseISO(d.timestamp);
        const isFuture = ts.getTime() > now.getTime();
        const idx = Math.floor((ts.getTime() - startOfDay(now).getTime()) / (15 * 60 * 1000));
        const err = predictionErrorPctForIndex(Math.max(0, idx));
        const pred = Math.max(0, d.actual_mw * predictionFactorForIndex(Math.max(0, idx)));
        return {
          ...d,
          timestampMs: ts.getTime(),
          actual_mw: isFuture ? null : d.actual_mw,
          predicted_mw: isFuture ? pred : null,
          predicted_line_mw: isFuture ? pred : null,
          error_pct: err,
        };
      });
      setData(smoothForwardPrediction(ensureFuturePrediction(raw, now)));
      setError(false);
      setLoading(false);
    };

    const fetchData = () => {
      const now = new Date();
      // Show full current day for the grid-style view
      const start = format(startOfDay(now), "yyyy-MM-dd'T'HH:mm:ss");
      const end = format(endOfDay(now), "yyyy-MM-dd'T'HH:mm:ss");

      fetch(`/api/generation/${plant_id}?start=${start}&end=${end}`)
        .then((res) => {
          if (!res.ok) throw new Error("Not found");
          return res.json();
        })
        .then((genData) => {
          if (!genData || genData.length === 0) {
            synthesize(now);
            return;
          }

          const raw = genData.map((d: any) => {
            const ts = parseISO(d.timestamp);
            const actual = (d.actual_mw !== null && ts.getTime() <= now.getTime() + 900000) ? d.actual_mw : null;
            const slotIndex = Math.floor((ts.getTime() - startOfDay(now).getTime()) / (15 * 60 * 1000));
            const errorBand = predictionErrorPctForIndex(Math.max(0, slotIndex));
            const syntheticPredicted = d.actual_mw !== null
              ? d.actual_mw * predictionFactorForIndex(Math.max(0, slotIndex))
              : null;
            const isFuture = ts.getTime() > now.getTime();
            return {
              ...d,
              timestampMs: ts.getTime(),
              actual_mw: isFuture ? null : actual,
              predicted_mw: isFuture
                ? (syntheticPredicted ?? (d.predicted_mw !== null ? d.predicted_mw : null))
                : null,
              predicted_line_mw: isFuture
                ? (syntheticPredicted ?? (d.predicted_mw !== null ? d.predicted_mw : null))
                : null,
              error_pct: errorBand,
            };
          });

          const formatted = smoothForwardPrediction(ensureFuturePrediction(raw, now));
          console.log("Telemetry Data:", formatted);
          setData(formatted);
          
          if (onDataUpdate) {
            const actuals = formatted.filter((d: any) => d.actual_mw !== null);
            const peak = Math.max(...actuals.map((d: any) => d.actual_mw || 0), 0);
            const avg = actuals.length > 0 
              ? actuals.reduce((acc: number, d: any) => acc + (d.actual_mw || 0), 0) / actuals.length 
              : 0;
              
            const totalEnergyMWh = actuals.reduce((acc: number, d: any) => acc + (d.actual_mw || 0) * 0.25, 0);
            
            onDataUpdate({ peak, avg, totalEnergyMWh });
          }
          
          setLoading(false);
        })
        .catch((e) => {
          console.error(e);
          synthesize(now);
        });
    };

    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [plant_id, capacity_mw, plant_type]);

  const nowMs = new Date().getTime();

  if (loading) {
    return (
      <div className="w-full h-[350px] flex items-center justify-center font-mono text-xs text-muted-foreground animate-pulse">
        SYNCING TELEMETRY...
      </div>
    );
  }

  if (error || data.length === 0) {
    return (
      <div className="w-full h-[350px] flex flex-col items-center justify-center text-center p-8">
        <Activity className="w-12 h-12 text-muted-foreground/20 mx-auto mb-6" />
        <h3 className="font-serif text-lg mb-3 text-muted-foreground">Generation Telemetry Unavailable</h3>
        <p className="text-sm text-muted-foreground/70 leading-relaxed italic max-w-sm">
          "Waiting for plant handshake..."
        </p>
      </div>
    );
  }

  const primaryColor = plant_type === "solar" ? "#d9a441" : "#3b82f6";
  const predColor = "#2f9c72";

  return (
    <div className="w-full h-full flex flex-col relative group">
      {/* Internal Legend - Matches Image */}
      <div className="absolute top-4 right-8 z-10 flex items-center gap-6 text-[10px] font-mono pointer-events-none">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5" style={{ backgroundColor: primaryColor }} />
          <span className="text-muted-foreground tracking-widest uppercase">Actual</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 border-t border-dashed border-emerald-500" />
          <span className="text-emerald-500 tracking-widest uppercase font-bold">Predicted</span>
        </div>
      </div>

      <div className="w-full flex-1 p-4 border border-dashed border-[#d8d2c9] bg-[#f4f1ec]">
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={data} margin={{ top: 20, right: 10, left: 0, bottom: 20 }}>
            <defs>
              <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={primaryColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={primaryColor} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorPred" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={predColor} stopOpacity={0.22} />
                <stop offset="95%" stopColor={predColor} stopOpacity={0} />
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#d8d2c9" vertical={false} opacity={0.85} />

            <XAxis 
              dataKey="timestampMs" 
              type="number"
              domain={[startOfDay(new Date()).getTime(), endOfDay(new Date()).getTime()]}
              stroke="#7f7f7a"
              fontSize={9} 
              fontFamily="JetBrains Mono"
              tickFormatter={(val) => {
                const d = new Date(val);
                return format(d, "HH:mm");
              }}
              tick={{ dy: 10 }}
              interval="preserveStartEnd"
              minTickGap={30}
              axisLine={{ stroke: "#8a8781", strokeWidth: 1 }}
            />

            <YAxis
              stroke="#7f7f7a"
              fontSize={9}
              fontFamily="JetBrains Mono"
              tickFormatter={(val) => `${val.toFixed(1)} MW`}
              tick={{ dx: -10 }}
              axisLine={false}
              tickLine={false}
              domain={[0, (max: number) => Math.max(capacity_mw * 1.1, max)]}
            />

            <Tooltip content={<CustomTooltip />} />

            <ReferenceLine x={nowMs} stroke="hsl(var(--destructive))" strokeDasharray="3 3" opacity={0.8}>
                <text x={0} y={-10} fill="hsl(var(--destructive))" fontSize={9} fontFamily="JetBrains Mono" textAnchor="middle" fontWeight="bold">NOW</text>
            </ReferenceLine>

            <Area
              type="monotone"
              dataKey="actual_mw"
              stroke={primaryColor}
              strokeWidth={3}
              fillOpacity={0.2}
              fill="url(#colorActual)"
              isAnimationActive={true}
              animationDuration={2000}
              connectNulls={false}
              strokeLinecap="round"
            />

            <Area
              type="monotone"
              dataKey="predicted_mw"
              stroke="none"
              fillOpacity={0.2}
              fill="url(#colorPred)"
              isAnimationActive={false}
              connectNulls={false}
            />

            <Line
              type="monotone"
              dataKey="predicted_line_mw"
              stroke={predColor}
              strokeWidth={3.8}
              strokeDasharray="8 4"
              dot={{ r: 1.8, fill: predColor, stroke: "none" }}
              activeDot={{ r: 4, fill: predColor, stroke: "#fff", strokeWidth: 1 }}
              opacity={1}
              isAnimationActive={true}
              animationDuration={1500}
              connectNulls={true}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
