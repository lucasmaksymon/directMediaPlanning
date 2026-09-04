export function parseFormLines(formData: FormData, prefix: string, fields: string[]) {
  const ids = formData.getAll(`${prefix}.id`).map((v) => String(v ?? "").trim());
  const cols = Object.fromEntries(
    fields.map((name) => [name, formData.getAll(`${prefix}.${name}`).map((v) => String(v ?? "").trim())]),
  );
  const count = Math.max(ids.length, ...fields.map((name) => cols[name].length), 0);
  const lines: Array<{ id: string | null; values: Record<string, string> }> = [];
  for (let i = 0; i < count; i += 1) {
    const values = Object.fromEntries(fields.map((name) => [name, cols[name][i] ?? ""]));
    const blank = fields.every((name) => !values[name]);
    if (blank) continue;
    lines.push({ id: ids[i] || null, values });
  }
  return lines;
}
