export type AutocompleteFilterOption = { value: string; label: string };

export function foldAutocompleteText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function matchScore(text: string, q: string) {
  if (text === q) return 0;
  if (text.startsWith(q)) return 1;
  if (text.split(/[\s,/()-]+/).some((word) => word.startsWith(q))) return 2;
  if (text.includes(q)) return 3;
  return null;
}

export function isExactAutocompleteMatch(options: AutocompleteFilterOption[], query: string) {
  const q = foldAutocompleteText(query.trim());
  if (!q) return false;
  return options.some((o) => foldAutocompleteText(o.label) === q || foldAutocompleteText(o.value) === q);
}

export function filterAutocompleteOptions<T extends AutocompleteFilterOption>(
  options: T[],
  query: string,
): T[] {
  const raw = query.trim();
  if (!raw) return options;
  const q = foldAutocompleteText(raw);
  if (!q) return options;

  return options
    .map((option) => {
      const score = matchScore(foldAutocompleteText(option.label), q)
        ?? matchScore(foldAutocompleteText(option.value), q);
      return score == null ? null : { option, score };
    })
    .filter((row): row is { option: T; score: number } => row != null)
    .sort((a, b) => a.score - b.score || a.option.label.localeCompare(b.option.label, "es"))
    .map((row) => row.option);
}
