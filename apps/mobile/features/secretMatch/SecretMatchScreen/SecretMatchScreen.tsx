import { copy } from '@getfreak/content';
import type { NewDiscovery } from '@getfreak/core';
import { useRouter } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useCallback, useEffect, useState } from 'react';

import { Dialog } from '../../../components/ui';
import { homeEntries } from '../../questionsHome/homeEntries';
import { PrivacyCover } from '../PrivacyCover';
import { SecretMatchAnsweringView } from '../SecretMatchAnsweringView';
import { SecretMatchHandoffView } from '../SecretMatchHandoffView';
import { SecretMatchIntroView } from '../SecretMatchIntroView';
import { SecretMatchRevealView, type SecretMatchRevealViewProps } from '../SecretMatchRevealView';
import { useSecretMatch } from '../SecretMatchProvider';
import { useIsAppHidden } from '../useIsAppHidden';
import { useSaveMatches } from '../useSaveMatches';

const homeRoute = '/games/questions';

// The dares link goes to Discoveries once the Drink If home has switched that entry on. Until then
// the link is hidden.
function findDiscoveriesRoute() {
  return (
    homeEntries.find((entry) => entry.title === copy.questionsHome.discoveriesTitle)?.route ?? null
  );
}

/**
 * The secret match screen for one session. It shows the intro, then each partner's private pass,
 * the handoff and the reveal, as state of this screen and not as routes, and it reads only the
 * engine's view of the session. While a pass is under way, the system back button and the iOS
 * swipe ask whether to stop, and leaving the app covers the item. Nothing here logs, and no name
 * or item leaves the screen.
 */
export function SecretMatchScreen() {
  const router = useRouter();
  const { view, players, matchesToSave, dispatch } = useSecretMatch();
  const isAppHidden = useIsAppHidden();
  const [isStopDialogOpen, setIsStopDialogOpen] = useState(false);

  const isUnderway = view?.phase === 'rating' || view?.phase === 'handoff';
  // This is the hook the native stack reads, so the iOS swipe is stopped too. Once the session is
  // stopped or revealed, going back is allowed and leaves the route, which discards the session.
  usePreventRemove(isUnderway, () => setIsStopDialogOpen(true));

  // A deep link can open this screen with nothing behind it, so it falls back to the home.
  const goHome = useCallback(
    () => (router.canGoBack() ? router.back() : router.replace(homeRoute)),
    [router],
  );

  const isStopped = view?.phase === 'stopped';
  useEffect(() => {
    if (isStopped) goHome();
  }, [isStopped, goHome]);

  const stop = () => {
    setIsStopDialogOpen(false);
    dispatch({ type: 'stop' });
  };

  let content = null;
  if (!view) {
    content = <SecretMatchIntroView onBack={goHome} />;
  } else if (view.phase === 'rating' && players) {
    content = isAppHidden ? (
      <PrivacyCover />
    ) : (
      <SecretMatchAnsweringView
        view={view}
        lookAwayName={players[view.pass === 0 ? 1 : 0]}
        onRate={(rating) => dispatch({ type: 'rate', rating })}
        onBack={() => dispatch({ type: 'back' })}
        onStop={() => setIsStopDialogOpen(true)}
      />
    );
  } else if (view.phase === 'handoff') {
    content = (
      <SecretMatchHandoffView
        finishedPlayerName={view.finishedPlayerName}
        nextPlayerName={view.nextPlayerName}
        onContinue={() => dispatch({ type: 'startSecondPass' })}
      />
    );
  } else if (view.phase === 'revealed') {
    const discoveriesRoute = findDiscoveriesRoute();
    content = (
      <RevealStage
        matches={view.matches}
        total={view.total}
        matchesToSave={matchesToSave}
        onOpenDares={discoveriesRoute === null ? undefined : () => router.push(discoveriesRoute)}
        onDone={goHome}
      />
    );
  }

  return (
    <>
      {content}
      <Dialog
        visible={isStopDialogOpen && isUnderway}
        title={copy.secretMatch.stopTitle}
        body={copy.secretMatch.stopBody}
        confirmLabel={copy.secretMatch.stopConfirm}
        cancelLabel={copy.secretMatch.stopCancel}
        onConfirm={stop}
        onCancel={() => setIsStopDialogOpen(false)}
      />
    </>
  );
}

type RevealStageProps = Omit<SecretMatchRevealViewProps, 'savedLine'> & {
  matchesToSave: readonly NewDiscovery[];
};

// The reveal saves the matches when it first shows, so the saving belongs to this stage and not to
// the whole screen.
function RevealStage({ matches, total, matchesToSave, onOpenDares, onDone }: RevealStageProps) {
  const savedLine = useSaveMatches(matchesToSave);
  return (
    <SecretMatchRevealView
      matches={matches}
      total={total}
      savedLine={savedLine}
      onOpenDares={onOpenDares}
      onDone={onDone}
    />
  );
}
