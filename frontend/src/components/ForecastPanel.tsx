// Forecast chart using mock data (Open-Meteo style 48h forecast)
const generate = () => {
  return Array.from({ length: 48 }, (_, i) => {
    const hour = i;
    // Solar curve: bell during day, 0 at night
    const dayPos = ((hour % 24) - 12) / 6;
    const solar = Math.max(0, Math.exp(-dayPos * dayPos) * 9.5 + (Math.random() - 0.5) * 0.4);
    // Wind: more variable
    const wind = 3 + Math.sin(hour / 3) * 2 + Math.cos(hour / 5) * 1.5 + Math.random() * 0.6;
    // Forecast slight offset
    const solarF = Math.max(0, solar + (Math.random() - 0.5) * 0.6);
    const windF = Math.max(0, wind + (Math.random() - 0.5) * 0.5);
    return { hour, solar, wind, solarF, windF };
  });
};

const data = generate();

const W = 1000;
const H = 320;
const PAD = { l: 48, r: 24, t: 24, b: 36 };

const yMax = Math.max(...data.flatMap((d) => [d.solar, d.wind, d.solarF, d.windF])) * 1.1;
const xScale = (i: number) => PAD.l + (i / (data.length - 1)) * (W - PAD.l - PAD.r);
const yScale = (v: number) => PAD.t + (1 - v / yMax) * (H - PAD.t - PAD.b);

const buildArea = (key: "solar" | "wind") => {
  const top = data.map((d, i) => `${xScale(i)},${yScale(d[key])}`).join(" ");
  return `${PAD.l},${H - PAD.b} ${top} ${W - PAD.r},${H - PAD.b}`;
};
const buildLine = (key: "solarF" | "windF") =>
  data.map((d, i) => `${xScale(i)},${yScale(d[key])}`).join(" ");

export const ForecastPanel = () => {
  return (
    <section className="container mx-auto px-6 lg:px-10 pb-16">
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 border border-border bg-card p-6 lg:p-8" style={{ boxShadow: "var(--shadow-soft)" }}>
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground uppercase mb-2">— Forecast · 48h</div>
              <h3 className="font-serif text-2xl">Live AI generation forecast</h3>
              <p className="text-xs text-muted-foreground mt-1">Nagpur Region · Open-Meteo + EP-Forecast v4.2</p>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-mono">
              <Legend color="solar" label="SOLAR" />
              <Legend color="wind" label="WIND" />
              <Legend color="emerald" label="FORECAST" dashed />
            </div>
          </div>

          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
            {/* Grid */}
            {[0, 0.25, 0.5, 0.75, 1].map((p) => (
              <line
                key={p}
                x1={PAD.l}
                x2={W - PAD.r}
                y1={PAD.t + p * (H - PAD.t - PAD.b)}
                y2={PAD.t + p * (H - PAD.t - PAD.b)}
                stroke="hsl(var(--border))"
                strokeWidth="1"
              />
            ))}
            {/* Y labels */}
            {[0, 0.25, 0.5, 0.75, 1].map((p) => (
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
            {/* X labels */}
            {[0, 12, 24, 36, 47].map((i) => (
              <text
                key={`x${i}`}
                x={xScale(i)}
                y={H - PAD.b + 18}
                textAnchor="middle"
                className="fill-muted-foreground"
                style={{ fontSize: 9, fontFamily: "JetBrains Mono" }}
              >
                {String(i).padStart(2, "0")}:00
              </text>
            ))}

            {/* Solar area */}
            <defs>
              <linearGradient id="solarGrad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--solar))" stopOpacity="0.35" />
                <stop offset="100%" stopColor="hsl(var(--solar))" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="windGrad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--wind))" stopOpacity="0.3" />
                <stop offset="100%" stopColor="hsl(var(--wind))" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon points={buildArea("solar")} fill="url(#solarGrad)" />
            <polygon points={buildArea("wind")} fill="url(#windGrad)" />
            <polyline points={data.map((d, i) => `${xScale(i)},${yScale(d.solar)}`).join(" ")} fill="none" stroke="hsl(var(--solar))" strokeWidth="1.75" />
            <polyline points={data.map((d, i) => `${xScale(i)},${yScale(d.wind)}`).join(" ")} fill="none" stroke="hsl(var(--wind))" strokeWidth="1.75" />
            <polyline points={buildLine("solarF")} fill="none" stroke="hsl(var(--emerald))" strokeWidth="1.25" strokeDasharray="3 3" />
            <polyline points={buildLine("windF")} fill="none" stroke="hsl(var(--emerald))" strokeWidth="1.25" strokeDasharray="3 3" opacity="0.6" />
          </svg>
        </div>

        {/* Side notes */}
        <aside className="border border-border bg-card p-6 lg:p-8 space-y-6" style={{ boxShadow: "var(--shadow-soft)" }}>
          <div>
            <div className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground uppercase mb-2">— Grid Intelligence</div>
            <h3 className="font-serif text-2xl mb-1">No anomalies</h3>
            <p className="text-sm text-muted-foreground">All assets reporting within tolerance bands for the last 24 h.</p>
          </div>
          <div className="border-t border-border pt-5 space-y-4">
            <Row label="Peak generation" value="11.2 MW" sub="Tomorrow · 12:30" />
            <Row label="Min generation" value="0.4 MW" sub="Tonight · 03:00" />
            <Row label="Curtailment risk" value="Low" sub="Grid headroom +18%" />
            <Row label="Weather event" value="Clear" sub="Cloud cover 12%" />
          </div>
          <div className="border-t border-border pt-5 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
            Refreshed 14:32 · next 14:42
          </div>
        </aside>
      </div>
    </section>
  );
};

const Legend = ({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) => (
  <div className="flex items-center gap-1.5 text-muted-foreground">
    <svg width="14" height="6">
      <line x1="0" y1="3" x2="14" y2="3" stroke={`hsl(var(--${color}))`} strokeWidth="1.5" strokeDasharray={dashed ? "2 2" : "0"} />
    </svg>
    {label}
  </div>
);

const Row = ({ label, value, sub }: { label: string; value: string; sub: string }) => (
  <div className="flex items-baseline justify-between gap-4">
    <div className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">{label}</div>
    <div className="text-right">
      <div className="font-serif text-lg leading-none">{value}</div>
      <div className="text-[11px] text-muted-foreground mt-1">{sub}</div>
    </div>
  </div>
);
