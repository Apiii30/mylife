/**
 * Tata letak "justified" (seperti Google Photos): foto disusun per baris dengan tinggi
 * yang disesuaikan agar setiap baris penuh selebar kontainer, tanpa memotong foto.
 */
export type JustifiedItem<T> = { item: T; width: number; height: number };
export type JustifiedRow<T> = { height: number; items: JustifiedItem<T>[] };

const clampAspect = (ratio: number) => Math.min(3, Math.max(0.5, ratio)); // panorama/portrait ekstrem dipotong sedikit

export function justify<T extends { width: number; height: number }>(items: T[], containerWidth: number, targetHeight: number, gap: number) {
  const rows: JustifiedRow<T>[] = [];
  let row: T[] = [];
  let aspectSum = 0;

  const push = (height: number) => {
    rows.push({ height, items: row.map((item) => ({ item, height, width: clampAspect(item.width / item.height) * height })) });
    row = [];
    aspectSum = 0;
  };

  for (const item of items) {
    row.push(item);
    aspectSum += clampAspect(item.width / item.height);
    const height = (containerWidth - gap * (row.length - 1)) / aspectSum;
    if (height <= targetHeight) push(height);
  }
  // Baris terakhir tidak direntangkan agar foto tidak terlalu besar
  if (row.length) push(Math.min(targetHeight, (containerWidth - gap * (row.length - 1)) / aspectSum));
  return rows;
}
