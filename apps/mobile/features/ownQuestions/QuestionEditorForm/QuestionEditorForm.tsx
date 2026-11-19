import { categoryNames, copy, fillCopy, questionFormatNames, topicNames } from '@getfreak/content';
import {
  categoryIds,
  limits,
  tidyCardText,
  topicIds,
  type CategoryId,
  type CustomQuestion,
  type TopicId,
} from '@getfreak/core';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { AccessibilityInfo, Text, View } from 'react-native';

import { Button, Chip, Dialog, Header, Screen, TextField } from '../../../components/ui';
import { buildPlayerQuestion, changeInvalidatesDiscoveries } from '../../../storage/personal/rules';
import { OptionsEditor } from '../OptionsEditor';
import { useOwnQuestions } from '../OwnQuestionsProvider';
import {
  editableFormats,
  fieldErrors,
  optionsForFormat,
  type EditableFormat,
  type FieldErrors,
} from '../questionFields';
import { ownQuestionsRoute } from '../routes';
import type { QuestionEditorFormProps } from './types';

const noErrors: FieldErrors = { options: [] };
const defaultFormat: EditableFormat = 'ifYou';

// A question with no lead, such as guess your partner, shows nothing before the field.
const leadOf: Record<EditableFormat, string | undefined> = {
  ifYou: copy.questionLeads.ifYou,
  neverHave: copy.questionLeads.neverHave,
  eitherOr: copy.questionLeads.eitherOr,
  guess: undefined,
};

function optionTextsOf(question: CustomQuestion | undefined): string[] {
  return question && 'options' in question ? question.options.map((option) => option.text) : [];
}

