type PlaceholderNames<Template extends string> =
  Template extends `${string}{${infer Name}}${infer Rest}` ? Name | PlaceholderNames<Rest> : never;

type CopyValues<Template extends string> = {
  [Name in PlaceholderNames<Template>]: string | number;
};

/**
 * Fills the `{placeholder}` markers of a copy line. The template's type names the placeholders, so a
 * missing or misspelled value fails typecheck.
 */
export function fillCopy<const Template extends string>(
  template: Template,
  values: CopyValues<Template>,
): string {
  const valuesByName: Record<string, string | number> = values;
  return template.replace(/\{(\w+)\}/g, (_marker, name: string) => String(valuesByName[name]));
}
