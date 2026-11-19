import type { CharacterId } from '@getfreak/core';
import { useState } from 'react';
import { Text, View } from 'react-native';

import type { MoodOf } from '../../../../characters';
import { CharacterOf, Chip, SpeechBubble } from '../../../../components/ui';

type CharacterShowcaseProps<Id extends CharacterId> = {
  character: Id;
  /** The sample name and line. Nothing here ships to players. */
  name: string;
  line: string;
  moods: readonly [MoodOf<Id>, ...MoodOf<Id>[]];
};

/** One character in every mood, at every size, with a speech bubble. For looking at the art on a device. */
export function CharacterShowcase<Id extends CharacterId>({
  character,
  name,
  line,
  moods,
}: CharacterShowcaseProps<Id>) {
  const [mood, setMood] = useState<MoodOf<Id>>(moods[0]);

  return (
    <View className="gap-12">
      <Text className="type-heading text-foreground">{name}</Text>
      <View className="flex-row flex-wrap gap-8">
        {moods.map((option) => (
          <Chip
            key={option}
            label={`${name}, ${option}`}
            selected={option === mood}
            onPress={() => setMood(option)}
          />
        ))}
      </View>
      <SpeechBubble text={line} tail="left" popIn />
      <View className="flex-row items-end gap-16">
        <CharacterOf character={character} mood={mood} size="hero" />
        <CharacterOf character={character} mood={mood} size="medium" />
        <CharacterOf character={character} mood={mood} size="tile" crop="head" />
      </View>
      <View className="flex-row flex-wrap gap-8">
        {moods.map((option) => (
          <CharacterOf
            key={option}
            character={character}
            mood={option}
            size="tile"
            crop="head"
            animated={false}
          />
        ))}
      </View>
    </View>
  );
}
