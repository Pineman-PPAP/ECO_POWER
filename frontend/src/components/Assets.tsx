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
  { plant_id: "wind_tuppadahalli", name: "Tuppadahalli Wind Farm", plant_type: "wind", capacity_mw: 56.1, district: "Chitradurga", status: "green", operator: "Acciona", hardware: "80m Hub Height", coordinates: [14.200, 76.433] },
  { plant_id: "wind_bannur", name: "Bannur Wind Farm", plant_type: "wind", capacity_mw: 78.0, district: "Vijayapura", status: "green", operator: "Suez", hardware: "120m Hub Height", coordinates: [16.830, 75.720] },
  { plant_id: "wind_jogmatti", name: "Jogmatti BSES Wind Farm", plant_type: "wind", capacity_mw: 14.0, district: "Chitradurga", status: "yellow", operator: "BSES", hardware: "65m Hub Height", coordinates: [14.108, 76.391] },
  { plant_id: "wind_bijapur", name: "Bijapur Wind Farm", plant_type: "wind", capacity_mw: 50.0, district: "Vijayapura", status: "green", operator: "Inox Wind", hardware: "106m Hub Height", coordinates: [16.750, 75.900] },
  { plant_id: "wind_gadag", name: "Gadag Wind Farm", plant_type: "wind", capacity_mw: 302.4, district: "Gadag", status: "green", operator: "ReNew Power", hardware: "135m Hub Height", coordinates: [15.420, 75.620] },
  { plant_id: "wind_mangoli", name: "Energon Mangoli Wind Farm", plant_type: "wind", capacity_mw: 46.0, district: "Vijayapura", status: "green", operator: "Energon", hardware: "100m Hub Height", coordinates: [16.550, 76.200] },
  { plant_id: "wind_tata_power", name: "Tata Power Wind Project", plant_type: "wind", capacity_mw: 50.4, district: "Gadag", status: "green", operator: "Tata Power", hardware: "65m Hub Height", coordinates: [15.350, 75.580] },
  { plant_id: "wind_clp", name: "CLP Wind Farm", plant_type: "wind", capacity_mw: 50.0, district: "Belagavi", status: "green", operator: "CLP India", hardware: "80m Hub Height", coordinates: [16.140, 74.830] },
];


const StatusLight = ({ status }: { status: "green" | "yellow" | "red" }) => {
  const colors = {
    green: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]",
    yellow: "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]",
    red: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]",
  };
  return <div className={`w-2 h-2 rounded-full ${colors[status]} animate-pulse`} />;
};

const AssetCard = ({ asset, onClick }: { asset: Asset; onClick: () => void }) => {
  const Icon = asset.plant_type === "solar" ? Sun : Wind;
  const accentColor = asset.plant_type === "solar" ? "hsl(var(--solar))" : "hsl(var(--wind))";

  return (
    <div
      className="p-6 border border-border bg-card flex flex-col justify-between transition-all hover:bg-accent/5 cursor-pointer group"
      style={{ boxShadow: "var(--shadow-soft)" }}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-sm bg-background border border-border group-hover:border-primary/50 transition-colors">
            <Icon className="w-4 h-4" style={{ color: accentColor }} />
          </div>
          <div>
            <h4 className="font-serif text-lg leading-tight">{asset.name}</h4>
            <p className="font-mono text-[9px] tracking-[0.2em] text-muted-foreground uppercase">{asset.district}</p>
          </div>
        </div>
        <StatusLight status={asset.status} />
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="font-serif text-3xl">{asset.capacity_mw}</span>
        <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">MW Cap</span>
      </div>
    </div>
  );
};

