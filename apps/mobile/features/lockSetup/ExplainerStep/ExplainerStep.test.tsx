import { copy } from '@getfreak/content';
import { fireEvent, screen } from 'nativewind/test';
import { Platform } from 'react-native';

import { renderThemed } from '../../../tailwind/renderThemed';
import { ExplainerStep } from './ExplainerStep';

function setPlatform(os: typeof Platform.OS) {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
}

describe('ExplainerStep', () => {
  afterEach(() => setPlatform('ios'));

  it('should be titled App lock, with the heading and every point', async () => {
    await renderThemed(<ExplainerStep onCancel={jest.fn()} onStart={jest.fn()} />);

    expect(screen.getByRole('header', { name: copy.lockSetup.title })).toBeOnTheScreen();
    expect(screen.getByText(copy.lockSetup.explainerHeading)).toBeOnTheScreen();
    copy.lockSetup.points.forEach((point) => expect(screen.getByText(point)).toBeOnTheScreen());
  });

  it('should not mention screenshots on iOS', async () => {
    setPlatform('ios');
    await renderThemed(<ExplainerStep onCancel={jest.fn()} onStart={jest.fn()} />);

    expect(screen.queryByText(copy.lockSetup.pointAndroid)).toBeNull();
  });

  it('should say on Android that screenshots are blocked', async () => {
    setPlatform('android');
    await renderThemed(<ExplainerStep onCancel={jest.fn()} onStart={jest.fn()} />);

    expect(screen.getByText(copy.lockSetup.pointAndroid)).toBeOnTheScreen();
  });

  it('should start with the Set a PIN button', async () => {
    const onStart = jest.fn();
    await renderThemed(<ExplainerStep onCancel={jest.fn()} onStart={onStart} />);

    fireEvent.press(screen.getByRole('button', { name: copy.lockSetup.start }));

    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('should cancel with the back button', async () => {
    const onCancel = jest.fn();
    await renderThemed(<ExplainerStep onCancel={onCancel} onStart={jest.fn()} />);

    fireEvent.press(screen.getByRole('button', { name: copy.lockSetup.backLabel }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
