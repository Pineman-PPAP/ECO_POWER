import React, { useEffect, useState } from "react";
import { endOfDay, format, parseISO, startOfDay } from "date-fns";
import { buildSyntheticPlantSeries, predictionErrorPctForIndex, predictionFactorForIndex } from "@/lib/syntheticData";

interface ForecastData {
  timestamp: string;
  hour: number;
  solar: number;
  wind: number;
  solarF: number;
  windF: number;
}

interface Plant {
  id: string;
  type: "solar" | "wind";
  ac_capacity_mw?: number;
}

interface GenerationPoint {
  timestamp: string;
  actual_mw: number | null;
  predicted_mw: number | null;
}

export const Forecast = () => {
  const [data, setData] = useState<ForecastData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const aggregateFromSeries = (seriesByPlant: Array<{ type: "solar" | "wind"; series: GenerationPoint[] }>) => {
      const slotMap = new Map<string, { solar: number; wind: number }>();

      seriesByPlant.forEach(({ type, series }) => {
        series.forEach((point) => {
          const ts = parseISO(point.timestamp).toISOString();
          const value = Number(point.actual_mw ?? point.predicted_mw ?? 0);
          const current = slotMap.get(ts) ?? { solar: 0, wind: 0 };
          if (type === "solar") current.solar += value;
          else current.wind += value;
          slotMap.set(ts, current);
        });
      });

      const timestamps = Array.from(slotMap.keys()).sort(
        (a, b) => new Date(a).getTime() - new Date(b).getTime()
      );

      return timestamps.map((timestamp, idx) => {
        const slot = slotMap.get(timestamp) ?? { solar: 0, wind: 0 };
        const solarFactor = predictionFactorForIndex(idx);
        const windFactor = predictionFactorForIndex(idx + 3);
        return {
          timestamp,
          hour: idx,
          solar: Number(slot.solar.toFixed(2)),
          wind: Number(slot.wind.toFixed(2)),
          solarF: Number(Math.max(0, slot.solar * solarFactor).toFixed(2)),
          windF: Number(Math.max(0, slot.wind * windFactor).toFixed(2)),
        };
      });
    };

    const syntheticFromPlants = (plants: Plant[]) => {
      const now = new Date();
      const start = startOfDay(now);
      const end = endOfDay(now);
      const seriesByPlant = plants.map((plant) => ({
        type: plant.type,
        series: buildSyntheticPlantSeries(
          plant.ac_capacity_mw ?? 20,
          plant.type,
          start,
          end,
          15
        ),
      }));
      return aggregateFromSeries(seriesByPlant);
    };

    const fetchForecast = async () => {
      try {
        const plantsRes = await fetch("/api/plants");
        if (!plantsRes.ok) throw new Error("Plants API unavailable");
        const plantsRaw = await plantsRes.json();
        if (!Array.isArray(plantsRaw)) throw new Error("Invalid plants payload");

        const plants: Plant[] = plantsRaw
          .filter((p: any) => p?.id && (p?.type === "solar" || p?.type === "wind"))
          .map((p: any) => ({
            id: p.id,
            type: p.type,
            ac_capacity_mw: Number(p.ac_capacity_mw ?? (p.capacity_kw ? p.capacity_kw / 1000 : 20)),
          }));

        const now = new Date();
        const start = format(startOfDay(now), "yyyy-MM-dd'T'HH:mm:ss");
        const end = format(endOfDay(now), "yyyy-MM-dd'T'HH:mm:ss");

        const fetched = await Promise.all(
          plants.map(async (plant) => {
            try {
              const res = await fetch(`/api/generation/${plant.id}?start=${start}&end=${end}`);
              if (!res.ok) throw new Error("Generation API unavailable");
              const rows = await res.json();
              if (!Array.isArray(rows) || rows.length === 0) throw new Error("Empty generation");
              return { type: plant.type, series: rows as GenerationPoint[] };
            } catch {
              return {
                type: plant.type,
                series: buildSyntheticPlantSeries(
                  plant.ac_capacity_mw ?? 20,
                  plant.type,
                  startOfDay(now),
                  endOfDay(now),
                  15
                ),
              };
            }
          })
        );

        setData(aggregateFromSeries(fetched));
      } catch (error) {
        console.warn("Backend unavailable, using aggregated synthetic plant forecast.");
        const fallbackPlants: Plant[] = [
          { id: "kpcl_shivanasamudra", type: "solar", ac_capacity_mw: 15 },
          { id: "kpcl_yalesandra", type: "solar", ac_capacity_mw: 3 },
          { id: "kpcl_itnal", type: "solar", ac_capacity_mw: 3 },
          { id: "kpcl_yapaldinni", type: "solar", ac_capacity_mw: 3 },
          { id: "kspdcl_pavagada", type: "solar", ac_capacity_mw: 2050 },
          { id: "wind_tuppadahalli", type: "wind", ac_capacity_mw: 56.1 },
          { id: "wind_bannur", type: "wind", ac_capacity_mw: 78 },
          { id: "wind_jogmatti", type: "wind", ac_capacity_mw: 14 },
          { id: "wind_bijapur", type: "wind", ac_capacity_mw: 50 },
          { id: "wind_gadag", type: "wind", ac_capacity_mw: 302.4 },
          { id: "wind_mangoli", type: "wind", ac_capacity_mw: 46 },
          { id: "wind_tata_power", type: "wind", ac_capacity_mw: 50.4 },
          { id: "wind_clp", type: "wind", ac_capacity_mw: 50 },
        ];
        setData(syntheticFromPlants(fallbackPlants));
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
  const [hoverIdx, setHoverIdx] = React.useState<number | null>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);

  const getValues = (d: any) => {
    if (type === "solar") return [d.solar, d.solarF];
    if (type === "wind") return [d.wind, d.windF];
    return [d.solar + d.wind, d.solarF + d.windF];
  };

  if (!data || data.length === 0) return null;

  const yMax = Math.max(...data.flatMap(d => getValues(d))) * 1.1;
  const xScale = (i: number) => PAD.l + (i / (data.length - 1)) * (W - PAD.l - PAD.r);
  const yScale = (v: number) => PAD.t + (1 - v / yMax) * (H - PAD.t - PAD.b);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((x - PAD.l) / (W - PAD.l - PAD.r)) * (data.length - 1));
    if (i >= 0 && i < data.length) setHoverIdx(i);
  };

  const buildArea = (isActual: boolean) => {
    const points = data.map((d, i) => {
      const v = isActual ? 
        (type === "solar" ? d.solar : type === "wind" ? d.wind : d.solar + d.wind) :
        (type === "solar" ? d.solarF : type === "wind" ? d.windF : d.solarF + d.windF);
      return `${xScale(i)},${yScale(v)}`;
    }).join(" ");
    return `${PAD.l},${H - PAD.b} ${points} ${W - PAD.r},${H - PAD.b}`;
  };

  const buildSmoothPath = (isActual: boolean) => {
    const points = data.map((d, i) => {
      const v = isActual ? 
        (type === "solar" ? d.solar : type === "wind" ? d.wind : d.solar + d.wind) :
        (type === "solar" ? d.solarF : type === "wind" ? d.windF : d.solarF + d.windF);
      return { x: xScale(i), y: yScale(v) };
    });

    if (points.length === 0) return "";
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i += 1) {
      const current = points[i];
      const next = points[i + 1];
      const cx = (current.x + next.x) / 2;
      path += ` C ${cx} ${current.y}, ${cx} ${next.y}, ${next.x} ${next.y}`;
    }
    return path;
  };

  const accentColor = type === "solar" ? "solar" : type === "wind" ? "wind" : "primary";

  return (
    <div className="border border-border bg-card p-6 lg:p-8 relative group" style={{ boxShadow: "var(--shadow-soft)" }}>
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground uppercase mb-2">— Forecast · {type.toUpperCase()}</div>
          <h3 className="font-serif text-2xl">{title}</h3>
        </div>
        <div className="flex items-center gap-4 text-[11px] font-mono">
          <Legend color={accentColor} label="POWER GENERATED" />
          <Legend color="emerald" label="AI OUTLOOK" dashed />
        </div>
      </div>

      <svg 
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`} 
        className="w-full h-auto overflow-visible cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
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
        <path d={buildSmoothPath(true)} fill="none" stroke={`hsl(var(--${accentColor}))`} strokeWidth="2" />
        <path
          d={buildSmoothPath(false)}
          fill="none"
          stroke="hsl(var(--emerald))"
          strokeWidth="3.2"
          strokeDasharray="10 6"
          opacity="0.98"
        />

        {hoverIdx !== null && (
          <g>
            <line 
              x1={xScale(hoverIdx)} x2={xScale(hoverIdx)} 
              y1={PAD.t} y2={H - PAD.b} 
              stroke="hsl(var(--primary))" strokeWidth="1" strokeDasharray="2 2" 
            />
            <circle cx={xScale(hoverIdx)} cy={yScale(getValues(data[hoverIdx])[0])} r="4" fill={`hsl(var(--${accentColor}))`} />
            <circle cx={xScale(hoverIdx)} cy={yScale(getValues(data[hoverIdx])[1])} r="4" fill="hsl(var(--emerald))" />
            
            <foreignObject 
              x={xScale(hoverIdx) + (hoverIdx > data.length / 2 ? -160 : 10)} 
              y={PAD.t} width="150" height="80"
            >
              <div className="bg-background/95 backdrop-blur-sm border border-border p-3 shadow-xl rounded-sm">
                <div className="font-mono text-[9px] text-muted-foreground mb-1">BLOCK {hoverIdx + 1}</div>
                <div className="font-mono text-[9px] text-muted-foreground mb-1">
                  {format(parseISO(data[hoverIdx].timestamp), "HH:mm")}
                </div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-mono">Power Generated:</span>
                  <span className={`text-xs font-bold text-${accentColor}`}>{getValues(data[hoverIdx])[0].toFixed(2)} MW</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono">AI Outlook:</span>
                  <span className="text-xs font-bold text-emerald-500">{getValues(data[hoverIdx])[1].toFixed(2)} MW</span>
                </div>
                <div className="mt-1 text-[9px] font-mono text-amber-400">
                  Error band: {(predictionErrorPctForIndex(hoverIdx) * 100).toFixed(0)}%
                </div>
              </div>
            </foreignObject>
          </g>
        )}
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

