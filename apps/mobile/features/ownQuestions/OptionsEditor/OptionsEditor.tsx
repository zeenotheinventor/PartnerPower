import { copy, fillCopy } from '@getfreak/content';
import { limits, tidyCardText } from '@getfreak/core';
import { Text, View } from 'react-native';

import { Button, Chip, TextField } from '../../../components/ui';
import { optionRange } from '../questionFields';
import type { OptionsEditorProps } from './types';

// Would you rather has its two options fixed. Guess your partner has two to four, added and removed
// here. A format with no options shows nothing. Nothing here logs, because an option is personal text.
export function OptionsEditor({
  format,
  options,
  errors,
  onChangeOption,
  onAddOption,
  onRemoveOption,
}: OptionsEditorProps) {
  if (format !== 'eitherOr' && format !== 'guess') return null;

  const canChangeCount = format === 'guess';
  const canRemove = canChangeCount && options.length > optionRange.guess.min;
  const canAdd = canChangeCount && options.length < optionRange.guess.max;

  return (
    <View className="gap-12">
      {canChangeCount ? (
        <Text className="type-caption text-muted">{copy.ownQuestions.guessHint}</Text>
      ) : null}
      {options.map((option, index) => {
        const number = index + 1;
        const tidiedLength = tidyCardText(option).length;
        return (
          // Options are positional and are never reordered, so the position is their identity.
          <View key={index} className="flex-row items-start gap-8">
            <View className="flex-1">
              <TextField
                label={fillCopy(copy.ownQuestions.optionLabel, { number })}
                value={option}
                onChangeText={(text) => onChangeOption(index, text)}
                count={tidiedLength}
                maxCount={limits.cardTextLength}
                countHint={fillCopy(copy.ui.characterCount, {
                  count: tidiedLength,
                  max: limits.cardTextLength,
                })}
                error={errors[index]}
              />
            </View>
            {canRemove ? (
              <Chip
                label={copy.ownQuestions.removeOption}
                accessibilityLabel={fillCopy(copy.ownQuestions.removeOptionLabel, { number })}
                onPress={() => onRemoveOption(index)}
              />
            ) : null}
          </View>
        );
      })}
      {canAdd ? (
        <Button
          label={copy.ownQuestions.addOption}
          variant="secondary"
          fullWidth
          onPress={onAddOption}
        />
      ) : null}
    </View>
  );
}
