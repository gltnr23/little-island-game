/** Length of one full day/night cycle in seconds. */
export const DAY_LENGTH = 240;

type RGB = [number, number, number];

// Phase 0..1 -> multiply tint. 0 = morning, ~0.55 dusk, 0.65-0.88 night, ~0.95 dawn.
const KEYS: [number, RGB][] = [
  [0.0, [1, 1, 1]],
  [0.45, [1, 1, 1]],
  [0.55, [1, 0.78, 0.6]],
  [0.65, [0.36, 0.42, 0.72]],
  [0.88, [0.36, 0.42, 0.72]],
  [0.96, [0.95, 0.82, 0.86]],
  [1.0, [1, 1, 1]],
];

export function tintAt(phase: number): number {
  const p = ((phase % 1) + 1) % 1;
  for (let i = 0; i < KEYS.length - 1; i++) {
    const [p0, c0] = KEYS[i];
    const [p1, c1] = KEYS[i + 1];
    if (p >= p0 && p <= p1) {
      const t = p1 === p0 ? 0 : (p - p0) / (p1 - p0);
      const c = c0.map((v, k) => v + (c1[k] - v) * t);
      return (Math.round(c[0] * 255) << 16) | (Math.round(c[1] * 255) << 8) | Math.round(c[2] * 255);
    }
  }
  return 0xffffff;
}

/** 0 in daylight, 1 in full night; used for lights, fireflies and music. */
export function nightAmount(phase: number): number {
  const p = ((phase % 1) + 1) % 1;
  if (p < 0.5 || p > 0.97) return 0;
  if (p < 0.65) return (p - 0.5) / 0.15;
  if (p <= 0.88) return 1;
  return 1 - (p - 0.88) / 0.09;
}
