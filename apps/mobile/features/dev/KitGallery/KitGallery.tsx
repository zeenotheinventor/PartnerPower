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
  const [isToastShowing, setIsToastShowing] = useState(false);
  const [name, setName] = useState('');
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

        <Section title="Toast">
          <Button label="Show toast" variant="secondary" onPress={() => setIsToastShowing(true)} />
        </Section>
      </Screen>
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
