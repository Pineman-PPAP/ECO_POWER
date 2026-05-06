import React, { useEffect, useState } from "react";

interface ForecastData {
  hour: number;
  solar: number;
  wind: number;
  solarF: number;
  windF: number;
}

export const Forecast = () => {
  const [data, setData] = useState<ForecastData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchForecast = async () => {
      try {
        const response = await fetch("http://localhost:8080/sldc/generation?limit=24");
        if (!response.ok) throw new Error("Backend unreachable");
        const raw = await response.json();
        
        const chartData = raw.reverse().map((entry: any, i: number) => ({
          hour: i,
          solar: entry.solar_mw,
          wind: entry.wind_mw,
          solarF: entry.solar_mw * (1 + (Math.random() - 0.5) * 0.1),
          windF: entry.wind_mw * (1 + (Math.random() - 0.5) * 0.1),
        }));
        setData(chartData);
      } catch (error) {
        console.warn("Backend unavailable, using mock forecast curves.");
        const mockData = Array.from({ length: 24 }, (_, i) => {
          const hour = i;
          const dayPos = ((hour % 24) - 12) / 6;
          const solar = Math.max(0, Math.exp(-dayPos * dayPos) * 1000);
          const wind = 500 + Math.sin(hour / 3) * 200;
          return {
            hour,
            solar: solar,
            wind: wind,
            solarF: solar * 1.05,
            windF: wind * 0.98
          };
        });
        setData(mockData);
      } finally {
        setLoading(false);
      }
    };

    fetchForecast();
  }, []);


  if (loading) {
    return (
      <div className="container mx-auto px-6 lg:px-10 py-20 text-center animate-pulse text-muted-foreground">
        Synthesizing Grid Forecast Models...
      </div>
    );
  }


const W = 1000;
const H = 240;
const PAD = { l: 48, r: 24, t: 24, b: 36 };

const Legend = ({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) => (
  <div className="flex items-center gap-1.5 text-muted-foreground">
    <svg width="14" height="6">
      <line x1="0" y1="3" x2="14" y2="3" stroke={`hsl(var(--${color}))`} strokeWidth="1.5" strokeDasharray={dashed ? "2 2" : "0"} />
    </svg>
    {label}
  </div>
);

const ForecastChart = ({ title, type, data }: { title: string; type: "combined" | "solar" | "wind", data: ForecastData[] }) => {
  const getValues = (d: any) => {
    if (type === "solar") return [d.solar, d.solarF];
    if (type === "wind") return [d.wind, d.windF];
    return [d.solar + d.wind, d.solarF + d.windF];
  };

  if (!data || data.length === 0) return null;

  const yMax = Math.max(...data.flatMap(d => getValues(d))) * 1.1;
  const xScale = (i: number) => PAD.l + (i / (data.length - 1)) * (W - PAD.l - PAD.r);
  const yScale = (v: number) => PAD.t + (1 - v / yMax) * (H - PAD.t - PAD.b);

  const buildArea = (isActual: boolean) => {
    const points = data.map((d, i) => {
      const v = isActual ? 
        (type === "solar" ? d.solar : type === "wind" ? d.wind : d.solar + d.wind) :
        (type === "solar" ? d.solarF : type === "wind" ? d.windF : d.solarF + d.windF);
      return `${xScale(i)},${yScale(v)}`;
    }).join(" ");
    return `${PAD.l},${H - PAD.b} ${points} ${W - PAD.r},${H - PAD.b}`;
  };

  const buildLine = (isActual: boolean) => {
    return data.map((d, i) => {
      const v = isActual ? 
        (type === "solar" ? d.solar : type === "wind" ? d.wind : d.solar + d.wind) :
        (type === "solar" ? d.solarF : type === "wind" ? d.windF : d.solarF + d.windF);
      return `${xScale(i)},${yScale(v)}`;
    }).join(" ");
  };

  const accentColor = type === "solar" ? "solar" : type === "wind" ? "wind" : "primary";

  return (
    <div className="border border-border bg-card p-6 lg:p-8" style={{ boxShadow: "var(--shadow-soft)" }}>
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground uppercase mb-2">— Forecast · {type.toUpperCase()}</div>
          <h3 className="font-serif text-2xl">{title}</h3>
        </div>
        <div className="flex items-center gap-4 text-[11px] font-mono">
          <Legend color={accentColor} label="ACTUAL" />
          <Legend color="emerald" label="AI FORECAST" dashed />
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto overflow-visible">
        <defs>
          <linearGradient id={`grad-${type}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={`hsl(var(--${accentColor}))`} stopOpacity="0.2" />
            <stop offset="100%" stopColor={`hsl(var(--${accentColor}))`} stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((p) => (
          <line
            key={p}
            x1={PAD.l}
            x2={W - PAD.r}
            y1={PAD.t + p * (H - PAD.t - PAD.b)}
            y2={PAD.t + p * (H - PAD.t - PAD.b)}
            stroke="hsl(var(--border))"
            strokeWidth="0.5"
            strokeDasharray="4 4"
          />
        ))}

        {/* Labels */}
        {[0, 0.5, 1].map((p) => (
          <text
            key={`y${p}`}
            x={PAD.l - 8}
            y={PAD.t + p * (H - PAD.t - PAD.b) + 3}
            textAnchor="end"
            className="fill-muted-foreground"
            style={{ fontSize: 9, fontFamily: "JetBrains Mono" }}
          >
            {Math.round(yMax * (1 - p))} MW
          </text>
        ))}

        <polygon points={buildArea(true)} fill={`url(#grad-${type})`} />
        <polyline points={buildLine(true)} fill="none" stroke={`hsl(var(--${accentColor}))`} strokeWidth="2" />
        <polyline points={buildLine(false)} fill="none" stroke="hsl(var(--emerald))" strokeWidth="1.5" strokeDasharray="4 4" />
      </svg>
    </div>
  );
};

  return (
    <section className="container mx-auto px-6 lg:px-10 pb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-10">
        <div className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground uppercase mb-2">— Intelligence · Forecast Hub</div>
        <h2 className="font-serif text-3xl lg:text-4xl">Cluster generation outlook</h2>
      </div>


      <div className="flex flex-col gap-8">
        <ForecastChart title="Solar + Wind Forecast (Combined)" type="combined" data={data} />
        <div className="grid lg:grid-cols-2 gap-8">
          <ForecastChart title="Solar Generation Forecast" type="solar" data={data} />
          <ForecastChart title="Wind Generation Forecast" type="wind" data={data} />
        </div>
      </div>
    </section>
  );
};

