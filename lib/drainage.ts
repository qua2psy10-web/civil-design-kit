export const drainageVersion = 'DR-1.0';
export const drainageFields = [
  ['catchment', '集水面積', 'ha', 1],
  ['rainfall', '降雨強度', 'mm/h', 80],
  ['coefficient', '流出係数', '−', .8],
  ['width', '側溝の内幅', 'm', .6],
  ['height', '側溝の内高', 'm', .6],
  ['diameter', '円管の内径', 'm', .6],
  ['depth', '照査水深', 'm', .4],
  ['slope', '縦断勾配 I（比率）', 'm/m', .005],
  ['roughness', 'Manning粗度係数 n', 's/m⅓', .013],
  ['freeboard', '必要余裕高・管頂空間', 'm', .1],
  ['minVelocity', '流速の下限', 'm/s', .6],
  ['maxVelocity', '流速の上限', 'm/s', 3],
] as const;
export type DrainageInput = Record<(typeof drainageFields)[number][0], number> & { shape: 'rectangle' | 'circle' };
export const drainageExample: DrainageInput = { shape: 'rectangle', catchment: 1, rainfall: 80, coefficient: .8, width: .6, height: .6, diameter: .6, depth: .4, slope: .005, roughness: .013, freeboard: .1, minVelocity: .6, maxVelocity: 3 };
export function calculateDrainage(input: DrainageInput) {
  const errors: string[] = [];
  if (!input || !['rectangle', 'circle'].includes(input.shape)) return { errors: ['断面形式を選択してください。'], values: null, checks: [] };
  const activeFields = drainageFields.filter(([key]) => input.shape === 'circle' ? !['width', 'height'].includes(key) : key !== 'diameter');
  for (const [key, label] of activeFields) if (!Number.isFinite(input[key])) errors.push(label + 'に数値を入力してください。');
  for (const key of ['catchment', 'rainfall', 'depth', 'slope', 'roughness'] as const) if (input[key] <= 0) errors.push(key + 'は正の値が必要です。');
  if (input.coefficient <= 0 || input.coefficient > 1) errors.push('流出係数は0超1以下としてください。');
  if (input.freeboard < 0 || input.minVelocity < 0 || input.maxVelocity <= input.minVelocity) errors.push('余裕高と流速下限は0以上、流速上限は下限より大きくしてください。');
  const totalHeight = input.shape === 'circle' ? input.diameter : input.height;
  if (totalHeight <= 0 || (input.shape === 'rectangle' && input.width <= 0)) errors.push('断面寸法は正の値が必要です。');
  if (input.depth >= totalHeight) errors.push('照査水深は内高・内径未満としてください（自然流下）。');
  if (errors.length) return { errors, values: null, checks: [] };
  let area: number, perimeter: number;
  if (input.shape === 'rectangle') {
    area = input.width * input.depth;
    perimeter = input.width + 2 * input.depth;
  } else {
    const theta = 2 * Math.acos(1 - 2 * input.depth / input.diameter);
    area = input.diameter ** 2 * (theta - Math.sin(theta)) / 8;
    perimeter = input.diameter * theta / 2;
  }
  const radius = area / perimeter;
  const velocity = radius ** (2 / 3) * Math.sqrt(input.slope) / input.roughness;
  const capacity = area * velocity;
  const designFlow = input.coefficient * input.rainfall * input.catchment / 360;
  const freeboard = totalHeight - input.depth;
  const utilization = designFlow / capacity;
  const values = { designFlow, area, perimeter, radius, velocity, capacity, freeboard, utilization };
  if (Object.values(values).some(value => !Number.isFinite(value)) || Math.min(area, perimeter, radius, capacity, designFlow) <= 0) return { errors: ['計算範囲を超えました。寸法・勾配を確認してください。'], values: null, checks: [] };
  const checks = [
    { label: '流下能力', value: capacity, criterion: '≥', limit: designFlow, unit: 'm³/s', ok: capacity >= designFlow },
    { label: input.shape === 'circle' ? '管頂空間' : '余裕高', value: freeboard, criterion: '≥', limit: input.freeboard, unit: 'm', ok: freeboard + 1e-12 >= input.freeboard },
    { label: '流速下限', value: velocity, criterion: '≥', limit: input.minVelocity, unit: 'm/s', ok: velocity >= input.minVelocity },
    { label: '流速上限', value: velocity, criterion: '≤', limit: input.maxVelocity, unit: 'm/s', ok: velocity <= input.maxVelocity },
  ];
  return { errors, values, checks };
}
export const drainageResults = [
  ['designFlow', '計画流量 Qp', 'C × i × Ac / 360', 'm³/s'],
  ['area', '流水断面積 A', '矩形 b y ／ 円管 D²(θ−sinθ)/8', 'm²'],
  ['perimeter', '潤辺 P', '矩形 b+2y ／ 円管 Dθ/2', 'm'],
  ['radius', '径深 R', 'A / P', 'm'],
  ['velocity', '照査水深の平均流速 V', 'R^(2/3) I^(1/2) / n', 'm/s'],
  ['capacity', '照査水深の流下能力 Qc', 'A × V', 'm³/s'],
  ['freeboard', '余裕高・管頂空間', '内高または内径 − y', 'm'],
  ['utilization', '流量使用率', 'Qp / Qc', '−'],
] as const;
