import { characterNames } from '@getfreak/content';
import { categoryIds, characterIds, type CategoryId, type CharacterId } from '@getfreak/core';
import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';

import type { MoodOf } from '../../../characters';
import {
  Button,
  CategoryToggle,
  Card,
  Chip,
  Countdown,
  Dialog,
  FavouriteToggle,
  Header,
  PinPad,
  Screen,
  SegmentedControl,
  SettingsRow,
  TextField,
  Toast,
  Toggle,
} from '../../../components/ui';
import { CharacterShowcase } from './CharacterShowcase';

// The moods each character shows in the gallery, typed so a mood a character cannot show fails.
const castMoods: { [Id in CharacterId]: readonly [MoodOf<Id>, ...MoodOf<Id>[]] } = {
  host: ['idle', 'happy', 'flirty', 'shocked', 'wave'],
  dealer: ['idle', 'happy', 'flirty', 'shocked'],
  hype: ['idle', 'happy', 'flirty', 'shocked', 'celebrate'],
  gatekeeper: ['idle', 'happy', 'flirty', 'shocked', 'armsCrossed'],
  shy: ['idle', 'happy', 'flirty', 'shocked', 'flustered', 'coverEyes'],
};

const secondsText = (count: number) => `${count} ${count === 1 ? 'second' : 'seconds'}`;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-12">
      <Text className="type-label text-muted">{title}</Text>
      {children}
    </View>
  );
}

