import { categoryNames, copy, fillCopy } from '@getfreak/content';
import { categoryIds, limits, tidyCardText, type CardKind, type CategoryId } from '@getfreak/core';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { AccessibilityInfo, Text, View } from 'react-native';

import {
  Button,
  Chip,
  Dialog,
  Header,
  Screen,
  SegmentedControl,
  TextField,
} from '../../../components/ui';
import { cardProblemMessage } from '../cardProblemMessage';
import { useOwnCards } from '../OwnCardsProvider';
import { myDaresRoute } from '../routes';
import type { DareEditorFormProps } from './types';

const kindOptions: { value: CardKind; label: string }[] = [
  { value: 'solo', label: copy.ownCards.kindSolo },
  { value: 'together', label: copy.ownCards.kindTogether },
];

// A new dare starts on the first category and for the partner. It does not follow the level chosen
// at setup, because the level decides which dares are dealt, not which a player may write.
// Nothing here logs. A dare is personal text.
export function DareEditorForm({ dare }: DareEditorFormProps) {
  const router = useRouter();
  const { isLoading, save, remove } = useOwnCards();

  const [text, setText] = useState(dare?.text ?? '');
  const [category, setCategory] = useState<CategoryId>(dare?.category ?? 'c1');
  const [kind, setKind] = useState<CardKind>(dare?.kind ?? 'solo');
  const [error, setError] = useState<string | undefined>(undefined);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  // A second press while a write is under way must not write twice.
  const isWriting = useRef(false);

  // A deep link can open this screen with nothing behind it, so it falls back to the list.
  const goBack = () => (router.canGoBack() ? router.back() : router.replace(myDaresRoute));

  const showError = (message: string) => {
    setError(message);
    AccessibilityInfo.announceForAccessibility(message);
  };

  const changeText = (nextText: string) => {
    setText(nextText);
    setError(undefined);
  };

  const submit = async () => {
    if (isWriting.current) return;
    isWriting.current = true;
    try {
      const result = await save({ id: dare?.id, category, kind, text });
      if (result.ok) {
        // The screen is leaving, so a further press is still ignored.
        goBack();
        return;
      }
      showError(
        result.reason === 'limit' ? copy.ownCards.limit : cardProblemMessage(result.problems),
      );
    } catch {
      showError(copy.ownCards.writeFailed);
    }
    isWriting.current = false;
  };

  const confirmDelete = async () => {
    setIsConfirmingDelete(false);
    if (!dare || isWriting.current) return;
    isWriting.current = true;
    try {
      await remove(dare.id);
      goBack();
      return;
    } catch {
      showError(copy.ownCards.writeFailed);
    }
    isWriting.current = false;
  };

  return (
    <>
      <Screen
        scroll
        avoidKeyboard
        footer={
          <Button
            label={copy.ownCards.save}
            fullWidth
            disabled={text === '' || isLoading}
            onPress={submit}
          />
        }
      >
        <Header
          title={copy.ownCards.editorTitle}
          backLabel={copy.ownCards.backLabel}
          onBack={goBack}
        />

        <TextField
          label={copy.ownCards.fieldLabel}
          value={text}
          onChangeText={changeText}
          multiline
          count={tidyCardText(text).length}
          maxCount={limits.cardTextLength}
          countHint={fillCopy(copy.ui.characterCount, {
            count: tidyCardText(text).length,
            max: limits.cardTextLength,
          })}
          error={error}
        />

        <View className="gap-4">
          <Text className="type-caption uppercase text-muted">{copy.ownCards.categoryLabel}</Text>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel={copy.ownCards.categoryLabel}
            className="flex-row flex-wrap gap-8"
          >
            {categoryIds.map((categoryId) => (
              <Chip
                key={categoryId}
                label={categoryNames[categoryId]}
                category={categoryId}
                selected={categoryId === category}
                onPress={() => setCategory(categoryId)}
              />
            ))}
          </View>
        </View>

        <SegmentedControl
          label={copy.ownCards.kindLabel}
          options={kindOptions}
          value={kind}
          onValueChange={setKind}
        />

        <View className="flex-1" />

        {dare ? (
          <Button
            label={copy.ownCards.deleteButton}
            variant="secondary"
            fullWidth
            onPress={() => setIsConfirmingDelete(true)}
          />
        ) : null}
      </Screen>

      <Dialog
        visible={isConfirmingDelete}
        title={copy.ownCards.deleteTitle}
        body={copy.ownCards.deleteBody}
        confirmLabel={copy.ownCards.deleteConfirm}
        cancelLabel={copy.ownCards.deleteCancel}
        onConfirm={confirmDelete}
        onCancel={() => setIsConfirmingDelete(false)}
      />
    </>
  );
}
