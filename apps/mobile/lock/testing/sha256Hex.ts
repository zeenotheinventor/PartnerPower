const roundConstants = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

const rotateRight = (value: number, bits: number) => (value >>> bits) | (value << (32 - bits));

/**
 * SHA-256 of ASCII text as 64 lowercase hex characters. It exists so screen tests can run the real
 * lock service without a native module, and so that a test file needs no Node types. The lock only
 * hashes a hex salt, a colon and digits.
 */
export function sha256Hex(text: string): string {
  const bytes = Array.from(text, (character) => {
    const code = character.charCodeAt(0);
    if (code > 127) throw new Error('sha256Hex takes ASCII text only.');
    return code;
  });
  const bitLength = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  // The length in bits, as a 64 bit big endian number. Text this short fits in the low 32 bits.
  bytes.push(0, 0, 0, 0, bitLength >>> 24, (bitLength >>> 16) & 0xff, (bitLength >>> 8) & 0xff);
  bytes.push(bitLength & 0xff);

  const state = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];

  for (let blockStart = 0; blockStart < bytes.length; blockStart += 64) {
    const schedule: number[] = [];
    for (let index = 0; index < 16; index += 1) {
      const at = blockStart + index * 4;
      schedule.push(
        ((bytes[at] ?? 0) << 24) |
          ((bytes[at + 1] ?? 0) << 16) |
          ((bytes[at + 2] ?? 0) << 8) |
          (bytes[at + 3] ?? 0),
      );
    }
    for (let index = 16; index < 64; index += 1) {
      const older = schedule[index - 15] ?? 0;
      const oldest = schedule[index - 2] ?? 0;
      const small0 = rotateRight(older, 7) ^ rotateRight(older, 18) ^ (older >>> 3);
      const small1 = rotateRight(oldest, 17) ^ rotateRight(oldest, 19) ^ (oldest >>> 10);
      schedule.push(
        ((schedule[index - 16] ?? 0) + small0 + (schedule[index - 7] ?? 0) + small1) | 0,
      );
    }

    let a = state[0] ?? 0;
    let b = state[1] ?? 0;
    let c = state[2] ?? 0;
    let d = state[3] ?? 0;
    let e = state[4] ?? 0;
    let f = state[5] ?? 0;
    let g = state[6] ?? 0;
    let h = state[7] ?? 0;
    for (let index = 0; index < 64; index += 1) {
      const big1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choose = (e & f) ^ (~e & g);
      const first = (h + big1 + choose + (roundConstants[index] ?? 0) + (schedule[index] ?? 0)) | 0;
      const big0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const second = (big0 + majority) | 0;
      h = g;
      g = f;
      f = e;
      e = (d + first) | 0;
      d = c;
      c = b;
      b = a;
      a = (first + second) | 0;
    }
    [a, b, c, d, e, f, g, h].forEach((value, index) => {
      state[index] = ((state[index] ?? 0) + value) | 0;
    });
  }

  return state.map((word) => (word >>> 0).toString(16).padStart(8, '0')).join('');
}
