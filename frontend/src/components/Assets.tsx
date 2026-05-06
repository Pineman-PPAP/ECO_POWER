import React from "react";
import { Sun, Wind, MapPin, Activity, X, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { LiveGraph } from "./LiveGraph";

interface Asset {
  plant_id: string;
  name: string;
  plant_type: "solar" | "wind";
  capacity_mw: number;
  dc_capacity_mw?: number;
  district: string;
  status: "green" | "yellow" | "red";
  operator: string;
  year?: number;
  description?: string;
  hardware?: string;
  coordinates?: [number, number];
}

const solarAssets: Asset[] = [
  {
    plant_id: "kpcl_shivanasamudra",
    name: "Shivanasamudra Solar Plant",
    plant_type: "solar",
    capacity_mw: 15,
    dc_capacity_mw: 18,
    district: "Mandya",
    status: "green",
    operator: "KPCL (State Govt)",
    description: "KPCL's flagship 15 MW solar plant located near the Shivanasamudra waterfalls. Generates power using fixed-tilt modules.",
    hardware: "Multi-Crystalline Panels",
    coordinates: [12.3000, 77.1700]
  },
  {
    plant_id: "kpcl_yalesandra",
    name: "Yalesandra Solar PV Plant",
    plant_type: "solar",
    capacity_mw: 3,
    dc_capacity_mw: 3.6,
    district: "Kolar",
    status: "green",
    operator: "KPCL (State Govt)",
    description: "India's first megawatt-scale, grid-connected solar power plant, commissioned in 2009 over 10.3 acres.",
    hardware: "Mono-Crystalline Panels (225Wp & 240Wp)",
    coordinates: [12.8931, 78.1655]
  },
  {
    plant_id: "kpcl_itnal",
    name: "Itnal Solar PV Plant",
    plant_type: "solar",
    capacity_mw: 3,
    dc_capacity_mw: 3.6,
    district: "Belagavi",
    status: "yellow",
    operator: "KPCL (State Govt)",
    description: "State-owned decentralized 3 MW generation facility feeding directly into the northern Karnataka local grid.",
    hardware: "Mono-Crystalline Panels",
    coordinates: [16.4348, 74.6740]
  },
  {
    plant_id: "kpcl_yapaldinni",
    name: "Yapaldinni Solar PV Plant",
    plant_type: "solar",
    capacity_mw: 3,
    dc_capacity_mw: 3.6,
    district: "Raichur",
    status: "green",
    operator: "KPCL (State Govt)",
    description: "3 MW grid-connected power plant located in the high-heat, high-irradiance district of Raichur.",
    hardware: "Mono-Crystalline Panels",
    coordinates: [16.2475, 77.4431]
  },
  {
    plant_id: "kspdcl_pavagada",
    name: "Pavagada Solar Park",
    plant_type: "solar",
    capacity_mw: 2050,
    dc_capacity_mw: 2460,
    district: "Tumkur",
    status: "green",
    operator: "KSPDCL (Joint Govt Venture)",
    description: "One of the world's largest solar parks spanning 13,000 acres. Grid infrastructure managed by KSPDCL.",
    hardware: "Mixed (Thin-film & Multi-Crystalline)",
    coordinates: [14.2500, 77.4500]
  }
];

const windAssets: Asset[] = [
  { plant_id: "1", name: "Tuppadahalli Wind Farm", plant_type: "wind", capacity_mw: 56.1, district: "Chitradurga", status: "green", operator: "Acciona", hardware: "80m Hub Height", coordinates: [14.200, 76.433] },
  { plant_id: "2", name: "Bannur Wind Farm", plant_type: "wind", capacity_mw: 78.0, district: "Vijayapura", status: "green", operator: "Suez", hardware: "120m Hub Height", coordinates: [16.830, 75.720] },
  { plant_id: "3", name: "Jogmatti BSES Wind Farm", plant_type: "wind", capacity_mw: 14.0, district: "Chitradurga", status: "yellow", operator: "BSES", hardware: "65m Hub Height", coordinates: [14.108, 76.391] },
  { plant_id: "4", name: "Bijapur Wind Farm", plant_type: "wind", capacity_mw: 50.0, district: "Vijayapura", status: "green", operator: "Inox Wind", hardware: "106m Hub Height", coordinates: [16.750, 75.900] },
  { plant_id: "5", name: "Gadag Wind Farm", plant_type: "wind", capacity_mw: 302.4, district: "Gadag", status: "green", operator: "ReNew Power", hardware: "135m Hub Height", coordinates: [15.420, 75.620] },
  { plant_id: "6", name: "Energon Mangoli Wind Farm", plant_type: "wind", capacity_mw: 46.0, district: "Vijayapura", status: "green", operator: "Energon", hardware: "100m Hub Height", coordinates: [16.550, 76.200] },
  { plant_id: "7", name: "Tata Power Wind Project", plant_type: "wind", capacity_mw: 50.4, district: "Gadag", status: "green", operator: "Tata Power", hardware: "65m Hub Height", coordinates: [15.350, 75.580] },
  { plant_id: "8", name: "CLP Wind Farm", plant_type: "wind", capacity_mw: 50.0, district: "Belagavi", status: "green", operator: "CLP India", hardware: "80m Hub Height", coordinates: [16.140, 74.830] },
];


const StatusLight = ({ status }: { status: "green" | "yellow" | "red" }) => {
  const colors = {
    green: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]",
    yellow: "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]",
    red: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]",
  };
  return <div className={`w-2 h-2 rounded-full ${colors[status]} animate-pulse`} />;
};

