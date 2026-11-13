export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(text: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function deriveRng(baseSeed: string, key: string): Rng {
  return mulberry32(hashString(`${baseSeed}:${key}`));
}

export function int(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

export function pick<T>(rng: Rng, list: readonly T[]): T {
  const value = list[int(rng, 0, list.length - 1)];
  if (value === undefined) {
    throw new Error("Kan ikke velge fra en tom liste.");
  }
  return value;
}

export function shuffle<T>(rng: Rng, list: readonly T[]): T[] {
  const result = [...list];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = int(rng, 0, index);
    const a = result[index];
    const b = result[swap];
    if (a !== undefined && b !== undefined) {
      result[index] = b;
      result[swap] = a;
    }
  }
  return result;
}
