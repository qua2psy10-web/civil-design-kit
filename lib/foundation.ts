export const foundationVersion = 'SF-1.0';
export const foundationFields = [
  ['B', 'X方向の底面幅 B', 'm', 3],
  ['L', 'Y方向の底面長 L', 'm', 4],
  ['N', '鉛直力 N（圧縮正）', 'kN', 1200],
  ['Mx', '曲げ Mx（+Y側の圧縮を増加）', 'kN·m', 120],
  ['My', '曲げ My（+X側の圧縮を増加）', 'kN·m', 90],
  ['qa', '許容総接地圧 qa', 'kN/m²', 180],
] as const;
export type FoundationInput = Record<(typeof foundationFields)[number][0], number>;
export const foundationExample: FoundationInput = { B: 3, L: 4, N: 1200, Mx: 120, My: 90, qa: 180 };

export function calculateFoundation({ B, L, N, Mx, My, qa }: FoundationInput) {
  if (![B, L, N, Mx, My, qa].every(Number.isFinite) || Math.min(B, L, N, qa) <= 0) return null;
  const area = B * L;
  const sx = area * L / 6;
  const sy = area * B / 6;
  const ex = My / N;
  const ey = Mx / N;
  const eccentricityRatio = 6 * (Math.abs(ex) / B + Math.abs(ey) / L);
  const average = N / area;
  const momentX = Mx / sx;
  const momentY = My / sy;
  const corners = [
    { label: '−X・＋Y', pressure: average + momentX - momentY },
    { label: '＋X・＋Y', pressure: average + momentX + momentY },
    { label: '−X・−Y', pressure: average - momentX - momentY },
    { label: '＋X・−Y', pressure: average - momentX + momentY },
  ];
  const min = Math.min(...corners.map(corner => corner.pressure));
  const max = Math.max(...corners.map(corner => corner.pressure));
  if (![area, sx, sy, ex, ey, eccentricityRatio, average, min, max, max / qa].every(Number.isFinite) ||
      Math.min(area, sx, sy, average) <= 0) return null;
  const fullContact = eccentricityRatio <= 1 + 8 * Number.EPSILON;
  return {
    area, sx, sy, ex, ey, eccentricityRatio, average, momentX, momentY, corners,
    min: fullContact ? Math.max(0, min) : null,
    max: fullContact ? max : null,
    fullContact,
    utilization: fullContact ? max / qa : null,
    bearingOK: fullContact ? max <= qa : null,
  };
}
