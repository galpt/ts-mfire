import { LRUCache } from 'lru-cache';

const rc4Keys: Record<string, string> = {
  l: 'u8cBwTi1CM4XE3BkwG5Ble3AxWgnhKiXD9Cr279yNW0=',
  g: 't00NOJ/Fl3wZtez1xU6/YvcWDoXzjrDHJLL2r/IWgcY=',
  B: 'S7I+968ZY4Fo3sLVNH/ExCNq7gjuOHjSRgSqh6SsPJc=',
  m: '7D4Q8i8dApRj6UWxXbIBEa1UqvjI+8W0UvPH9talJK8=',
  F: '0JsmfWZA1kwZeWLk5gfV5g41lwLL72wHbam5ZPfnOVE='
};

const seeds32: Record<string, string> = {
  A: 'pGjzSCtS4izckNAOhrY5unJnO2E1VbrU+tXRYG24vTo=',
  V: 'dFcKX9Qpu7mt/AD6mb1QF4w+KqHTKmdiqp7penubAKI=',
  N: 'owp1QIY/kBiRWrRn9TLN2CdZsLeejzHhfJwdiQMjg3w=',
  P: 'H1XbRvXOvZAhyyPaO68vgIUgdAHn68Y6mrwkpIpEue8=',
  k: '2Nmobf/mpQ7+Dxq1/olPSDj3xV8PZkPbKaucJvVckL0='
};

const prefixKeys: Record<string, string> = {
  O: 'Rowe+rg/0g==',
  v: '8cULcnOMJVY8AA==',
  L: 'n2+Og2Gth8Hh',
  p: 'aRpvzH+yoA==',
  W: 'ZB4oBi0='
};

