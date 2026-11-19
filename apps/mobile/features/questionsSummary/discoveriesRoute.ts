import { discoveriesRoute as discoveriesScreenRoute } from '../discoveries/routes';

/**
 * Where the discoveries card opens. Null would show the count without a link, for a build that has
 * no Discoveries screen.
 */
export const discoveriesRoute: string | null = discoveriesScreenRoute;