// This screen exists only to look at the kit on a device in development. Player-facing text
// belongs in the content package, but nothing here ships to players, so the sample labels are
// literals.
export function KitGallery() {
  const router = useRouter();
  const [soundOn, setSoundOn] = useState(true);
  const [favouriteOff, setFavouriteOff] = useState(false);
  const [isToastShowing, setIsToastShowing] = useState(false);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [isDialogShowing, setIsDialogShowing] = useState(false);
  const [isDangerDialogShowing, setIsDangerDialogShowing] = useState(false);
  const [option, setOption] = useState('b');
  const [categoryOn, setCategoryOn] = useState(true);
  const [categoryOff, setCategoryOff] = useState(false);
  const [liveCountdownStartedAt, setLiveCountdownStartedAt] = useState<number | null>(null);
  // The ended one started a long time ago, so it is already at zero.
  const [endedCountdownStartedAt] = useState(() => Date.now() - 120_000);
  const [pinValue, setPinValue] = useState('');
  const [pinError, setPinError] = useState<string | undefined>(undefined);
  const [selectedCategories, setSelectedCategories] = useState<CategoryId[]>(['c1', 'c2']);

  const toggleCategory = (categoryId: CategoryId) =>
    setSelectedCategories((current) =>
      current.includes(categoryId)
        ? current.filter((selectedId) => selectedId !== categoryId)
        : [...current, categoryId],
    );

  return (
    <>
      <Screen scroll>
        <Header
          title="UI kit"
          subtitle="Every component in the current theme"
          backLabel="Go back"
          onBack={() => router.back()}
          trailing={
            <View
              accessible
              accessibilityRole="image"
              accessibilityLabel="Avatar"
              className="h-48 w-48 rounded-lg border-2 border-border bg-surface"
            />
          }
        />

        <Section title="Buttons">
          <Button label="Primary" onPress={() => {}} />
          <Button label="Secondary" variant="secondary" onPress={() => {}} />
          <Button label="Primary, full width" fullWidth onPress={() => {}} />
          <Button label="Secondary, full width" variant="secondary" fullWidth onPress={() => {}} />
          <Button label="Primary, disabled" disabled onPress={() => {}} />
          <Button label="Secondary, disabled" variant="secondary" disabled onPress={() => {}} />
          <Button label="Danger button" variant="danger" onPress={() => {}} />
          <Button label="Danger button, disabled" variant="danger" disabled onPress={() => {}} />
        </Section>

        <Section title="Settings rows">
          {/* Not grouped, so each row is read on its own. */}
          <Card grouped={false}>
            <View className="gap-8">
              <SettingsRow label="Row with a value" value="On, PIN" onPress={() => {}} />
              <View className="border-t-2 border-border" />
              <SettingsRow
                label="Row with a caption"
                caption="A line under the label."
                onPress={() => {}}
              />
              <View className="border-t-2 border-border" />
              <SettingsRow label="Disabled row" disabled onPress={() => {}} />
              <View className="border-t-2 border-border" />
              <SettingsRow
                label="Danger row"
                tone="danger"
                showChevron={false}
                onPress={() => {}}
              />
            </View>
          </Card>
        </Section>

        <Section title="PIN pad, to try">
          {/* The last number shows the error line and clears the dots, as a wrong PIN would. */}
          <PinPad
            value={pinValue}
            onChange={(next) => {
              setPinError(undefined);
              setPinValue(next);
            }}
            onComplete={() => {
              setPinError('Sample error. Try again.');
              setPinValue('');
            }}
            error={pinError}
          />
        </Section>

        <Section title="PIN pad, partly filled">
          <PinPad value="12" onChange={() => {}} onComplete={() => {}} />
        </Section>

        <Section title="PIN pad, full">
          <PinPad value="1234" onChange={() => {}} onComplete={() => {}} />
        </Section>

        <Section title="PIN pad, error">
          <PinPad
            value=""
            error="Wrong PIN. Try again."
            onChange={() => {}}
            onComplete={() => {}}
          />
        </Section>

        <Section title="PIN pad, waiting">
          <PinPad
            value=""
            disabled
            message="Try again in 0:24."
            onChange={() => {}}
            onComplete={() => {}}
          />
        </Section>

        <Section title="Cards">
          <Card>
            <Text className="type-heading text-foreground">Plain card</Text>
          </Card>
          <Card label="Pressable card" onPress={() => {}}>
            <Text className="type-heading text-foreground">Pressable card</Text>
          </Card>
          <Card label="Disabled card" category="c2" disabled onPress={() => {}}>
            <Text className="type-heading text-foreground">Disabled card</Text>
          </Card>
          <Card accent>
            <Chip label="Accent chip" accent />
            <Text className="type-heading mt-8 text-foreground">Accent card</Text>
          </Card>
          <Card faceDown mark="?" title="Face down" label="Face down card" />
          {categoryIds.map((categoryId) => (
            <Card key={categoryId} category={categoryId}>
              <Chip label={`Category ${categoryId}`} category={categoryId} />
              <Text className="type-heading mt-8 text-foreground">Card text goes here</Text>
            </Card>
          ))}
        </Section>

        <Section title="Chips">
          <View className="flex-row flex-wrap gap-8">
            <Chip label="Neutral" />
            <Chip label="Neutral, selected" onPress={() => {}} selected />
            <Chip label="Neutral, pressable" onPress={() => {}} />
          </View>
          <View className="flex-row flex-wrap gap-8">
            {categoryIds.map((categoryId) => (
              <Chip key={categoryId} label={`Filled ${categoryId}`} category={categoryId} />
            ))}
          </View>
          <View className="flex-row flex-wrap gap-8">
            {categoryIds.map((categoryId) => (
              <Chip
                key={categoryId}
                label={`Pick ${categoryId}`}
                category={categoryId}
                selected={selectedCategories.includes(categoryId)}
                onPress={() => toggleCategory(categoryId)}
              />
            ))}
          </View>
        </Section>

        <Section title="Toggles">
          <Toggle label="Switch" value={soundOn} onValueChange={setSoundOn} />
          <Toggle label="Switch, off" value={false} onValueChange={() => {}} />
          <Toggle
            label="Switch, with a description"
            description="A line that says what the switch does."
            value={soundOn}
            onValueChange={setSoundOn}
          />
          <Toggle label="Switch, disabled" value disabled onValueChange={() => {}} />
          <Toggle
            label="Switch, locked"
            value
            locked
            lockedHint="One switch has to stay on."
            onValueChange={() => {}}
          />
        </Section>

        <Section title="Favourite toggle">
          <View className="flex-row gap-12">
            <FavouriteToggle
              label="Favourite"
              value={favouriteOff}
              onValueChange={setFavouriteOff}
            />
            <FavouriteToggle
              label="Favourite"
              value
              onValueChange={() => {}}
              context="A card for the gallery"
            />
          </View>
        </Section>

        <Section title="Segmented control">
          <SegmentedControl
            label="Segmented control"
            options={[
              { value: 'a', label: 'Option A' },
              { value: 'b', label: 'Option B' },
              { value: 'c', label: 'Option C' },
            ]}
            value={option}
            onValueChange={setOption}
          />
        </Section>

        <Section title="Category toggles">
          <View className="flex-row flex-wrap gap-8">
            <View className="w-[48%]">
              <CategoryToggle
                label="Category on"
                category="c1"
                value={categoryOn}
                onValueChange={setCategoryOn}
              />
            </View>
            <View className="w-[48%]">
              <CategoryToggle
                label="Category off"
                category="c2"
                value={categoryOff}
                onValueChange={setCategoryOff}
              />
            </View>
            <View className="w-[48%]">
              <CategoryToggle
                label="Category locked"
                category="c3"
                value
                locked
                onValueChange={() => {}}
              />
            </View>
            <View className="w-[48%]">
              <CategoryToggle label="Category four" category="c4" value onValueChange={() => {}} />
            </View>
          </View>
        </Section>

        <Section title="Countdown">
          <Countdown
            seconds={60}
            startedAt={null}
            label="Countdown, idle"
            secondsText={secondsText}
            endText="Time is up"
          />
          <Countdown
            seconds={10}
            startedAt={liveCountdownStartedAt}
            label="Countdown, live"
            secondsText={secondsText}
            endText="Time is up"
          />
          <Button
            label="Start the live countdown"
            variant="secondary"
            onPress={() => setLiveCountdownStartedAt(Date.now())}
          />
          <Countdown
            seconds={60}
            startedAt={endedCountdownStartedAt}
            label="Countdown, ended"
            secondsText={secondsText}
            endText="Time is up"
          />
        </Section>

        <Section title="Cast">
          {characterIds.map((characterId) => (
            <CharacterShowcase
              key={characterId}
              character={characterId}
              name={characterNames[characterId].name}
              line={characterNames[characterId].personality}
              moods={castMoods[characterId]}
            />
          ))}
        </Section>

        <Section title="Text field">
          <TextField
            label="Text field"
            value={name}
            onChangeText={setName}
            placeholder="Type here"
            maxLength={12}
          />
        </Section>

        <Section title="Text field, multiline">
          <TextField
            label="Multiline text field"
            value={note}
            onChangeText={setNote}
            multiline
            count={note.length}
            maxCount={140}
            error={note.length > 140 ? 'Keep it to 140 characters.' : undefined}
          />
        </Section>

        <Section title="Dialog">
          <Button
            label="Show dialog"
            variant="secondary"
            onPress={() => setIsDialogShowing(true)}
          />
          <Button
            label="Show danger dialog"
            variant="secondary"
            onPress={() => setIsDangerDialogShowing(true)}
          />
        </Section>

        <Section title="Toast">
          <Button label="Show toast" variant="secondary" onPress={() => setIsToastShowing(true)} />
        </Section>
      </Screen>
      <Dialog
        visible={isDialogShowing}
        title="Dialog title"
        body="A line that says what the choice does."
        confirmLabel="Dialog confirm"
        cancelLabel="Dialog cancel"
        onConfirm={() => setIsDialogShowing(false)}
        onCancel={() => setIsDialogShowing(false)}
      />
      <Dialog
        visible={isDangerDialogShowing}
        title="Danger dialog title"
        body="A line that says what the choice destroys."
        confirmLabel="Danger confirm"
        cancelLabel="Danger cancel"
        confirmVariant="danger"
        error="An error line, in the danger colour."
        onConfirm={() => setIsDangerDialogShowing(false)}
        onCancel={() => setIsDangerDialogShowing(false)}
      >
        <Text className="type-body text-foreground">Content under the line.</Text>
      </Dialog>
      {isToastShowing ? (
        <Toast
          message="Toast message"
          dismissHint="Tap to dismiss"
          onDismiss={() => setIsToastShowing(false)}
        />
      ) : null}
    </>
  );
}
