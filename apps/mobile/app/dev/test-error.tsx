import { Redirect } from 'expo-router';

import { isTestErrorAllowed, TestReportError } from '../../monitoring';

// Opening getfreak://dev/test-error on a preview or development build throws on purpose, so the
// owner can check that an error report arrives. See docs/runbooks/error-monitoring.md. A store
// build is sent back to the first screen.
export default function TestErrorRoute() {
  if (isTestErrorAllowed()) throw new TestReportError();

  return <Redirect href="/" />;
}
