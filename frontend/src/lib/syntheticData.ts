type PlantKind = "solar" | "wind";

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const ERROR_PATTERN = [-0.08, -0.04, 0, 0.04, 0.08, 0.12, 0.08, 0.04, 0, -0.04];

// Keep neighboring points close so prediction lines render smooth, not triangular.
export const predictionFactorForIndex = (index: number) => {
  const bucket = Math.floor(index / 2);
  return 1 + ERROR_PATTERN[bucket % ERROR_PATTERN.length];
};
export const predictionErrorPctForIndex = (index: number) =>
  Math.abs(ERROR_PATTERN[Math.floor(index / 2) % ERROR_PATTERN.length]);

export interface SyntheticPoint {
  timestamp: string;
  actual_mw: number;
  predicted_mw: number;
}

export const buildSyntheticPlantSeries = (
  capacityMw: number,
  kind: PlantKind,
  start: Date,
  end: Date,
  intervalMinutes = 15
): SyntheticPoint[] => {
  const data: SyntheticPoint[] = [];
  const startMs = start.getTime();
  const endMs = end.getTime();
  const stepMs = intervalMinutes * 60 * 1000;

  for (let ts = startMs, i = 0; ts <= endMs; ts += stepMs, i += 1) {
    const date = new Date(ts);
    const hour = date.getHours() + date.getMinutes() / 60;
    let base = 0;

    if (kind === "solar") {
      const daylight = clamp((hour - 6) / 12, 0, 1);
      const bell = Math.sin(Math.PI * daylight);
      const cloudNoise = 0.9 + 0.08 * Math.sin(i / 5);
      base = capacityMw * bell * cloudNoise;
    } else {
      const windPattern = 0.38 + 0.18 * Math.sin(i / 4) + 0.1 * Math.cos(i / 7);
      const gusts = 0.95 + 0.08 * Math.sin(i / 2.5);
      base = capacityMw * clamp(windPattern * gusts, 0.12, 0.82);
    }

    const actual = clamp(base, 0, capacityMw * 1.02);
    const predicted = clamp(actual * predictionFactorForIndex(i), 0, capacityMw * 1.2);

    data.push({
      timestamp: date.toISOString(),
      actual_mw: Number(actual.toFixed(2)),
      predicted_mw: Number(predicted.toFixed(2)),
    });
  }

  return data;
};

export interface SyntheticGridPoint {
  sldc_ts: string;
  solar_mw: number;
  wind_mw: number;
  total_generation_mw: number;
  state_demand_mw: number;
}

export const buildSyntheticGridSeries = (blocks = 24): SyntheticGridPoint[] => {
  const now = new Date();
  const data: SyntheticGridPoint[] = [];

  for (let i = blocks - 1; i >= 0; i -= 1) {
    const ts = new Date(now.getTime() - i * 15 * 60 * 1000);
    const hour = ts.getHours() + ts.getMinutes() / 60;
    const daylight = clamp((hour - 6) / 12, 0, 1);
    const solar = 2200 * Math.sin(Math.PI * daylight) * (0.92 + 0.07 * Math.sin(i / 3));
    const wind = 1400 * clamp(0.48 + 0.14 * Math.sin(i / 2.2) + 0.08 * Math.cos(i / 5), 0.2, 0.9);
    const total = Math.max(0, solar) + wind;

    data.push({
      sldc_ts: ts.toISOString(),
      solar_mw: Number(Math.max(0, solar).toFixed(2)),
      wind_mw: Number(wind.toFixed(2)),
      total_generation_mw: Number(total.toFixed(2)),
      state_demand_mw: Number((12500 + 650 * Math.sin(i / 6)).toFixed(2)),
    });
  }

  return data;
};
