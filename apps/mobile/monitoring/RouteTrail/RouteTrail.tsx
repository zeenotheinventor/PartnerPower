import { useSegments } from 'expo-router';
import { useEffect } from 'react';

import { recordRoute } from '../recordRoute';

/** Records each screen the player moves to, for the trail in an error report. Renders nothing. */
export function RouteTrail() {
  const segments = useSegments();
  const route = segments.join('/');

  useEffect(() => {
    recordRoute(route === '' ? [] : route.split('/'));
  }, [route]);

  return null;
}
