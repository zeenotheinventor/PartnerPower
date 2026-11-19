import { categoryNames, copy, fillCopy } from '@getfreak/content';
import { categoryIds, limits } from '@getfreak/core';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, FlatList, Text, View } from 'react-native';

import { Button, Card, Chip, Dialog, Header, Screen, TextField } from '../../../components/ui';
import { usePersonalData } from '../../../personal';
import { useOwnCards } from '../../ownCards/OwnCardsProvider';
import { customDeckChoice } from '../customDeckChoice';
import { useDeckChoice } from '../DeckChoiceProvider';
import {
  countSelectedByCategory,
  deckEditorRows,
  pickableCards,
  type DeckEditorRow,
} from '../deckEditorCards';
import { deckCountText } from '../deckCountText';
import { getStarterDeck } from '../getStarterDeck';
import { deckPickerRoute } from '../routes';
import { useFavouriteIds } from '../useFavouriteIds';
import type { DeckEditorFormProps } from './types';

const sectionTitles = {
  mine: copy.decks.sectionMine,
  favourites: copy.decks.sectionFavourites,
};

// The cards that can go in a deck are the player's dares and their favourites. The list is virtual,
// because a player can have hundreds of dares. Nothing here logs, because deck names, dares and
// favourites are personal.
export function DeckEditorForm({ deck }: DeckEditorFormProps) {
  const router = useRouter();
  const { repository } = usePersonalData();
  const { cards: ownCards, isLoading: isOwnCardsLoading } = useOwnCards();
  const favouriteIds = useFavouriteIds();
  const { choice, chooseDeck } = useDeckChoice();

  const [name, setName] = useState(deck?.name ?? '');
  const [selectedIds, setSelectedIds] = useState<readonly string[]>(deck?.cardIds ?? []);
  // The cards the deck held when it opened, so a card unfavourited since stays listed to take out.
  const [storedCardIds] = useState<readonly string[]>(deck?.cardIds ?? []);
  const [nameError, setNameError] = useState<string | undefined>(undefined);
  const [message, setMessage] = useState<string | undefined>(undefined);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | undefined>(undefined);
  // A second press while a write is under way must not write twice.
  const isWriting = useRef(false);

  const isReady = !isOwnCardsLoading && favouriteIds !== undefined;
  const pickable = useMemo(
    () =>
      isReady
        ? pickableCards({
            starterDeck: getStarterDeck(),
            ownCards,
            favouriteIds,
            storedCardIds,
          })
        : { mine: [], favourites: [] },
    [isReady, ownCards, favouriteIds, storedCardIds],
  );
  const rows = useMemo(() => deckEditorRows(pickable), [pickable]);
  const counts = useMemo(
    () => countSelectedByCategory(selectedIds, [...pickable.mine, ...pickable.favourites]),
    [selectedIds, pickable],
  );

  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const isFull = selectedIds.length >= limits.cardsPerCustomDeck;
  // The reason a card cannot be added sits above Save, where it stays in view. A failed write
  // replaces it until the player changes something.
  const footerMessage = message ?? (isFull ? copy.decks.cardLimit : undefined);

  // The line is a polite live region, which the platform announces on Android. This announces it
  // on iOS too, when it comes up.
  useEffect(() => {
    if (footerMessage !== undefined) AccessibilityInfo.announceForAccessibility(footerMessage);
  }, [footerMessage]);

  // A deep link can open this screen with nothing behind it, so it falls back to the picker.
  const goBack = () => (router.canGoBack() ? router.back() : router.replace(deckPickerRoute));

  const changeName = (nextName: string) => {
    setName(nextName);
    setNameError(undefined);
    setMessage(undefined);
  };

  const toggleCard = (cardId: string) => {
    setMessage(undefined);
    // The cards that are not in the deck are disabled at the limit, so none is added past it.
    setSelectedIds((current) =>
      current.includes(cardId) ? current.filter((id) => id !== cardId) : [...current, cardId],
    );
  };

  const submit = async () => {
    if (isWriting.current) return;
    if (name.trim() === '') {
      setNameError(copy.decks.nameError);
      AccessibilityInfo.announceForAccessibility(copy.decks.nameError);
      return;
    }
    isWriting.current = true;
    try {
      const result = await repository.saveDeck({ id: deck?.id, name, cardIds: selectedIds });
      if (result.ok) {
        // The screen is leaving, so a further press is still ignored.
        goBack();
        return;
      }
      if (result.reason === 'limit') setMessage(copy.decks.deckLimit);
      else setNameError(copy.decks.nameError);
    } catch {
      setMessage(copy.decks.writeFailed);
    }
    isWriting.current = false;
  };

  const confirmDelete = async () => {
    if (!deck || isWriting.current) return;
    isWriting.current = true;
    setIsDeleting(true);
    setDeleteError(undefined);
    try {
      await repository.deleteDeck(deck.id);
      // Setup falls back to the starter deck when the deck it had chosen is gone.
      if (choice === customDeckChoice(deck.id)) chooseDeck('starter');
      setIsConfirmingDelete(false);
      goBack();
      return;
    } catch {
      setDeleteError(copy.decks.deleteFailed);
    }
    setIsDeleting(false);
    isWriting.current = false;
  };

  const renderRow = ({ item }: { item: DeckEditorRow }) => {
    if (item.kind === 'section') {
      return (
        <View className="pt-16">
          <Text accessibilityRole="header" className="type-heading text-foreground">
            {sectionTitles[item.section]}
          </Text>
        </View>
      );
    }
    if (item.kind === 'category') {
      return (
        <View
          accessible
          accessibilityRole="header"
          accessibilityLabel={categoryNames[item.categoryId]}
          className="pt-16"
        >
          <Chip label={categoryNames[item.categoryId]} category={item.categoryId} />
        </View>
      );
    }
    const { card } = item;
    const isSelected = selected.has(card.id);
    return (
      <View className="pt-12">
        <Card
          label={
            card.kind === 'together'
              ? fillCopy(copy.ownCards.togetherCardLabel, { text: card.text })
              : card.text
          }
          selected={isSelected}
          disabled={isFull && !isSelected}
          onPress={() => toggleCard(card.id)}
        >
          <View className="gap-8">
            {card.kind === 'together' ? <Chip label={copy.ownCards.kindTogether} accent /> : null}
            <Text className="type-body-bold text-foreground">{card.text}</Text>
          </View>
        </Card>
      </View>
    );
  };

  const trimmedLength = name.trim().length;

  const listHeader = (
    <View className="gap-16">
      <Header title={copy.decks.editorTitle} backLabel={copy.decks.backLabel} onBack={goBack} />

      <TextField
        label={copy.decks.nameLabel}
        value={name}
        onChangeText={changeName}
        maxLength={limits.deckNameLength}
        count={trimmedLength}
        maxCount={limits.deckNameLength}
        countHint={fillCopy(copy.ui.characterCount, {
          count: trimmedLength,
          max: limits.deckNameLength,
        })}
        error={nameError}
      />

      <View className="gap-8">
        <Text className="type-label text-muted">{deckCountText(selectedIds.length)}</Text>
        <View className="flex-row flex-wrap gap-8">
          {categoryIds.map((categoryId) => (
            <Chip
              key={categoryId}
              label={fillCopy(copy.decks.categoryCount, {
                category: categoryNames[categoryId],
                count: counts[categoryId],
              })}
              category={categoryId}
              selected={counts[categoryId] > 0 ? undefined : false}
            />
          ))}
        </View>
      </View>
    </View>
  );

  // Delete sits at the end of the list, away from Save.
  const listFooter = deck ? (
    <View className="pt-24">
      <Button
        label={copy.decks.deleteDeck}
        variant="secondary"
        fullWidth
        onPress={() => setIsConfirmingDelete(true)}
      />
    </View>
  ) : null;

  const nothingToPick = isReady ? (
    <View className="rounded-lg border-2 border-border bg-surface p-12">
      <Text className="type-body-bold text-foreground">{copy.decks.nothingToAdd}</Text>
    </View>
  ) : null;

  return (
    <>
      <Screen
        avoidKeyboard
        footer={
          <>
            {footerMessage === undefined ? null : (
              <Text
                accessibilityLiveRegion="polite"
                className="type-label text-center text-foreground"
              >
                {footerMessage}
              </Text>
            )}
            <Button label={copy.decks.saveDeck} fullWidth disabled={!isReady} onPress={submit} />
          </>
        }
      >
        <FlatList
          className="flex-1"
          data={rows}
          extraData={selected}
          keyExtractor={(row) => row.key}
          renderItem={renderRow}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={nothingToPick}
          ListFooterComponent={listFooter}
          keyboardShouldPersistTaps="handled"
        />
      </Screen>

      <Dialog
        visible={isConfirmingDelete}
        title={copy.decks.deleteTitle}
        body={copy.decks.deleteBody}
        confirmLabel={copy.decks.deleteConfirm}
        cancelLabel={copy.decks.deleteCancel}
        error={deleteError}
        busy={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => {
          setIsConfirmingDelete(false);
          setDeleteError(undefined);
        }}
      />
    </>
  );
}
