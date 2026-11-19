import { Redirect } from 'expo-router';

import { isTestErrorAllowed, TestReportError } from '../../monitoring';

// Opening getfreak://dev/test-error on an installed build throws on purpose, so the owner can check
// that an error report arrives. See docs/runbooks/error-monitoring.md. A development build, which
// never reports, is sent back to the first screen.
export default function TestErrorRoute() {
  if (isTestErrorAllowed()) throw new TestReportError();

  return <Redirect href="/" />;
}
