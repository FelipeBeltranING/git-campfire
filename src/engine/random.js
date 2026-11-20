// A seeded random generator that reproduces Python's `random.Random` (MT19937).
//
// The reference art was drawn by the Python prototype, so using the exact same
// sequence lets the port be checked byte for byte against `assets/`.

const N = 624;
const M = 397;

export class PyRandom {
  constructor(seed = 0) {
    this.mt = new Uint32Array(N);
    this.index = N;
    this.seed(seed);
  }

  // random.seed(int): the absolute value split into 32-bit words, little-endian.
  seed(n) {
    let v = BigInt(Math.abs(Math.trunc(n)));
    const key = [];
    do {
      key.push(Number(v & 0xffffffffn));
      v >>= 32n;
    } while (v > 0n);
    this.#initByArray(key);
  }

  #initGenrand(s) {
    const mt = this.mt;
    mt[0] = s >>> 0;
    for (let i = 1; i < N; i++) {
      const prev = mt[i - 1] ^ (mt[i - 1] >>> 30);
      mt[i] = (Math.imul(1812433253, prev) + i) >>> 0;
    }
    this.index = N;
  }

  #initByArray(key) {
    const mt = this.mt;
    this.#initGenrand(19650218);
    let i = 1;
    let j = 0;
    for (let k = Math.max(N, key.length); k > 0; k--) {
      const prev = mt[i - 1] ^ (mt[i - 1] >>> 30);
      mt[i] = ((mt[i] ^ Math.imul(prev, 1664525)) + key[j] + j) >>> 0;
      i++;
      j++;
      if (i >= N) {
        mt[0] = mt[N - 1];
        i = 1;
      }
      if (j >= key.length) j = 0;
    }
    for (let k = N - 1; k > 0; k--) {
      const prev = mt[i - 1] ^ (mt[i - 1] >>> 30);
      mt[i] = ((mt[i] ^ Math.imul(prev, 1566083941)) - i) >>> 0;
      i++;
      if (i >= N) {
        mt[0] = mt[N - 1];
        i = 1;
      }
    }
    mt[0] = 0x80000000;
  }

  #twist() {
    const mt = this.mt;
    for (let i = 0; i < N; i++) {
      const y = (mt[i] & 0x80000000) | (mt[(i + 1) % N] & 0x7fffffff);
      mt[i] = mt[(i + M) % N] ^ (y >>> 1) ^ (y & 1 ? 0x9908b0df : 0);
    }
    this.index = 0;
  }

  uint32() {
    if (this.index >= N) this.#twist();
    let y = this.mt[this.index++];
    y ^= y >>> 11;
    y ^= (y << 7) & 0x9d2c5680;
    y ^= (y << 15) & 0xefc60000;
    y ^= y >>> 18;
    return y >>> 0;
  }

  /** random(): a float in [0, 1) with 53 bits of precision. */
  random() {
    const a = this.uint32() >>> 5;
    const b = this.uint32() >>> 6;
    return (a * 67108864 + b) / 9007199254740992;
  }

  getrandbits(k) {
    if (k <= 0 || k > 32) throw new RangeError("getrandbits supports 1 to 32 bits");
    return this.uint32() >>> (32 - k);
  }

  randbelow(n) {
    const k = 32 - Math.clz32(n);
    let r = this.getrandbits(k);
    while (r >= n) r = this.getrandbits(k);
    return r;
  }

  /** randrange(start, stop) or randrange(stop), step 1. */
  randrange(start, stop) {
    if (stop === undefined) return this.randbelow(start);
    const width = stop - start;
    if (width <= 0) throw new RangeError(`empty range in randrange(${start}, ${stop})`);
    return start + this.randbelow(width);
  }

  /** randint(a, b): an int in [a, b], both included. */
  randint(a, b) {
    return this.randrange(a, b + 1);
  }

  choice(seq) {
    if (!seq.length) throw new RangeError("Cannot choose from an empty sequence");
    return seq[this.randbelow(seq.length)];
  }
}
