import React, { useEffect, useState } from "react";
import { Sun, Wind, Activity, TrendingUp } from "lucide-react";

interface GridStatus {
  solar_mw: number;
  wind_mw: number;
  frequency: number;
  timestamp: string;
  is_stale: boolean;
}

export const Dashboard = () => {
  const [status, setStatus] = useState<GridStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch("http://localhost:8080/sldc/status");
        if (!response.ok) throw new Error("Backend unreachable");
        const data = await response.json();
        setStatus(data);
      } catch (error) {
        console.warn("Backend unavailable, using fallback mock data.");
        // Fallback mock data
        setStatus({
          solar_mw: 742.8,
          wind_mw: 421.5,
          frequency: 50.02,
          timestamp: new Date().toLocaleTimeString() + " (Mock)",
          is_stale: false
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, []);


  const stats = [
    { 
      icon: Sun, 
      label: "Solar Output", 
      value: status ? status.solar_mw.toFixed(1) : "—", 
      unit: "MW", 
      delta: status?.is_stale ? "Data Stale" : "Live", 
      color: "solar" 
    },
    { 
      icon: Wind, 
      label: "Wind Output", 
      value: status ? status.wind_mw.toFixed(1) : "—", 
      unit: "MW", 
      delta: status?.is_stale ? "Data Stale" : "Live", 
      color: "wind" 
    },
    { icon: TrendingUp, label: "Accuracy", value: "98.2", unit: "%", delta: "MAPE", color: "emerald" },
    { 
      icon: Activity, 
      label: "Frequency", 
      value: status ? status.frequency.toFixed(2) : "50.00", 
      unit: "Hz", 
      delta: "Stable", 
      color: "primary" 
    },
  ];

  // 48 mock points for sparkline
  const series = (seed: number) =>
    Array.from({ length: 48 }, (_, i) => {
      const v = 50 + Math.sin((i + seed) / 4) * 25 + Math.cos((i + seed * 2) / 3) * 12;
      return Math.max(8, Math.min(95, v));
    });

  const Sparkline = ({ data, color }: { data: number[]; color: string }) => {
    const w = 100, h = 28;
    const max = Math.max(...data), min = Math.min(...data);
    const pts = data
      .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / (max - min || 1)) * h}`)
      .join(" ");
    return (
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full h-8">
        <defs>
          <linearGradient id={`g-${color}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={`hsl(var(--${color}))`} stopOpacity="0.25" />
            <stop offset="100%" stopColor={`hsl(var(--${color}))`} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline points={`0,${h} ${pts} ${w},${h}`} fill={`url(#g-${color})`} />
        <polyline points={pts} fill="none" stroke={`hsl(var(--${color}))`} strokeWidth="1.25" vectorEffect="non-scaling-stroke" />
      </svg>
    );
  };

  return (
    <section className="container mx-auto px-6 lg:px-10 pb-16">
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground uppercase mb-2">— Dashboard · Live</div>
          <h2 className="font-serif text-3xl lg:text-4xl">Today's grid at a glance</h2>
        </div>
        <div className="hidden md:flex items-center gap-3 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
          <span className={`w-1.5 h-1.5 rounded-full ${status ? "bg-accent animate-blink" : "bg-muted"}`} />
          {loading ? "Initializing..." : status ? `SLDC Timestamp: ${status.timestamp}` : "System Offline"}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 border border-border bg-card" style={{ boxShadow: "var(--shadow-soft)" }}>
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className={`p-6 lg:p-7 ${i < 3 ? "lg:border-r" : ""} ${i < 2 ? "border-r border-b lg:border-b-0" : i === 2 ? "border-b lg:border-b-0" : ""} border-border`}
            >
              <div className="flex items-center justify-between mb-5">
                <span className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground uppercase">{s.label}</span>
                <Icon className="w-4 h-4" style={{ color: `hsl(var(--${s.color}))` }} />
              </div>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="font-serif text-5xl">{s.value}</span>
                <span className="text-sm text-muted-foreground">{s.unit}</span>
              </div>
              <div className="font-mono text-[11px] mb-4" style={{ color: `hsl(var(--${s.color}))` }}>{s.delta}</div>
              <Sparkline data={series(i)} color={s.color} />
            </div>
          );
        })}
      </div>
    </section>
  );
};

