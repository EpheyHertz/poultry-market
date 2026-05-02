export type EggProductionPoint = {
  date: string;
  eggs: number;
  damaged: number;
};

export type FeedConsumptionPoint = {
  flock: string;
  consumedKg: number;
};

export type SalesByCategoryPoint = {
  name: string;
  value: number;
  color: string;
};

export type MortalityTrendPoint = {
  week: string;
  mortalityRate: number;
};

function formatDate(offsetDays: number) {
  const date = new Date();
  date.setDate(date.getDate() - offsetDays);
  return date.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
}

const eggBase = [182, 188, 176, 194, 201, 197, 205, 210, 204, 198, 214, 220, 217, 221, 230, 226, 219, 224, 228, 232, 236, 240, 238, 244, 248, 252, 249, 255, 258, 262];

export const eggProductionData: EggProductionPoint[] = eggBase.map((eggs, index) => ({
  date: formatDate(29 - index),
  eggs,
  damaged: Math.max(2, Math.round(eggs * 0.028)),
}));

export const feedConsumptionData: FeedConsumptionPoint[] = [
  { flock: 'Layer A', consumedKg: 82 },
  { flock: 'Broiler B', consumedKg: 118 },
  { flock: 'Breeder C', consumedKg: 94 },
  { flock: 'Grower D', consumedKg: 73 },
  { flock: 'Starter E', consumedKg: 56 },
];

export const salesByCategoryData: SalesByCategoryPoint[] = [
  { name: 'Eggs', value: 64, color: '#10B981' },
  { name: 'Meat', value: 22, color: '#F59E0B' },
  { name: 'Live Birds', value: 14, color: '#3B82F6' },
];

export const mortalityTrendData: MortalityTrendPoint[] = [
  { week: 'W1', mortalityRate: 1.6 },
  { week: 'W2', mortalityRate: 1.4 },
  { week: 'W3', mortalityRate: 1.5 },
  { week: 'W4', mortalityRate: 1.3 },
  { week: 'W5', mortalityRate: 1.2 },
  { week: 'W6', mortalityRate: 1.1 },
  { week: 'W7', mortalityRate: 1.0 },
  { week: 'W8', mortalityRate: 1.1 },
  { week: 'W9', mortalityRate: 0.9 },
  { week: 'W10', mortalityRate: 1.0 },
  { week: 'W11', mortalityRate: 0.8 },
  { week: 'W12', mortalityRate: 0.7 },
];