const AssetCard = ({ asset, onClick }: { asset: Asset; onClick: () => void }) => {
  const Icon = asset.plant_type === "solar" ? Sun : Wind;
  const accentColor = asset.plant_type === "solar" ? "hsl(var(--solar))" : "hsl(var(--wind))";

  return (
    <div
      className="p-5 border border-border bg-card flex flex-col justify-between transition-all hover:bg-accent/5 cursor-pointer group"
      style={{ boxShadow: "var(--shadow-soft)" }}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-sm bg-background border border-border group-hover:border-primary/50 transition-colors">
            <Icon className="w-4 h-4" style={{ color: accentColor }} />
          </div>
          <div>
            <h4 className="font-serif text-lg leading-tight">{asset.name}</h4>
            <p className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground uppercase">{asset.district}</p>
          </div>
        </div>
        <StatusLight status={asset.status} />
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="font-serif text-3xl">{asset.capacity_mw}</span>
        <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.25em]">MW Cap</span>
      </div>
    </div>
  );
};

const AssetModal = ({ asset, onClose }: { asset: Asset; onClose: () => void }) => {
  const getHealthInfo = () => {
    switch (asset.status) {
      case "green":
        return {
          title: "Optimal Performance",
          desc: "Plant is operating at peak efficiency with no reported anomalies in the current cycle.",
          icon: <CheckCircle className="w-5 h-5 text-emerald-500" />,
          bgColor: "bg-emerald-500/5",
          borderColor: "border-emerald-500/20"
        };
      case "yellow":
        return {
          title: "Attention Required",
          desc: "Performance variance detected. Operational diagnostics recommended to ensure grid stability.",
          icon: <Info className="w-5 h-5 text-amber-500" />,
          bgColor: "bg-amber-500/5",
          borderColor: "border-amber-500/20"
        };
      case "red":
        return {
          title: "Critical Alert",
          desc: "Critical system disruption detected. Infrastructure experiencing significant downtime; immediate intervention required.",
          icon: <AlertTriangle className="w-5 h-5 text-rose-500" />,
          bgColor: "bg-rose-500/5",
          borderColor: "border-rose-500/20"
        };
    }
  };

  const health = getHealthInfo();
  const [plantStats, setPlantStats] = React.useState({ peak: 0, avg: 0, totalEnergyMWh: 0 });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-card border border-border w-full max-w-5xl h-[70vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-sm bg-background border border-border">
              {asset.plant_type === "solar" ? <Sun className="w-5 h-5 text-solar" /> : <Wind className="w-5 h-5 text-wind" />}
            </div>
            <div>
              <h2 className="font-serif text-2xl leading-none">{asset.name}</h2>
              <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase mt-1">{asset.district} · {asset.capacity_mw} MW</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Graph Section */}
          <div className="flex-1 p-8 bg-accent/5 flex flex-col border-r border-border overflow-y-auto">
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h3 className="font-serif text-xl mb-1">Asset Generation Outlook</h3>
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">48h Timeline · Actual vs AI Predicted</p>
              </div>
              <div className="flex items-center gap-4 text-[10px] font-mono">
                <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-[#f59e0b]"></div> ACTUAL</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 border-t border-dashed border-[#10b981]"></div> PREDICTED</div>
              </div>
            </div>

            {asset.plant_type === "solar" ? (
              <>
                <div className="h-[400px] flex flex-col border border-dashed border-border p-4 bg-background/50 mb-6">
                  <LiveGraph 
                    plant_id={asset.plant_id} 
                    capacity_mw={asset.capacity_mw} 
                    plant_type={asset.plant_type}
                    onDataUpdate={setPlantStats}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <MetricBox 
                    label="Peak Generation" 
                    value={`${plantStats.peak.toFixed(2)} MW`} 
                    sub="Today's Max"
                  />
                  <MetricBox 
                    label="Avg Output" 
                    value={`${plantStats.avg.toFixed(2)} MW`} 
                    sub="Last 24h"
                  />
                  <MetricBox 
                    label="Energy generated till now" 
                    value={`${plantStats.totalEnergyMWh.toFixed(2)} MWh`} 
                    sub="Today's Total"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex-1 min-h-[300px] flex flex-col justify-center mb-8">
                   <AssetForecastChart asset={asset} />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white border border-border p-4 shadow-sm">
                    <div className="text-[9px] font-mono text-muted-foreground uppercase mb-2">Peak Generation</div>
                    <div className="text-xl font-serif">{(asset.capacity_mw * 0.85).toFixed(2)} MW</div>
                    <div className="text-[9px] font-mono text-muted-foreground mt-1 uppercase">Today's Max</div>
                  </div>
                  <div className="bg-white border border-border p-4 shadow-sm">
                    <div className="text-[9px] font-mono text-muted-foreground uppercase mb-2">Avg Output</div>
                    <div className="text-xl font-serif">{(asset.capacity_mw * 0.42).toFixed(2)} MW</div>
                    <div className="text-[9px] font-mono text-muted-foreground mt-1 uppercase">Last 24h</div>
                  </div>
                  <div className="bg-white border border-border p-4 shadow-sm">
                    <div className="text-[9px] font-mono text-muted-foreground uppercase mb-2">Energy Generated</div>
                    <div className="text-xl font-serif">{(asset.capacity_mw * 4.8).toFixed(1)} MWh</div>
                    <div className="text-[9px] font-mono text-muted-foreground mt-1 uppercase">Today's Total</div>
                  </div>
                </div>
              </>
            )}
            </div>
          </div>

          {/* Health & Info Section */}
          <div className="w-full lg:w-80 p-8 space-y-8 overflow-y-auto">
            <div>
              <h4 className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase mb-6">Plant Health Info</h4>
              <div className={`p-6 border ${health.borderColor} ${health.bgColor} rounded-sm space-y-4`}>
                <div className="flex items-center gap-3">
                  {health.icon}
                  <span className="font-serif text-lg">{health.title}</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {health.desc}
                </p>
              </div>
            </div>

            <div className="space-y-6 pt-4 border-t border-border">
              <h4 className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase mb-2">Technical Specs</h4>
              <div className="space-y-4">
                <MetaRow label="Operator" value={asset.operator} />
                {asset.year && <MetaRow label="Comm. Year" value={asset.year.toString()} />}
                {asset.hardware && <MetaRow label="Hardware" value={asset.hardware} />}
                {asset.coordinates && (
                  <MetaRow
                    label="Coordinates"
                    value={`${asset.coordinates[0].toFixed(2)}°N, ${asset.coordinates[1].toFixed(2)}°E`}
                  />
                )}
              </div>
            </div>
      </div>
    </div>
  );
};

const AssetForecastChart = ({ asset }: { asset: Asset }) => {
  const [data, setData] = React.useState<any[]>([]);
  const [hoverIdx, setHoverIdx] = React.useState<number | null>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);
  
  const isWind = asset.plant_type.toLowerCase().includes('wind');
  const colors = {
    actual: isWind ? '#2563eb' : '#f59e0b',
    pred: isWind ? '#06b6d4' : '#10b981',
    bg: '#fdfcf9'
  };

  React.useEffect(() => {
    const fetchAIForecast = async () => {
      try {
        const response = await fetch("http://localhost:8080/predict/plant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plant_id: asset.plant_id,
            plant_type: asset.plant_type,
            installed_capacity_mw: asset.capacity_mw,
            forecast_date: new Date().toISOString().split('T')[0]
          })
        });

        const result = response.ok ? await response.json() : null;
        
        const combinedData = Array.from({ length: 48 }, (_, i) => {
          const isPast = i < 24;
          const hour = i;
          const base = asset.capacity_mw * 0.4;
          const sine = Math.sin((hour + parseInt(asset.plant_id)) / 4) * (asset.capacity_mw * 0.2);
          const p50 = result ? (result.schedule[i * 2]?.p50_mw || base + sine) : base + sine;
          
          return {
            hour,
            isPast,
            p50: p50 + (Math.random() * 2),
            actual: isPast ? (p50 * (0.95 + Math.random() * 0.1)) : null
          };
        });
        
        setData(combinedData);
      } catch (error) {
        console.warn("Forecast connection error, using simulation.");
      }
    };

    fetchAIForecast();
  }, [asset]);

  if (data.length === 0) return null;

  const W = 800;
  const H = 340;
  const PAD = { l: 60, r: 40, t: 60, b: 60 };
  const yMax = asset.capacity_mw * 1.1;

  const xScale = (i: number) => PAD.l + (i / (data.length - 1)) * (W - PAD.l - PAD.r);
  const yScale = (v: number) => PAD.t + (1 - v / yMax) * (H - PAD.t - PAD.b);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((x - PAD.l) / (W - PAD.l - PAD.r)) * (data.length - 1));
    if (i >= 0 && i < data.length) setHoverIdx(i);
  };

  const pointsActual = data.filter(d => d.isPast).map((d, i) => `${xScale(i)},${yScale(d.actual)}`).join(" ");
  const pointsPred = data.map((d, i) => `${xScale(i)},${yScale(d.p50)}`).join(" ");
  const areaActual = `${PAD.l},${H - PAD.b} ${pointsActual} ${xScale(23)},${H - PAD.b}`;

  return (
    <div className="relative border border-border/50 rounded-sm overflow-hidden" style={{ backgroundColor: colors.bg }}>
      <div className="absolute top-6 right-8 flex items-center gap-6 text-[10px] font-mono font-bold tracking-tighter">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5" style={{ backgroundColor: colors.actual }}></div>
          <span className="text-muted-foreground/80">ACTUAL</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 border-t border-dashed" style={{ borderColor: colors.pred }}></div>
          <span className="text-muted-foreground/80">PREDICTED</span>
        </div>
      </div>

      <svg 
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`} 
        className="w-full h-auto overflow-visible cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <line x1={xScale(23.5)} x2={xScale(23.5)} y1={PAD.t} y2={H - PAD.b} stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 4" />
        <text x={xScale(23.5)} y={PAD.t - 10} textAnchor="middle" style={{ fontSize: 9, fill: '#94a3b8', fontFamily: 'monospace' }}>NOW</text>

        {[0, 0.25, 0.5, 0.75, 1].map(p => (
          <line 
            key={p} 
            x1={PAD.l} x2={W-PAD.r} 
            y1={PAD.t + p*(H-PAD.t-PAD.b)} y2={PAD.t + p*(H-PAD.t-PAD.b)} 
            stroke="#e5e7eb" strokeWidth="1" strokeDasharray="2 2" 
          />
        ))}
        
        <text x={xScale(0)} y={H - 10} style={{ fontSize: 10, fill: '#94a3b8', fontFamily: 'monospace', fontWeight: 'bold' }}>MAY 05</text>
        <text x={xScale(24)} y={H - 10} style={{ fontSize: 10, fill: '#94a3b8', fontFamily: 'monospace', fontWeight: 'bold' }}>MAY 06</text>

        {[0, 0.25, 0.5, 0.75, 1].map(p => (
          <text 
            key={p} 
            x={PAD.l - 12} y={PAD.t + p*(H-PAD.t-PAD.b) + 4} 
            textAnchor="end" 
            style={{ fontSize: 11, fill: '#6b7280', fontFamily: 'monospace' }}
          >
            {Math.round(yMax * (1-p))} MW
          </text>
        ))}

        {[0, 6, 12, 18, 24, 30, 36, 42, 47].map(i => (
          <text 
            key={i} 
            x={xScale(i)} y={H - PAD.b + 24} 
            textAnchor="middle" 
            style={{ fontSize: 10, fill: '#6b7280', fontFamily: 'monospace' }}
          >
            {(i % 24).toString().padStart(2, '0')}:00
          </text>
        ))}

        <polygon points={areaActual} fill={colors.actual} fillOpacity="0.1" />
        <polyline points={pointsActual} fill="none" stroke={colors.actual} strokeWidth="2.5" />
        <polyline points={pointsPred} fill="none" stroke={colors.pred} strokeWidth="1.5" strokeDasharray="4 4" />

        {hoverIdx !== null && (
          <g>
            <line x1={xScale(hoverIdx)} x2={xScale(hoverIdx)} y1={PAD.t} y2={H - PAD.b} stroke="#94a3b8" strokeWidth="1" strokeDasharray="1 1" />
            <circle cx={xScale(hoverIdx)} cy={yScale(data[hoverIdx].actual || data[hoverIdx].p50)} r="4" fill={data[hoverIdx].actual ? colors.actual : colors.pred} />
            
            <foreignObject x={xScale(hoverIdx) + (hoverIdx > 24 ? -140 : 10)} y={PAD.t + 40} width="130" height="70">
              <div className="bg-white/95 border border-border p-2 shadow-sm font-mono" style={{ borderLeft: `3px solid ${data[hoverIdx].actual ? colors.actual : colors.pred}` }}>
                <div className="text-[10px] font-bold" style={{ color: data[hoverIdx].actual ? colors.actual : colors.pred }}>
                  {(data[hoverIdx].actual || data[hoverIdx].p50).toFixed(2)} MW
                </div>
                <div className="text-[8px] text-muted-foreground mt-0.5">
                  {data[hoverIdx].actual ? 'ACTUAL' : 'AI FORECAST'}
                </div>
              </div>
            </foreignObject>
          </g>
        )}
      </svg>
    </div>
  );
};

const MetaRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between items-baseline gap-4">
    <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider">{label}</span>
    <span className="font-serif text-sm text-right">{value}</span>
  </div>
);

const MetricBox = ({ label, value, sub }: { label: string; value: string; sub: string }) => (
  <div className="p-4 border border-border bg-background/30 rounded-sm">
    <div className="font-mono text-[8px] tracking-widest text-muted-foreground uppercase mb-1">{label}</div>
    <div className="font-serif text-xl mb-1">{value}</div>
    <div className="font-mono text-[8px] text-muted-foreground/60 uppercase">{sub}</div>
  </div>
);


export const Assets = () => {
  const [selectedAsset, setSelectedAsset] = React.useState<Asset | null>(null);

  const totalSolar = solarAssets.reduce((acc, a) => acc + a.capacity_mw, 0);
  const totalWind = windAssets.reduce((acc, a) => acc + a.capacity_mw, 0);

  return (
    <section className="container mx-auto px-6 lg:px-10 pb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
        <div>
          <div className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground uppercase mb-2">— Assets · Infrastructure</div>
          <h2 className="font-serif text-3xl lg:text-4xl">Grid generation nodes</h2>
        </div>

        <div className="flex gap-8 border-l border-border pl-8 h-fit py-1">
          <div className="flex flex-col">
            <span className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase mb-1">Total Solar</span>
            <span className="font-serif text-2xl text-solar">{totalSolar.toLocaleString()} <span className="text-xs text-muted-foreground">MW</span></span>
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase mb-1">Total Wind</span>
            <span className="font-serif text-2xl text-wind">{totalWind.toLocaleString()} <span className="text-xs text-muted-foreground">MW</span></span>
          </div>
        </div>
      </div>

      <div className="space-y-12">
        <div>
          <div className="flex items-center gap-3 mb-6">
            <Sun className="w-5 h-5 text-solar" />
            <h3 className="font-serif text-2xl">Solar Assets</h3>
            <div className="flex-grow h-px bg-border ml-4" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {solarAssets.map((asset) => (
              <AssetCard key={asset.plant_id} asset={asset} onClick={() => setSelectedAsset(asset)} />
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-3 mb-6">
            <Wind className="w-5 h-5 text-wind" />
            <h3 className="font-serif text-2xl">Wind Assets</h3>
            <div className="flex-grow h-px bg-border ml-4" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {windAssets.map((asset) => (
              <AssetCard key={asset.plant_id} asset={asset} onClick={() => setSelectedAsset(asset)} />
            ))}
          </div>
        </div>
      </div>

      {selectedAsset && <AssetModal asset={selectedAsset} onClose={() => setSelectedAsset(null)} />}
    </section>
  );
};
