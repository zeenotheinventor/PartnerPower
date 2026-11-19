// Makes the button sounds. They are synthesised here from sine waves, so they are original and
// owned by the project. There are no dependencies and nothing random, so a run always writes the
// same bytes.
//
//   node scripts/generateSounds.mjs               writes variant A to assets/sounds, and
//                                                 variants B and C to assets/sounds/alternatives
//   node scripts/generateSounds.mjs --variant b   writes variant B to assets/sounds, to swap it in
//   node scripts/generateSounds.mjs --out <dir>   writes to another folder, for trying a sound
//
// The files are 16-bit mono at 44.1 kHz, and every peak is kept low so a press is never loud.

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const sampleRate = 44100;
const peakLevel = 0.35;
const edgeSeconds = 0.003;

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const soundsDirectory = path.resolve(scriptDirectory, '../assets/sounds');

const secondsToSamples = (seconds) => Math.round(seconds * sampleRate);

// A note that fades out smoothly, with a few overtones for a bell like tone.
function addNote(samples, { start, frequency, length, decay, overtones = [1] }) {
  const first = secondsToSamples(start);
  const count = Math.min(secondsToSamples(length), samples.length - first);
  for (let index = 0; index < count; index += 1) {
    const time = index / sampleRate;
    const envelope = Math.exp(-time / decay);
    let value = 0;
    overtones.forEach((level, overtoneIndex) => {
      value += level * Math.sin(2 * Math.PI * frequency * (overtoneIndex + 1) * time);
    });
    samples[first + index] += value * envelope;
  }
}

// A blip whose pitch glides from one frequency to another while it fades out.
function addGlide(samples, { start, from, to, length, decay }) {
  const first = secondsToSamples(start);
  const count = Math.min(secondsToSamples(length), samples.length - first);
  let phase = 0;
  for (let index = 0; index < count; index += 1) {
    const time = index / sampleRate;
    const frequency = from + (to - from) * (time / length);
    phase += (2 * Math.PI * frequency) / sampleRate;
    samples[first + index] += Math.sin(phase) * Math.exp(-time / decay);
  }
}

function silence(seconds) {
  return new Float64Array(secondsToSamples(seconds));
}

// Fades both ends so the sound never starts or stops with a click, then sets the peak level.
function finish(samples) {
  const edge = secondsToSamples(edgeSeconds);
  let peak = 0;
  samples.forEach((value, index) => {
    const fromEnd = samples.length - 1 - index;
    const gain = Math.min(1, index / edge, fromEnd / edge);
    samples[index] = value * gain;
    peak = Math.max(peak, Math.abs(samples[index]));
  });
  return samples.map((value) => (value / peak) * peakLevel);
}

const variants = {
  // Soft and round.
  a: {
    tap: () => {
      const samples = silence(0.04);
      addNote(samples, {
        start: 0,
        frequency: 1500,
        length: 0.04,
        decay: 0.006,
        overtones: [1, 0.3],
      });
      return samples;
    },
    done: () => {
      const samples = silence(0.25);
      addNote(samples, {
        start: 0,
        frequency: 784,
        length: 0.2,
        decay: 0.07,
        overtones: [1, 0.4, 0.15],
      });
      addNote(samples, {
        start: 0.08,
        frequency: 1175,
        length: 0.17,
        decay: 0.07,
        overtones: [1, 0.4, 0.15],
      });
      return samples;
    },
    pass: () => {
      const samples = silence(0.3);
      addGlide(samples, { start: 0, from: 520, to: 400, length: 0.14, decay: 0.07 });
      addGlide(samples, { start: 0.13, from: 400, to: 230, length: 0.17, decay: 0.09 });
      return samples;
    },
  },
  // Woody and warm.
  b: {
    tap: () => {
      const samples = silence(0.04);
      addNote(samples, {
        start: 0,
        frequency: 900,
        length: 0.04,
        decay: 0.008,
        overtones: [1, 0.5],
      });
      return samples;
    },
    done: () => {
      const samples = silence(0.25);
      addNote(samples, { start: 0, frequency: 659, length: 0.2, decay: 0.08, overtones: [1, 0.2] });
      addNote(samples, {
        start: 0.09,
        frequency: 988,
        length: 0.16,
        decay: 0.08,
        overtones: [1, 0.2],
      });
      return samples;
    },
    pass: () => {
      const samples = silence(0.3);
      addGlide(samples, { start: 0, from: 440, to: 220, length: 0.3, decay: 0.14 });
      return samples;
    },
  },
  // Bright and glassy.
  c: {
    tap: () => {
      const samples = silence(0.04);
      addNote(samples, {
        start: 0,
        frequency: 2400,
        length: 0.04,
        decay: 0.005,
        overtones: [1, 0.2],
      });
      return samples;
    },
    done: () => {
      const samples = silence(0.25);
      addNote(samples, {
        start: 0,
        frequency: 1047,
        length: 0.2,
        decay: 0.06,
        overtones: [1, 0.5, 0.3],
      });
      addNote(samples, {
        start: 0.07,
        frequency: 1568,
        length: 0.18,
        decay: 0.06,
        overtones: [1, 0.5, 0.3],
      });
      return samples;
    },
    pass: () => {
      const samples = silence(0.3);
      addGlide(samples, { start: 0, from: 600, to: 480, length: 0.1, decay: 0.05 });
      addGlide(samples, { start: 0.1, from: 480, to: 360, length: 0.1, decay: 0.05 });
      addGlide(samples, { start: 0.2, from: 360, to: 200, length: 0.1, decay: 0.05 });
      return samples;
    },
  },
};

// A canonical WAV file: a 44 byte header, then 16-bit little-endian samples.
function encodeWav(samples) {
  const dataLength = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataLength);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataLength, 40);
  samples.forEach((value, index) => {
    buffer.writeInt16LE(Math.round(value * 32767), 44 + index * 2);
  });
  return buffer;
}

function writeVariant(variantName, directory) {
  mkdirSync(directory, { recursive: true });
  Object.entries(variants[variantName]).forEach(([soundName, makeSound]) => {
    writeFileSync(path.join(directory, `${soundName}.wav`), encodeWav(finish(makeSound())));
  });
}

function readFlag(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

const variantName = readFlag('variant');
const outputDirectory = readFlag('out');

if (variantName !== undefined) {
  if (!(variantName in variants)) {
    console.error(
      `Unknown variant "${variantName}". Use one of: ${Object.keys(variants).join(', ')}.`,
    );
    process.exit(1);
  }
  writeVariant(variantName, path.resolve(outputDirectory ?? soundsDirectory));
} else if (outputDirectory !== undefined) {
  writeVariant('a', path.resolve(outputDirectory));
} else {
  writeVariant('a', soundsDirectory);
  writeVariant('b', path.join(soundsDirectory, 'alternatives', 'b'));
  writeVariant('c', path.join(soundsDirectory, 'alternatives', 'c'));
}
