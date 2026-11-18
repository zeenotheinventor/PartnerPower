// Metro turns an imported font file into an asset id that expo-font can load.
declare module '*.ttf' {
  const asset: number;
  export default asset;
}
