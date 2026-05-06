import React, { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine
} from "recharts";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
import { Activity } from "lucide-react";

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
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchData = () => {
      const now = new Date();
      // Show full current day for the grid-style view
      const start = format(startOfDay(now), "yyyy-MM-dd'T'HH:mm:ss");
      const end = format(endOfDay(now), "yyyy-MM-dd'T'HH:mm:ss");

      fetch(`http://localhost:8000/api/generation/${plant_id}?start=${start}&end=${end}`)
        .then((res) => {
          if (!res.ok) throw new Error("Not found");
          return res.json();
        })
        .then((genData) => {
          if (!genData || genData.length === 0) {
            setData([]);
            setLoading(false);
            return;
          }

          const formatted = genData.map((d: any) => {
            const ts = parseISO(d.timestamp);
            return {
              ...d,
              timestampMs: ts.getTime(),
              actual_kw: (d.actual_kw !== null && ts.getTime() <= now.getTime()) ? d.actual_kw : null,
              predicted_kw: d.predicted_kw !== null ? d.predicted_kw : null,
            };
          });

          setData(formatted);
          
          if (onDataUpdate) {
            const actuals = formatted.filter((d: any) => d.actual_kw !== null);
            const peak = Math.max(...actuals.map((d: any) => d.actual_kw || 0), 0) / 1000;
            const avg = actuals.length > 0 
              ? actuals.reduce((acc: number, d: any) => acc + (d.actual_kw || 0), 0) / actuals.length / 1000 
              : 0;
              
            const totalEnergyMWh = actuals.reduce((acc: number, d: any) => acc + (d.actual_kw || 0) * 0.25, 0) / 1000;
            
            onDataUpdate({ peak, avg, totalEnergyMWh });
          }
          
          setLoading(false);
        })
        .catch((e) => {
          console.error(e);
          setError(true);
          setLoading(false);
        });
    };

    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [plant_id]);

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

  const primaryColor = plant_type === "solar" ? "hsl(var(--solar))" : "hsl(var(--wind))";
  const predColor = "hsl(var(--emerald))";

  return (
    <div className="w-full h-full flex flex-col relative group">
      {/* Internal Legend - Matches Image */}
      <div className="absolute top-4 right-8 z-10 flex items-center gap-6 text-[10px] font-mono pointer-events-none">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5" style={{ backgroundColor: primaryColor }} />
          <span className="text-muted-foreground tracking-widest uppercase">Actual</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 border-t border-dashed border-muted-foreground/50" />
          <span className="text-muted-foreground tracking-widest uppercase">Predicted</span>
        </div>
      </div>

      <div className="w-full flex-1 p-4 border border-dashed border-muted-foreground/20 bg-background/30">
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={data} margin={{ top: 20, right: 10, left: 0, bottom: 20 }}>
            <defs>
              <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={primaryColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={primaryColor} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorPred" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={predColor} stopOpacity={0.1} />
                <stop offset="95%" stopColor={predColor} stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.5} />

            <XAxis 
              dataKey="timestampMs" 
              type="number"
              domain={['dataMin', 'dataMax']}
              stroke="hsl(var(--muted-foreground))"
              fontSize={9} 
              fontFamily="JetBrains Mono"
              tickFormatter={(val) => {
                const d = new Date(val);
                if (d.getHours() === 0 && d.getMinutes() === 0) {
                  return `${format(d, "HH:mm")}\n${format(d, "MMM dd")}`;
                }
                return format(d, "HH:mm");
              }}
              tick={{ dy: 10 }}
              interval="preserveStartEnd"
              minTickGap={30}
              axisLine={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
            />

            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={9}
              fontFamily="JetBrains Mono"
              tickFormatter={(val) => `${val}\nkW`}
              tick={{ dx: -10 }}
              axisLine={false}
              tickLine={false}
              domain={[0, capacity_mw * 1000]}
            />

            <Tooltip
              labelFormatter={(label) => format(new Date(label), "MMM dd, HH:mm")}
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                borderColor: 'hsl(var(--border))', 
                borderRadius: '0px',
                boxShadow: 'var(--shadow-soft)',
                fontFamily: 'JetBrains Mono',
                fontSize: '11px'
              }}
            />

            <ReferenceLine x={nowMs} stroke="hsl(var(--destructive))" strokeDasharray="3 3" opacity={0.8}>
                <text x={0} y={-10} fill="hsl(var(--destructive))" fontSize={9} fontFamily="JetBrains Mono" textAnchor="middle" fontWeight="bold">NOW</text>
            </ReferenceLine>

            <Area
              type="monotone"
              dataKey="predicted_kw"
              stroke={predColor}
              strokeWidth={1.5}
              strokeDasharray="5 5"
              fillOpacity={1}
              fill="url(#colorPred)"
              isAnimationActive={false}
              connectNulls={true}
            />

            <Area
              type="monotone"
              dataKey="actual_kw"
              stroke={primaryColor}
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorActual)"
              isAnimationActive={false}
              connectNulls={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
