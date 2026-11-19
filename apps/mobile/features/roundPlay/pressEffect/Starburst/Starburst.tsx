import { categoryFillClasses } from '../../categoryClasses';
import { BurstCore } from '../BurstCore';
import { BurstParticle } from '../BurstParticle';
import { burstMotion } from '../motion';
import type { StarburstProps } from './types';

/** The Done effect: a star and twelve particles fanning up from the origin, in the card's colour. */
export function Starburst({ category }: StarburstProps) {
  const fillClass = categoryFillClasses[category];
  return (
    <>
      <BurstCore fillClass={fillClass} />
      {burstMotion.particles.map((particle, index) => (
        <BurstParticle key={index} particle={particle} fillClass={fillClass} />
      ))}
    </>
  );
}