const AssetModal = ({ asset, onClose }: { asset: Asset; onClose: () => void }) => {
  const [plantStats, setPlantStats] = React.useState({ peak: 0, avg: 0, totalEnergyMWh: 0 });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-background/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-card border border-border w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
        {/* Header - Editorial Style */}
        <div className="p-8 border-b border-border flex justify-between items-start">
          <div className="space-y-4 max-w-2xl">
            <h2 className="font-serif text-3xl">{asset.name}</h2>
            <p className="text-muted-foreground text-sm leading-relaxed font-sans opacity-80">
              {asset.description || "Operational generation node providing grid stability and clean energy throughput to the regional load despatch center."}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-background/50">
          {/* Main Visualization Section */}
          <div className="flex-1 p-8 flex flex-col overflow-y-auto">
            <div className="flex-1 mb-8">
              <LiveGraph
                plant_id={asset.plant_id}
                capacity_mw={asset.capacity_mw}
                plant_type={asset.plant_type}
                onDataUpdate={setPlantStats}
              />
            </div>

            {/* Metrics Grid - Matches Image Aesthetic */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                label="Energy Generated Till Now"
                value={`${plantStats.totalEnergyMWh.toFixed(2)} MWh`}
                sub="Today's Total"
              />
            </div>
          </div>

          {/* Technical Specs Sidebar */}
          <div className="w-full lg:w-80 border-l border-border p-8 bg-card flex flex-col space-y-8">
            <div>
              <h4 className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground uppercase mb-6">— Specifications</h4>
              <div className="space-y-5">
                <MetaRow label="Operator" value={asset.operator} />
                <MetaRow label="Capacity" value={`${asset.capacity_mw} MW`} />
                <MetaRow label="District" value={asset.district} />
                {asset.hardware && <MetaRow label="Hardware" value={asset.hardware} />}
                {asset.coordinates && (
                  <MetaRow
                    label="Location"
                    value={`${asset.coordinates[0].toFixed(2)}°N, ${asset.coordinates[1].toFixed(2)}°E`}
                  />
                )}
              </div>
            </div>

            <div className="pt-8 border-t border-border mt-auto">
              <div className="flex items-center gap-3 p-4 bg-accent/5 border border-accent/10 rounded-sm">
                <div className={`w-2 h-2 rounded-full ${asset.status === 'green' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span className="font-mono text-[10px] tracking-widest uppercase">System Status: {asset.status === 'green' ? 'Optimal' : 'Checking'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MetaRow = ({ label, value }: { label: string; value: string }) => (
  <div className="space-y-1">
    <div className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">{label}</div>
    <div className="font-serif text-base">{value}</div>
  </div>
);

const MetricBox = ({ label, value, sub }: { label: string; value: string; sub: string }) => (
  <div className="p-6 border border-border bg-card rounded-sm flex flex-col justify-between min-h-[140px]">
    <div className="font-mono text-[9px] tracking-[0.25em] text-muted-foreground uppercase">{label}</div>
    <div className="font-serif text-3xl my-4">{value}</div>
    <div className="font-mono text-[9px] text-muted-foreground/50 uppercase tracking-widest">{sub}</div>
  </div>
);


export const Assets = () => {
  const [selectedAsset, setSelectedAsset] = React.useState<Asset | null>(null);

  const totalSolar = solarAssets.reduce((acc, a) => acc + a.capacity_mw, 0);
  const totalWind = windAssets.reduce((acc, a) => acc + a.capacity_mw, 0);

  return (
    <section className="container mx-auto px-6 lg:px-10 pb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
        <div>
          <div className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground uppercase mb-2">— Assets · Generation Nodes</div>
          <h2 className="font-serif text-4xl">Grid Infrastructure</h2>
        </div>

        <div className="flex gap-12 border-l border-border pl-12 py-1">
          <div className="flex flex-col">
            <span className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase mb-1">Solar Assets</span>
            <span className="font-serif text-3xl text-solar">{totalSolar.toLocaleString()} <span className="text-xs text-muted-foreground">MW</span></span>
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase mb-1">Wind Assets</span>
            <span className="font-serif text-3xl text-wind">{totalWind.toLocaleString()} <span className="text-xs text-muted-foreground">MW</span></span>
          </div>
        </div>
      </div>

      <div className="space-y-16">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <Sun className="w-5 h-5 text-solar" />
            <h3 className="font-serif text-2xl uppercase tracking-tight">Solar Photovoltaic</h3>
            <div className="flex-grow h-px bg-border/50 ml-4" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {solarAssets.map((asset) => (
              <AssetCard key={asset.plant_id} asset={asset} onClick={() => setSelectedAsset(asset)} />
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-3 mb-8">
            <Wind className="w-5 h-5 text-wind" />
            <h3 className="font-serif text-2xl uppercase tracking-tight">Wind Turbines</h3>
            <div className="flex-grow h-px bg-border/50 ml-4" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
