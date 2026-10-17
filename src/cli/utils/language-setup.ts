import prompts from "prompts";
import { BUILTIN_LOCALES, canonicalLocale, type LocaleConfig } from "../../runtime/i18n";

export interface LanguageSetup {
  defaultLocale: string;
  locales: string[];
  languageEntries: LocaleConfig[];
}

function validateCode(value: string): true | string {
  try {
    canonicalLocale(value);
    return true;
  } catch {
    return "Use a language tag such as en, pt-BR or ja.";
  }
}

/** No disk writes. Cancellation at any prompt aborts the complete setup. */
export async function setupLanguages(
  options: { defaultLocale?: string; locales?: string },
  interactive: boolean,
  existing: readonly LocaleConfig[] = BUILTIN_LOCALES,
): Promise<LanguageSetup | undefined> {
  let cancelled = false;
  const onCancel = () => {
    cancelled = true;
    return false;
  };
  const entries = new Map([...BUILTIN_LOCALES, ...existing].map((item) => [item.code, { ...item }]));
  let original = canonicalLocale(options.defaultLocale ?? "en");
  let selected =
    options.locales === undefined
      ? existing.map((item) => item.code)
      : options.locales
          .split(",")
          .filter((item) => item.trim())
          .map(canonicalLocale);
  if (interactive && options.locales === undefined) {
    const response = await prompts(
      {
        type: "multiselect",
        name: "selected",
        message: "Project languages (Space to select, Enter to confirm):",
        choices: [...entries.values()].map((item) => ({
          title: `${item.label ?? item.code} (.${item.code.toLowerCase()}.md)`,
          value: item.code,
          selected: selected.includes(item.code),
        })),
        min: 1,
      },
      { onCancel },
    );
    if (cancelled || !Array.isArray(response.selected) || response.selected.length === 0) return undefined;
    selected = response.selected;
    while (!cancelled) {
      const answer = await prompts(
        { type: "confirm", name: "add", message: "Add another language manually?", initial: false },
        { onCancel },
      );
      if (cancelled || answer.add === undefined) return undefined;
      if (!answer.add) break;
      const custom = await prompts(
        [
          {
            type: "text",
            name: "label",
            message: "Language name:",
            validate: (value: string) => Boolean(value.trim()) || "Enter a language name.",
          },
          {
            type: "text",
            name: "code",
            message: "i18n suffix / language tag (e.g. ja or it):",
            validate: (value: string) => {
              const valid = validateCode(value);
              return valid === true && selected.includes(canonicalLocale(value))
                ? "This language is already selected."
                : valid;
            },
          },
        ],
        { onCancel },
      );
      if (cancelled || !custom.code || !custom.label) return undefined;
      const code = canonicalLocale(custom.code);
      entries.set(code, { code, label: custom.label.trim() });
      selected.push(code);
    }
  }
  if (interactive && !options.defaultLocale) {
    const response = await prompts(
      {
        type: "select",
        name: "original",
        message: "Original language of unsuffixed documents:",
        choices: selected.map((code) => ({ title: entries.get(code)?.label ?? code, value: code })),
        initial: Math.max(0, selected.indexOf(original)),
      },
      { onCancel },
    );
    if (cancelled || !response.original) return undefined;
    original = canonicalLocale(response.original);
  }
  const locales = [...new Set([original, ...selected])];
  return { defaultLocale: original, locales, languageEntries: locales.map((code) => entries.get(code) ?? { code }) };
}
