import { categoryNames, copy, fillCopy } from '@getfreak/content';
import { categoryIds } from '@getfreak/core';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { Button, Card, Chip, Header, Screen } from '../../../components/ui';
import { usePersonalData } from '../../../personal';
import { LostDaresNotice } from '../LostDaresNotice';
import { useOwnCards } from '../OwnCardsProvider';
import { dareRoute, newDareRoute, setupRoute } from '../routes';

// The list of the player's own dares, opened from the round setup. Nothing here logs, because a
// dare is personal text.
export function MyDaresScreen() {
  const router = useRouter();
  const { cards, isLoading, hasReachedLimit } = useOwnCards();
  const { recoveredFromUnreadable, dismissRecoveryNotice } = usePersonalData();

  // The store reports a lost key once. The notice is kept for this visit, then the store is told it
  // has been shown, so it is not shown again.
  const [hasNotice, setHasNotice] = useState(false);
  if (recoveredFromUnreadable && !hasNotice) setHasNotice(true);
  useEffect(() => {
    if (recoveredFromUnreadable) dismissRecoveryNotice();
  }, [recoveredFromUnreadable, dismissRecoveryNotice]);

  // A deep link can open this screen with nothing behind it, so it falls back to setup.
  const goBack = () => (router.canGoBack() ? router.back() : router.replace(setupRoute));

  const subtitle = isLoading
    ? undefined
    : cards.length === 0
      ? copy.roundSetup.myDaresNone
      : fillCopy(copy.roundSetup.myDaresCount, { count: cards.length });

  const groups = categoryIds
    .map((categoryId) => ({
      categoryId,
      cards: cards.filter((card) => card.category === categoryId),
    }))
    .filter((group) => group.cards.length > 0);

  const addButton = (
    <Button
      label={copy.ownCards.add}
      fullWidth
      disabled={hasReachedLimit}
      onPress={() => router.push(newDareRoute)}
    />
  );

  return (
    <Screen scroll>
      <Header
        title={copy.ownCards.listTitle}
        subtitle={subtitle}
        backLabel={copy.ownCards.backLabel}
        onBack={goBack}
      />

      {hasNotice ? <LostDaresNotice message={copy.ownCards.notice} /> : null}

      {isLoading ? null : cards.length === 0 ? (
        <>
          <View className="flex-1" />
          <Text className="type-heading text-center text-foreground">
            {copy.ownCards.emptyList}
          </Text>
          {addButton}
          <View className="flex-1" />
        </>
      ) : (
        <>
          <View className="gap-8">
            {addButton}
            {hasReachedLimit ? (
              <Text className="type-label text-center text-muted">{copy.ownCards.limit}</Text>
            ) : null}
          </View>
          {groups.map((group) => (
            <View key={group.categoryId} className="gap-12">
              <View
                accessible
                accessibilityRole="header"
                accessibilityLabel={categoryNames[group.categoryId]}
                className="flex-row items-center gap-8"
              >
                <Chip label={categoryNames[group.categoryId]} category={group.categoryId} />
                <Text className="type-label text-muted">{group.cards.length}</Text>
              </View>
              {group.cards.map((card) => (
                <Card
                  key={card.id}
                  category={card.category}
                  label={
                    card.kind === 'together'
                      ? fillCopy(copy.ownCards.togetherCardLabel, { text: card.text })
                      : card.text
                  }
                  onPress={() => router.push(dareRoute(card.id))}
                >
                  <View className="gap-8">
                    {card.kind === 'together' ? (
                      <Chip label={copy.ownCards.kindTogether} accent />
                    ) : null}
                    <Text className="type-body-bold text-foreground">{card.text}</Text>
                  </View>
                </Card>
              ))}
            </View>
          ))}
        </>
      )}
    </Screen>
  );
}