function atob(s: string): Buffer { return Buffer.from(s, 'base64'); }
function btoa(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function rc4(keyBuf: Buffer, inputBuf: Buffer): Uint8Array {
  const key = Array.from(keyBuf);
  const input = Array.from(inputBuf);
  const s: number[] = new Array(256);
  for (let i = 0; i < 256; i++) s[i] = i;
  let j = 0;
  for (let i = 0; i < 256; i++) {
    j = (j + s[i] + (key[i % key.length] & 0xff)) & 0xff;
    [s[i], s[j]] = [s[j], s[i]];
  }
  const out = new Uint8Array(input.length);
  let i = 0;
  j = 0;
  for (let y = 0; y < input.length; y++) {
    i = (i + 1) & 0xff;
    j = (j + s[i]) & 0xff;
    [s[i], s[j]] = [s[j], s[i]];
    const k = s[(s[i] + s[j]) & 0xff];
    out[y] = (input[y] ^ k) & 0xff;
  }
  return out;
}

type ScheduleFn = (c: number) => number;

function transform(inputBuf: Buffer, initSeedBytes: Buffer, prefixKeyBytes: Buffer, prefixLen: number, schedule: ScheduleFn[]): Uint8Array {
  const input = Array.from(inputBuf);
  const init = Array.from(initSeedBytes);
  const pref = Array.from(prefixKeyBytes);
  const out: number[] = [];
  for (let i = 0; i < input.length; i++) {
    if (i < prefixLen) out.push(pref[i]);
    const transformed = schedule[i % 10](((input[i] ^ init[i % 32]) & 0xff)) & 0xff;
    out.push(transformed);
  }
  return Uint8Array.from(out);
}

function makeScheduleC(): ScheduleFn[] { return [
  (c)=> (c - 48 + 256) & 0xff,
  (c)=> (c - 19 + 256) & 0xff,
  (c)=> (c ^ 241) & 0xff,
  (c)=> (c - 19 + 256) & 0xff,
  (c)=> (c + 223) & 0xff,
  (c)=> (c - 19 + 256) & 0xff,
  (c)=> (c - 170 + 256) & 0xff,
  (c)=> (c - 19 + 256) & 0xff,
  (c)=> (c - 48 + 256) & 0xff,
  (c)=> (c ^ 8) & 0xff
]; }

function makeScheduleY(): ScheduleFn[] { return [
  (c)=> ((c << 4) | (c >> 4)) & 0xff,
  (c)=> (c + 223) & 0xff,
  (c)=> ((c << 4) | (c >> 4)) & 0xff,
  (c)=> (c ^ 163) & 0xff,
  (c)=> (c - 48 + 256) & 0xff,
  (c)=> (c + 82) & 0xff,
  (c)=> (c + 223) & 0xff,
  (c)=> (c - 48 + 256) & 0xff,
  (c)=> (c ^ 83) & 0xff,
  (c)=> ((c << 4) | (c >> 4)) & 0xff
]; }

function makeScheduleB(): ScheduleFn[] { return [
  (c)=> (c - 19 + 256) & 0xff,
  (c)=> (c + 82) & 0xff,
  (c)=> (c - 48 + 256) & 0xff,
  (c)=> (c - 170 + 256) & 0xff,
  (c)=> ((c << 4) | (c >> 4)) & 0xff,
  (c)=> (c - 48 + 256) & 0xff,
  (c)=> (c - 170 + 256) & 0xff,
  (c)=> (c ^ 8) & 0xff,
  (c)=> (c + 82) & 0xff,
  (c)=> (c ^ 163) & 0xff
]; }

function makeScheduleJ(): ScheduleFn[] { return [
  (c)=> (c + 223) & 0xff,
  (c)=> ((c << 4) | (c >> 4)) & 0xff,
  (c)=> (c + 223) & 0xff,
  (c)=> (c ^ 83) & 0xff,
  (c)=> (c - 19 + 256) & 0xff,
  (c)=> (c + 223) & 0xff,
  (c)=> (c - 170 + 256) & 0xff,
  (c)=> (c + 223) & 0xff,
  (c)=> (c - 170 + 256) & 0xff,
  (c)=> (c ^ 83) & 0xff
]; }

function makeScheduleE(): ScheduleFn[] { return [
  (c)=> (c + 82) & 0xff,
  (c)=> (c ^ 83) & 0xff,
  (c)=> (c ^ 163) & 0xff,
  (c)=> (c + 82) & 0xff,
  (c)=> (c - 170 + 256) & 0xff,
  (c)=> (c ^ 8) & 0xff,
  (c)=> (c ^ 241) & 0xff,
  (c)=> (c + 82) & 0xff,
  (c)=> (c + 176) & 0xff,
  (c)=> ((c << 4) | (c >> 4)) & 0xff
]; }

function generateNoCache(input: string): string {
  let bytes = Buffer.from(input, 'utf8');
  bytes = Buffer.from(rc4(atob(rc4Keys.l), bytes));
  bytes = Buffer.from(transform(bytes, atob(seeds32.A), atob(prefixKeys.O), 7, makeScheduleC()));
  bytes = Buffer.from(rc4(atob(rc4Keys.g), bytes));
  bytes = Buffer.from(transform(bytes, atob(seeds32.V), atob(prefixKeys.v), 10, makeScheduleY()));
  bytes = Buffer.from(rc4(atob(rc4Keys.B), bytes));
  bytes = Buffer.from(transform(bytes, atob(seeds32.N), atob(prefixKeys.L), 9, makeScheduleB()));
  bytes = Buffer.from(rc4(atob(rc4Keys.m), bytes));
  bytes = Buffer.from(transform(bytes, atob(seeds32.P), atob(prefixKeys.p), 7, makeScheduleJ()));
  bytes = Buffer.from(rc4(atob(rc4Keys.F), bytes));
  bytes = Buffer.from(transform(bytes, atob(seeds32.k), atob(prefixKeys.W), 5, makeScheduleE()));
  return btoa(Buffer.from(bytes));
}

let vrfCache = new LRUCache<string, string>({ max: 1024 });

export function GenerateVrf(input: string): string {
  const existing = vrfCache.get(input);
  if (existing) return existing;
  const v = generateNoCache(input);
  vrfCache.set(input, v);
  return v;
}

export function SetVrfCacheSize(size: number) {
  if (size <= 0) return;
  vrfCache = new LRUCache<string, string>({ max: size });
}
export function GetVrfCacheSize(): number { return vrfCache.max; }
