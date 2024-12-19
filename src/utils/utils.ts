export function createKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function calculateDistance(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

export function interpolateColor(
  minColor: [number, number, number],
  maxColor: [number, number, number],
  min: number,
  max: number,
  t: number,
): [number, number, number] {
  const ratio = Math.min(1, Math.max(0, (t - min) / (max - min)));
  const r = Math.round(minColor[0] + ratio * (maxColor[0] - minColor[0]));
  const g = Math.round(minColor[1] + ratio * (maxColor[1] - minColor[1]));
  const b = Math.round(minColor[2] + ratio * (maxColor[2] - minColor[2]));
  return [r, g, b];
}
