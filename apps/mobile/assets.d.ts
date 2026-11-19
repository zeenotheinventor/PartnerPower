// Metro turns an imported sound file into the number the audio player takes as a source.
declare module '*.wav' {
  const source: number;
  export default source;
}
