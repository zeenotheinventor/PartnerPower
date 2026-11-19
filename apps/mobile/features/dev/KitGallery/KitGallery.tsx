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
  Dialog,
  FavouriteToggle,
  Header,
  Screen,
  SegmentedControl,
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
  const [chosenCard, setChosenCard] = useState<'one' | 'two'>('two');
  const [isToastShowing, setIsToastShowing] = useState(false);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [isDialogShowing, setIsDialogShowing] = useState(false);
  const [option, setOption] = useState('b');
  const [categoryOn, setCategoryOn] = useState(true);
  const [categoryOff, setCategoryOff] = useState(false);
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
          <Card
            label="Choice one"
            selected={chosenCard === 'one'}
            onPress={() => setChosenCard('one')}
          >
            <Text className="type-heading text-foreground">Choice one</Text>
          </Card>
          <Card
            label="Choice two"
            selected={chosenCard === 'two'}
            onPress={() => setChosenCard('two')}
          >
            <Text className="type-heading text-foreground">Choice two</Text>
          </Card>
          <Card label="Choice, disabled" selected={false} disabled onPress={() => {}}>
            <Text className="type-heading text-foreground">Choice, disabled</Text>
          </Card>
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
