import { splashMotion } from '../motion';
import { SplashDrop } from '../SplashDrop';
import { SplashRing } from '../SplashRing';

/** The Pass effect: a muted ring and six drops that jump and fall back. It never uses a colour. */
export function Splash() {
  return (
    <>
      <SplashRing />
      {splashMotion.drops.map((drop, index) => (
        <SplashDrop key={index} drop={drop} />
      ))}
    </>
  );
}
