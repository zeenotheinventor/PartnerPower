import { copy } from './copy';

describe('copy', () => {
  it('should name the app', () => {
    expect(copy.appName).toBe('PartnerPower');
  });

  it('should give the placeholder screen a status line', () => {
    expect(copy.placeholder.status).toBe('Coming soon');
  });
});
