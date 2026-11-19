import { colorThemes } from '@getfreak/tokens';
import { screen } from 'nativewind/test';

import { renderThemed } from '../../../tailwind/renderThemed';
import { BulletList } from './BulletList';

describe('BulletList', () => {
  it('should show the label', async () => {
    await renderThemed(<BulletList label="What goes" items={['One', 'Two']} />);

    expect(screen.getByText('What goes')).toBeOnTheScreen();
  });

  it('should show each item', async () => {
    await renderThemed(<BulletList label="What goes" items={['One', 'Two', 'Three']} />);

    expect(screen.getByText('One')).toBeOnTheScreen();
    expect(screen.getByText('Two')).toBeOnTheScreen();
    expect(screen.getByText('Three')).toBeOnTheScreen();
  });

  it('should set the label in the muted colour and the items in the foreground colour', async () => {
    await renderThemed(<BulletList label="What goes" items={['One']} />);

    expect(screen.getByText('What goes')).toHaveStyle({
      color: colorThemes.light.muted.toLowerCase(),
    });
    expect(screen.getByText('One')).toHaveStyle({
      color: colorThemes.light.foreground.toLowerCase(),
    });
  });
});
