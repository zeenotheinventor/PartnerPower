import { Component } from 'react';

import { CrashScreen } from './CrashScreen';
import type { CrashBoundaryProps } from './types';

type CrashBoundaryState = { hasCrashed: boolean };

/**
 * Catches an error thrown while something below it renders. It reports the error and shows the
 * crash screen in place of a blank one. Starting again mounts everything below afresh, unless
 * `onRestart` says to do something else, such as leaving the failed screen.
 */
export class CrashBoundary extends Component<CrashBoundaryProps, CrashBoundaryState> {
  override state: CrashBoundaryState = { hasCrashed: false };

  static getDerivedStateFromError(): CrashBoundaryState {
    return { hasCrashed: true };
  }

  override componentDidCatch(error: unknown) {
    this.props.onError(error);
  }

  restart = () => {
    if (this.props.onRestart !== undefined) {
      this.props.onRestart();
      return;
    }
    this.setState({ hasCrashed: false });
  };

  override render() {
    if (this.state.hasCrashed) return <CrashScreen onRestart={this.restart} />;
    return this.props.children;
  }
}
