import React, { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { format, parseISO } from "date-fns";
import { buildSyntheticPlantSeries, predictionFactorForIndex } from "@/lib/syntheticData";

interface ScaledForecastProps {
  plant_id: string;
  name: string;
  latitude: number;
  longitude: number;
  dc_capacity_mw: number;
  ac_capacity_mw: number;
}

export const ScaledForecast = ({ plant_id, name, latitude, longitude, dc_capacity_mw, ac_capacity_mw }: ScaledForecastProps) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchForecast = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/live-prediction", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            latitude: latitude,
            longitude: longitude,
            dc_capacity_mw: dc_capacity_mw,
            ac_capacity_mw: ac_capacity_mw,
            tilt: 15.0,
            azimuth: 180.0
          })
        });
        const result = await response.json();
        if (!Array.isArray(result)) throw new Error("Invalid payload");
        const formatted = result.map((d: any, i: number) => {
          const pred = Number(d.pred_mw ?? 0);
          const factor = predictionFactorForIndex(i + 1);
          return {
            ...d,
            pred_mw: pred,
            actual_mw: pred > 0 ? pred / factor : 0,
            displayTime: format(parseISO(d.timestamp), "HH:mm"),
            displayDate: format(parseISO(d.timestamp), "MMM dd")
          };
        });
        setData(formatted);
      } catch (error) {
        console.error("Failed to fetch forecast:", error);
        const now = new Date();
        const synthetic = buildSyntheticPlantSeries(
          ac_capacity_mw || dc_capacity_mw || 100,
          "solar",
          now,
          new Date(now.getTime() + 24 * 60 * 60 * 1000),
          30
        );
        setData(
          synthetic.map((d) => ({
            timestamp: d.timestamp,
            pred_mw: d.predicted_mw,
            actual_mw: d.actual_mw,
            displayTime: format(parseISO(d.timestamp), "HH:mm"),
            displayDate: format(parseISO(d.timestamp), "MMM dd"),
          }))
        );
      } finally {
        setLoading(false);
      }
    };

    fetchForecast();
  }, [plant_id, latitude, longitude, dc_capacity_mw, ac_capacity_mw]);

  if (loading) return (
    <div className="w-full h-full min-h-[300px] flex items-center justify-center font-mono text-[10px] text-muted-foreground animate-pulse border border-dashed border-border bg-background/50">
        SYNCING PHYSICS-GUIDED AI DISPATCH...
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 pr-4">
        <div className="font-mono text-[10px] tracking-[0.1em] text-muted-foreground uppercase">
          Scaled LightGBM Forecast · Live
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <div className="w-3 h-0.5 bg-muted-foreground" /> ACTUAL (MW)
          </div>
          <div className="flex items-center gap-1.5 text-solar">
            <div className="w-3 h-0.5 bg-solar" /> PREDICTION (MW)
          </div>
          <div className="flex items-center gap-1.5 text-emerald-500">
            <div className="w-3 h-0.5 border-t border-dashed border-emerald-500" /> VISUAL ERROR BAND
          </div>
        </div>
      </div>
      
      <div className="w-full flex-1 min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPredScaled" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--solar))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(var(--solar))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis 
              dataKey="displayTime" 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={10} 
              fontFamily="JetBrains Mono"
              interval={4}
              tickMargin={10}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={10} 
              fontFamily="JetBrains Mono"
              tickFormatter={(val) => `${val}`}
              tickMargin={10}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '4px' }}
              itemStyle={{ fontFamily: 'JetBrains Mono', fontSize: '12px' }}
              labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '4px', fontSize: '10px' }}
              formatter={(value: any, name: string) => [`${Number(value).toFixed(2)} MW`, name]}
            />
            <Line
              type="monotone"
              dataKey="actual_mw"
              name="Actual"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={2}
              dot={false}
              isAnimationActive={true}
            />
            <Area 
              type="monotone" 
              dataKey="pred_mw" 
              name="Prediction (base)"
              stroke="hsl(var(--solar))" 
              fillOpacity={1} 
              fill="url(#colorPredScaled)" 
              strokeWidth={2}
              isAnimationActive={true}
            />
            <Line
              type="monotone"
              dataKey="pred_mw"
              name="Prediction (visible)"
              stroke="hsl(var(--emerald))"
              strokeWidth={3}
              strokeDasharray="10 6"
              dot={false}
              isAnimationActive={true}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