// A new question starts on the first format, category and topic. The category does not follow the
// level chosen at setup, because the level decides which questions are dealt, not which may be written.
// Nothing here logs. A question is personal text.
export function QuestionEditorForm({ question }: QuestionEditorFormProps) {
  const router = useRouter();
  const { isLoading, save, remove } = useOwnQuestions();

  const [format, setFormat] = useState<EditableFormat>(question?.format ?? defaultFormat);
  const [category, setCategory] = useState<CategoryId>(question?.category ?? 'c1');
  const [topic, setTopic] = useState<TopicId>(question?.topic ?? 't1');
  const [text, setText] = useState(question?.text ?? '');
  const [options, setOptions] = useState<string[]>(
    optionsForFormat(question?.format ?? defaultFormat, optionTextsOf(question)),
  );
  const [errors, setErrors] = useState<FieldErrors>(noErrors);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isConfirmingSave, setIsConfirmingSave] = useState(false);
  // A second press while a write is under way must not write twice.
  const isWriting = useRef(false);

  // A deep link can open this screen with nothing behind it, so it falls back to the list.
  const goBack = () => (router.canGoBack() ? router.back() : router.replace(ownQuestionsRoute));

  const showErrors = (shown: FieldErrors) => {
    setErrors(shown);
    const messages = [shown.text, ...shown.options].filter(
      (message): message is string => message !== undefined,
    );
    AccessibilityInfo.announceForAccessibility(messages.join(' '));
  };

  // The text stays. The options the new format does not use go, and those it does use stay.
  const chooseFormat = (nextFormat: EditableFormat) => {
    setFormat(nextFormat);
    setOptions((current) => optionsForFormat(nextFormat, current));
    setErrors(noErrors);
  };

  const changeText = (nextText: string) => {
    setText(nextText);
    setErrors((current) => ({ ...current, text: undefined }));
  };

  const changeOptions = (nextOptions: string[]) => {
    setOptions(nextOptions);
    setErrors((current) => ({ ...current, options: [] }));
  };

  // The repository deletes a question's discoveries when a change gives it another format or fewer
  // options. The same rule decides here, against the stored question, so the screen and the
  // repository cannot disagree. Only the format and the number of options matter to it, so the text
  // is a stand-in. A draft the schema rejects has problems the save reports, so it needs no warning.
  const wouldRemoveDiscoveries = () => {
    if (!question) return false;
    try {
      const changed = buildPlayerQuestion(
        question.id,
        { format, category, topic },
        { text: 'x', options: options.length > 0 ? options.map(() => 'x') : undefined },
      );
      return changeInvalidatesDiscoveries(question, changed);
    } catch {
      return false;
    }
  };

  const submit = () => {
    if (wouldRemoveDiscoveries()) setIsConfirmingSave(true);
    else void write();
  };

  const write = async () => {
    if (isWriting.current) return;
    isWriting.current = true;
    try {
      const result = await save({
        id: question?.id,
        format,
        category,
        topic,
        text,
        ...(options.length > 0 ? { options } : {}),
      });
      if (result.ok) {
        // The screen is leaving, so a further press is still ignored.
        goBack();
        return;
      }
      showErrors(
        result.reason === 'limit'
          ? { text: copy.ownQuestions.limit, options: [] }
          : fieldErrors({ format, text, options }, result.problems),
      );
    } catch {
      showErrors({ text: copy.ownQuestions.writeFailed, options: [] });
    }
    isWriting.current = false;
  };

  const confirmDelete = async () => {
    setIsConfirmingDelete(false);
    if (!question || isWriting.current) return;
    isWriting.current = true;
    try {
      await remove(question.id);
      goBack();
      return;
    } catch {
      showErrors({ text: copy.ownQuestions.writeFailed, options: [] });
    }
    isWriting.current = false;
  };

  // Save waits for what the format needs. Spaces alone count as typed, and the save answers them.
  const isMissingText = format !== 'eitherOr' && text === '';
  const isMissingOption = options.some((option) => option === '');
  const lead = leadOf[format];
  const textLength = tidyCardText(text).length;

  return (
    <>
      <Screen scroll avoidKeyboard>
        <Header
          title={question ? copy.ownQuestions.titleEdit : copy.ownQuestions.titleNew}
          backLabel={copy.ownQuestions.backLabel}
          onBack={goBack}
        />

        <View className="gap-4">
          <Text className="type-caption uppercase text-muted">{copy.ownQuestions.formatLabel}</Text>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel={copy.ownQuestions.formatLabel}
            className="flex-row flex-wrap gap-8"
          >
            {editableFormats.map((formatId) => (
              <Chip
                key={formatId}
                label={questionFormatNames[formatId]}
                selected={formatId === format}
                onPress={() => chooseFormat(formatId)}
              />
            ))}
          </View>
        </View>

        <View className="gap-4">
          <Text className="type-caption uppercase text-muted">
            {copy.ownQuestions.categoryLabel}
          </Text>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel={copy.ownQuestions.categoryLabel}
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

        <View className="gap-4">
          <Text className="type-caption uppercase text-muted">{copy.ownQuestions.topicLabel}</Text>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel={copy.ownQuestions.topicLabel}
            className="flex-row flex-wrap gap-8"
          >
            {topicIds.map((topicId) => (
              <Chip
                key={topicId}
                label={topicNames[topicId]}
                selected={topicId === topic}
                onPress={() => setTopic(topicId)}
              />
            ))}
          </View>
        </View>

        <View className="gap-4">
          {lead ? (
            <Text className="type-heading text-accent-deep">
              {fillCopy(copy.ownQuestions.leadBefore, { lead })}
            </Text>
          ) : null}
          <TextField
            label={
              format === 'eitherOr'
                ? copy.ownQuestions.textLabelOptional
                : copy.ownQuestions.textLabel
            }
            placeholder={
              format === 'eitherOr' ? copy.ownQuestions.textPlaceholderOptional : undefined
            }
            value={text}
            onChangeText={changeText}
            multiline
            count={textLength}
            maxCount={limits.cardTextLength}
            countHint={fillCopy(copy.ui.characterCount, {
              count: textLength,
              max: limits.cardTextLength,
            })}
            error={errors.text}
          />
        </View>

        <OptionsEditor
          format={format}
          options={options}
          errors={errors.options}
          onChangeOption={(index, optionText) =>
            changeOptions(options.map((option, at) => (at === index ? optionText : option)))
          }
          onAddOption={() => changeOptions([...options, ''])}
          onRemoveOption={(index) => changeOptions(options.filter((_option, at) => at !== index))}
        />

        <View className="flex-1" />

        <View className="gap-12">
          <Button
            label={copy.ownQuestions.save}
            fullWidth
            disabled={isMissingText || isMissingOption || isLoading}
            onPress={submit}
          />
          {question ? (
            <Button
              label={copy.ownQuestions.delete}
              variant="secondary"
              fullWidth
              onPress={() => setIsConfirmingDelete(true)}
            />
          ) : null}
        </View>
      </Screen>

      <Dialog
        visible={isConfirmingSave}
        title={copy.ownQuestions.saveChangeTitle}
        body={copy.ownQuestions.saveChangeBody}
        confirmLabel={copy.ownQuestions.saveChangeConfirm}
        cancelLabel={copy.ownQuestions.saveChangeCancel}
        onConfirm={() => {
          setIsConfirmingSave(false);
          void write();
        }}
        onCancel={() => setIsConfirmingSave(false)}
      />

      <Dialog
        visible={isConfirmingDelete}
        title={copy.ownQuestions.deleteTitle}
        body={copy.ownQuestions.deleteBody}
        confirmLabel={copy.ownQuestions.deleteConfirm}
        cancelLabel={copy.ownQuestions.deleteCancel}
        onConfirm={confirmDelete}
        onCancel={() => setIsConfirmingDelete(false)}
      />
    </>
  );
}
