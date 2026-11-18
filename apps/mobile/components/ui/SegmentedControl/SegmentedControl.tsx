import { Pressable, Text, View } from 'react-native';

import type { SegmentedControlProps } from './types';

// The checked option is a face on the accent colour that sits on a depth edge, as a primary button
// does. An option that is not checked leaves out the edge but keeps the same margin, so choosing
// one does not change the size of the control. Both faces name the pressed variant, because a face
// that gains it after the first render is remounted by NativeWind. The face is 46 high with its
// margin, which is over the 44 a touch target needs. Text on the accent is for large bold labels,
// so the options use the heading style.
const edgeClasses =
  'pointer-events-none absolute inset-x-0 bottom-0 top-4 rounded-md bg-accent-deep';
const faceShape = 'type-heading mb-4 rounded-md px-4 py-8 text-center';
const checkedFaceClasses = `${faceShape} bg-accent text-on-accent group-active:translate-y-4`;
const uncheckedFaceClasses = `${faceShape} text-muted group-active:translate-y-0`;

// The group is deliberately not an accessibility element, so that iOS still exposes its radios, and
// that means a screen reader may skip the name it carries. The visible label is therefore left
// readable, so it is read once as text before the options.
export function SegmentedControl<Value extends string | number>({
  label,
  options,
  value,
  onValueChange,
}: SegmentedControlProps<Value>) {
  return (
    <View className="gap-4">
      <Text className="type-caption uppercase text-muted">{label}</Text>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={label}
        className="flex-row gap-4 rounded-lg border-2 border-border bg-surface p-4"
      >
        {options.map((option) => {
          const isChecked = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: isChecked }}
              onPress={() => onValueChange(option.value)}
              className="group flex-1"
            >
              {isChecked ? <View className={edgeClasses} /> : null}
              <Text className={isChecked ? checkedFaceClasses : uncheckedFaceClasses}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
