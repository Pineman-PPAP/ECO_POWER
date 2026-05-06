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
import { format, subDays, addHours, parseISO } from "date-fns";
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

  const CustomTick = (props: any) => {
    const { x, y, payload } = props;
    const lines = payload.value.split('\n');
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} dy={14} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={10} fontFamily="JetBrains Mono">
          {lines[0]}
        </text>
        {lines.length > 1 && (
          <text x={0} y={0} dy={28} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={8} opacity={0.5} fontFamily="JetBrains Mono">
            {lines[1]}
          </text>
        )}
      </g>
    );
  };

  useEffect(() => {
    setLoading(true);
    setError(false);

    const start = subDays(new Date(), 1).toISOString();
    const end = addHours(new Date(), 24).toISOString();

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

        const formatted = genData.map((d: any, i: number) => {
          const ts = parseISO(d.timestamp);
          return {
            ...d,
            timestampMs: ts.getTime(),
            // Only show date on the first tick and at midnight
            displayTime: (i === 0 || format(ts, "HH:mm") === "00:00") 
                ? `${format(ts, "HH:mm")}\n${format(ts, "MMM dd")}` 
                : format(ts, "HH:mm"),
            actual_kw: d.actual_kw !== null ? d.actual_kw : undefined,
            predicted_kw: d.predicted_kw !== null ? d.predicted_kw : undefined,
          };
        });

        setData(formatted);
        
        if (onDataUpdate) {
          const actuals = formatted.filter((d: any) => d.actual_kw !== undefined);
          const peak = Math.max(...actuals.map((d: any) => d.actual_kw || 0), 0) / 1000;
          const avg = actuals.length > 0 
            ? actuals.reduce((acc: number, d: any) => acc + (d.actual_kw || 0), 0) / actuals.length / 1000 
            : 0;
            
          // Energy Generated Till Now (Today only)
          const todayStart = new Date().setHours(0, 0, 0, 0);
          const todayActuals = actuals.filter((d: any) => d.timestampMs >= todayStart);
          const totalEnergyMWh = todayActuals.reduce((acc: number, d: any) => acc + (d.actual_kw || 0) * 0.25, 0) / 1000;
          
          onDataUpdate({ peak, avg, totalEnergyMWh });
        }
        
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setError(true);
        setLoading(false);
      });
  }, [plant_id]);

  const nowMs = new Date().getTime();

  if (loading) {
    return (
      <div className="w-full h-[320px] flex items-center justify-center font-mono text-xs text-muted-foreground animate-pulse">
        SYNCING TELEMETRY...
      </div>
    );
  }

  if (error || data.length === 0) {
    if (plant_type === "solar") return null;

    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-center p-8">
        <Activity className="w-12 h-12 text-muted-foreground/20 mx-auto mb-6" />
        <h3 className="font-serif text-lg mb-3 text-muted-foreground">Generation Telemetry Unavailable</h3>
        <p className="text-sm text-muted-foreground/70 leading-relaxed italic max-w-sm">
          "Real-time plant-level data synchronization is currently in progress or the node is offline."
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center gap-4 text-[11px] font-mono justify-end mb-4 pr-4">
        <div className={`flex items-center gap-1.5 ${plant_type === 'solar' ? 'text-solar' : 'text-wind'}`}>
          <div className={`w-3 h-0.5 ${plant_type === 'solar' ? 'bg-solar' : 'bg-wind'}`} /> ACTUAL
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <div className="w-3 h-0.5 border-t border-dashed border-emerald" /> PREDICTED
        </div>
      </div>
      <div className="w-full flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
            <defs>
              <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={`hsl(var(--${plant_type}))`} stopOpacity={0.3} />
                <stop offset="95%" stopColor={`hsl(var(--${plant_type}))`} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorPred" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--emerald))" stopOpacity={0.1} />
                <stop offset="95%" stopColor="hsl(var(--emerald))" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />

            <XAxis 
              dataKey="displayTime" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={10} 
              fontFamily="JetBrains Mono"
              tick={<CustomTick />}
              interval={16}
              minTickGap={30}
            />

            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={10}
              fontFamily="JetBrains Mono"
              tickFormatter={(val) => `${val} kW`}
              domain={[0, capacity_mw * 1000]}
            />

            <Tooltip
              contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '4px' }}
              itemStyle={{ fontFamily: 'JetBrains Mono', fontSize: '12px' }}
              labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '4px', fontSize: '10px' }}
            />

            <ReferenceLine x={format(nowMs, "HH:mm")} stroke="hsl(var(--destructive))" strokeDasharray="3 3">
                <text x={0} y={-5} fill="hsl(var(--destructive))" fontSize={10} fontFamily="JetBrains Mono" textAnchor="middle">NOW</text>
            </ReferenceLine>

            <Area
              type="monotone"
              dataKey="predicted_kw"
              name="Predicted"
              stroke="hsl(var(--emerald))"
              strokeDasharray="4 4"
              fillOpacity={1}
              fill="url(#colorPred)"
              isAnimationActive={false}
            />

            <Area
              type="monotone"
              dataKey="actual_kw"
              name="Actual"
              stroke={`hsl(var(--${plant_type}))`}
              strokeWidth={2}
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
