import { copy, fillCopy, questionDecks, topicNames } from '@getfreak/content';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { TopicId } from '@getfreak/core';
import { AccessibilityInfo, Text, View } from 'react-native';

import { Button, Card, Character, Header, Screen, Toggle } from '../../../components/ui';
import { useCustomQuestions, useDiscoveries } from '../../../personal';
import type { DiscoveryKey } from '../../../storage';
import { LineBox } from '../../questionsPlay/LineBox';
import { ClearDiscoveriesDialog, type ClearDiscoveriesVariant } from '../ClearDiscoveriesDialog';
import { DiscoveryEntryCard } from '../DiscoveryEntryCard';
import { buildDiscoveryGroups } from '../discoveryRows';
import { questionsHomeRoute, roundSetupRoute, secretMatchRoute } from '../routes';

function GroupLabel({ children }: { children: string }) {
  return <Text className="type-caption uppercase text-muted">{children}</Text>;
}

/**
 * What the couple has learned about each other in Drink If, kept on the phone: matches, things they
 * would both rather, and what each partner answered, newest first. Each entry can be removed, all
 * can be cleared, and the switch decides whether new ones are kept. The section for dares for you
 * two goes between the switch and the groups. Nothing here logs, because every line is personal.
 */
export function DiscoveriesScreen() {
  const router = useRouter();
  const {
    isLoading: areDiscoveriesLoading,
    discoveries,
    saveDiscoveries,
    setSaveDiscoveries,
    removeDiscovery,
    clearDiscoveries,
  } = useDiscoveries();
  const { questions: playerQuestions, isLoading: arePlayerQuestionsLoading } = useCustomQuestions();
  // Discoveries about a question the player wrote are dropped until those questions are read, so
  // nothing shows, and nothing is decided, before both lists are.
  const isLoading = areDiscoveriesLoading || arePlayerQuestionsLoading;
  const [openDialog, setOpenDialog] = useState<ClearDiscoveriesVariant | undefined>(undefined);

  const shippedQuestions = useMemo(() => questionDecks.flatMap((deck) => deck.questions), []);
  const groups = useMemo(
    () => buildDiscoveryGroups(discoveries, [...shippedQuestions, ...playerQuestions]),
    [discoveries, shippedQuestions, playerQuestions],
  );

  // A deep link can open this screen with nothing behind it, so it falls back to the home.
  const goBack = () => (router.canGoBack() ? router.back() : router.replace(questionsHomeRoute));

  // The control that was pressed goes away, so the result is announced. A failed removal leaves the
  // entry where it is.
  const removeEntry = useCallback(
    (kind: DiscoveryKey['kind'], questionId: string, answererName?: string) => {
      const key: DiscoveryKey =
        answererName === undefined ? { kind, questionId } : { kind, questionId, answererName };
      removeDiscovery(key).then(
        () => AccessibilityInfo.announceForAccessibility(copy.discoveries.removeDone),
        () => AccessibilityInfo.announceForAccessibility(copy.discoveries.removeFailed),
      );
    },
    [removeDiscovery],
  );

  // A live region is not read when it first appears, so the notice is also announced.
  const isSavingOffNoticeShown = !isLoading && !saveDiscoveries;
  useEffect(() => {
    if (isSavingOffNoticeShown) {
      AccessibilityInfo.announceForAccessibility(copy.discoveries.savingOffNotice);
    }
  }, [isSavingOffNoticeShown]);

  // The switch flips first. When something is saved, a question follows, to clear it or keep it.
  const changeSaving = (isSaving: boolean) => {
    void setSaveDiscoveries(isSaving);
    if (!isSaving && groups.count > 0) setOpenDialog('savingOff');
  };

  const removeLabelFor = (text: string) => fillCopy(copy.discoveries.removeLabel, { text });
  const topicNameOf = (topic: TopicId) => topicNames[topic];

  return (
    <Screen scroll>
      <Header
        title={copy.discoveries.title}
        subtitle={copy.discoveries.subtitle}
        backLabel={copy.discoveries.backLabel}
        onBack={goBack}
      />

      {isLoading ? null : (
        <>
          <Card grouped={false}>
            <Toggle
              label={copy.discoveries.saveToggle}
              description={copy.discoveries.saveToggleCaption}
              value={saveDiscoveries}
              onValueChange={changeSaving}
            />
          </Card>

          {saveDiscoveries ? null : (
            <View accessibilityLiveRegion="polite">
              <LineBox>{copy.discoveries.savingOffNotice}</LineBox>
            </View>
          )}

          {/* The section for dares for you two goes here. */}

          {groups.count === 0 ? (
            <>
              <View className="items-center gap-16 py-16">
                <Character character="shy" mood="idle" size="hero" />
                <LineBox>{copy.discoveries.emptyTheo}</LineBox>
                <Text
                  accessibilityRole="header"
                  className="type-heading text-center text-foreground"
                >
                  {copy.discoveries.emptyTitle}
                </Text>
                <Text className="type-body text-center text-muted">
                  {copy.discoveries.emptyBody}
                </Text>
              </View>
              <View className="gap-12">
                <Button
                  label={copy.discoveries.emptyPlay}
                  fullWidth
                  onPress={() => router.push(roundSetupRoute)}
                />
                <Button
                  label={copy.discoveries.emptyMatch}
                  variant="secondary"
                  fullWidth
                  onPress={() => router.push(secretMatchRoute)}
                />
              </View>
            </>
          ) : (
            <>
              {groups.matches.length > 0 ? (
                <View className="gap-8">
                  <GroupLabel>{copy.discoveries.matchesLabel}</GroupLabel>
                  {groups.matches.map((row) => (
                    <DiscoveryEntryCard
                      key={row.key.questionId}
                      kind={row.key.kind}
                      questionId={row.key.questionId}
                      answererName={row.key.answererName}
                      topicName={topicNameOf(row.topic)}
                      text={row.text}
                      strengthLabel={
                        row.strength === 'yes'
                          ? copy.secretMatch.strengthYes
                          : copy.secretMatch.strengthMaybe
                      }
                      isStrongMatch={row.strength === 'yes'}
                      removeText={copy.discoveries.remove}
                      removeLabel={removeLabelFor(row.text)}
                      onRemove={removeEntry}
                    />
                  ))}
                </View>
              ) : null}

              {groups.agreements.length > 0 ? (
                <View className="gap-8">
                  <GroupLabel>{copy.discoveries.agreeLabel}</GroupLabel>
                  {groups.agreements.map((row) => {
                    const answerLine = fillCopy(copy.discoveries.agreeAnswer, {
                      option: row.optionText,
                    });
                    return (
                      <DiscoveryEntryCard
                        key={row.key.questionId}
                        kind={row.key.kind}
                        questionId={row.key.questionId}
                        answererName={row.key.answererName}
                        topicName={topicNameOf(row.topic)}
                        lead={copy.questionLeads.eitherOr}
                        text={row.text}
                        answerLine={answerLine}
                        removeText={copy.discoveries.remove}
                        removeLabel={removeLabelFor(
                          [copy.questionLeads.eitherOr, row.text, answerLine]
                            .filter(Boolean)
                            .join(', '),
                        )}
                        onRemove={removeEntry}
                      />
                    );
                  })}
                </View>
              ) : null}

              {groups.aboutPartners.map((partner) => (
                <View key={partner.name} className="gap-8">
                  <GroupLabel>
                    {fillCopy(copy.discoveries.aboutLabel, { name: partner.name })}
                  </GroupLabel>
                  {partner.rows.map((row) => {
                    const answerLine = fillCopy(copy.discoveries.aboutAnswer, {
                      name: partner.name,
                      option: row.optionText,
                    });
                    return (
                      <DiscoveryEntryCard
                        key={row.key.questionId}
                        kind={row.key.kind}
                        questionId={row.key.questionId}
                        answererName={row.key.answererName}
                        topicName={topicNameOf(row.topic)}
                        text={row.text}
                        answerLine={answerLine}
                        removeText={copy.discoveries.remove}
                        removeLabel={removeLabelFor(`${row.text}, ${answerLine}`)}
                        onRemove={removeEntry}
                      />
                    );
                  })}
                </View>
              ))}

              <Button
                label={copy.discoveries.clearAll}
                variant="secondary"
                fullWidth
                onPress={() => setOpenDialog('clearAll')}
              />
            </>
          )}
        </>
      )}

      {openDialog ? (
        <ClearDiscoveriesDialog
          variant={openDialog}
          clearDiscoveries={clearDiscoveries}
          onCleared={() => setOpenDialog(undefined)}
          onCancel={() => setOpenDialog(undefined)}
        />
      ) : null}
    </Screen>
  );
}
