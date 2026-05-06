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
  { plant_id: "wind_davangere", name: "Davangere Wind Farm", plant_type: "wind", capacity_mw: 380, district: "Davangere", status: "green", operator: "Gamesa", year: 2018, coordinates: [14.470, 75.920] },
  { plant_id: "wind_koppal", name: "Koppal Wind Cluster", plant_type: "wind", capacity_mw: 520, district: "Koppal", status: "yellow", operator: "Vestas", year: 2015, coordinates: [15.350, 76.160] },
  { plant_id: "wind_haveri", name: "Haveri Wind Park", plant_type: "wind", capacity_mw: 290, district: "Haveri", status: "green", operator: "Inox Wind", year: 2019, coordinates: [14.790, 75.400] },
  { plant_id: "wind_dharwad", name: "Dharwad Wind Farm", plant_type: "wind", capacity_mw: 160, district: "Dharwad", status: "red", operator: "Adani Wind", year: 2020, coordinates: [15.460, 75.000] },
  { plant_id: "wind_raichur", name: "Raichur Wind Cluster", plant_type: "wind", capacity_mw: 200, district: "Raichur", status: "green", operator: "KREDL", year: 2018, coordinates: [16.050, 77.100] },
  { plant_id: "wind_vijayapura", name: "Vijayapura Wind Park", plant_type: "wind", capacity_mw: 175, district: "Vijayapura", status: "green", operator: "Siemens Gamesa", year: 2021, coordinates: [16.720, 75.550] },
  { plant_id: "wind_ballari", name: "Ballari Wind Farm", plant_type: "wind", capacity_mw: 130, district: "Ballari", status: "green", operator: "Private", year: 2022, coordinates: [15.210, 76.720] },
  { plant_id: "wind_bagalkot", name: "Bagalkot Wind Park", plant_type: "wind", capacity_mw: 100, district: "Bagalkot", status: "yellow", operator: "KSPDCL", year: 2023, coordinates: [16.350, 75.500] },
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
            <div className="mb-8">
              <h3 className="font-serif text-xl mb-3">Plant Overview</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {asset.description || `The ${asset.name} is a key generation node in the ${asset.district} district cluster, contributing ${asset.capacity_mw} MW to the state grid.`}
              </p>
            </div>

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
      </div>
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
