import { readFileSync } from 'node:fs';
import path from 'node:path';

const soundsDirectory = path.resolve(__dirname, '../assets/sounds');

// The length limits come from the sounds this app asks for: a click, a chime and a blip.
const expectedSounds = [
  { name: 'tap', minimumSeconds: 0.03, maximumSeconds: 0.06 },
  { name: 'done', minimumSeconds: 0.2, maximumSeconds: 0.3 },
  { name: 'pass', minimumSeconds: 0.25, maximumSeconds: 0.35 },
] as const;

const variantFolders = ['', 'alternatives/b', 'alternatives/c'];

function readWav(relativePath: string) {
  const bytes = readFileSync(path.join(soundsDirectory, relativePath));
  const sampleCount = (bytes.length - 44) / 2;
  let peak = 0;
  for (let index = 0; index < sampleCount; index += 1) {
    peak = Math.max(peak, Math.abs(bytes.readInt16LE(44 + index * 2)) / 32768);
  }
  return {
    riff: bytes.toString('ascii', 0, 4),
    wave: bytes.toString('ascii', 8, 12),
    channels: bytes.readUInt16LE(22),
    sampleRate: bytes.readUInt32LE(24),
    bitsPerSample: bytes.readUInt16LE(34),
    dataBytes: bytes.readUInt32LE(40),
    byteLength: bytes.length,
    seconds: sampleCount / bytes.readUInt32LE(24),
    peak,
  };
}

describe.each(variantFolders)('the sound files in "%s"', (folder) => {
  it.each(expectedSounds)(
    'should hold a short, quiet, mono 16-bit $name sound',
    ({ name, minimumSeconds, maximumSeconds }) => {
      const wav = readWav(path.join(folder, `${name}.wav`));

      expect([wav.riff, wav.wave]).toEqual(['RIFF', 'WAVE']);
      expect(wav.channels).toBe(1);
      expect(wav.bitsPerSample).toBe(16);
      expect(wav.dataBytes).toBe(wav.byteLength - 44);
      expect(wav.seconds).toBeGreaterThanOrEqual(minimumSeconds);
      expect(wav.seconds).toBeLessThanOrEqual(maximumSeconds);
      expect(wav.peak).toBeGreaterThan(0.1);
      expect(wav.peak).toBeLessThanOrEqual(0.5);
    },
  );
});

describe('the sounds README', () => {
  it('should say the sounds are original and who owns them', () => {
    const readme = readFileSync(path.join(soundsDirectory, 'README.md'), 'utf8');

    expect(readme).toMatch(/original/i);
    expect(readme).toMatch(/generateSounds\.mjs/);
    expect(readme).toMatch(/project owns/i);
  });
});
