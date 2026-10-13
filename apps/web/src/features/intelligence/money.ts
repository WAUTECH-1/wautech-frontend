/** Preserve JSON decimal tokens before JS floating-point conversion. */
export function parseExactJson(source: string): unknown {
  let quoted = false,
    escaped = false,
    output = '';
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (quoted) {
      output += ch;
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') quoted = false;
    } else if (ch === '"') {
      quoted = true;
      output += ch;
    } else if (ch === '-' || /\d/.test(ch)) {
      const token = source.slice(i).match(/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/);
      if (!token) throw new Error('Invalid JSON number');
      output += JSON.stringify(token[0]);
      i += token[0].length - 1;
    } else output += ch;
  }
  try {
    return JSON.parse(output);
  } catch {
    throw new Error('Invalid JSON service response.');
  }
}
export function decimal(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  if (
    typeof value === 'number' &&
    (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER)
  )
    return null;
  const text = String(value);
  if (!/^\d{1,40}(?:\.\d{1,12})?$/.test(text)) return null;
  const [whole, fraction = ''] = text.split('.');
  const trimmed = fraction.replace(/0+$/, '');
  return BigInt(whole).toString() + (trimmed ? '.' + trimmed : '');
}
export function addDecimals(a: string, b: string): string {
  const [aw, af = ''] = a.split('.'),
    [bw, bf = ''] = b.split('.');
  const scale = Math.max(af.length, bf.length);
  const sum =
    BigInt(aw + af.padEnd(scale, '0')) + BigInt(bw + bf.padEnd(scale, '0'));
  const digits = sum.toString().padStart(scale + 1, '0');
  const result = decimal(
    scale ? digits.slice(0, -scale) + '.' + digits.slice(-scale) : digits,
  );
  if (result === null)
    throw new Error('Financial total exceeds supported precision.');
  return result;
}
export function validCurrency(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Z]{3}$/.test(value);
}
export function moneyLabel(amount: unknown, currency: unknown): string {
  const parsed = decimal(amount);
  if (parsed === null || !validCurrency(currency)) return 'Value unavailable';
  const [whole, fraction] = parsed.split('.');
  return `${currency} ${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${fraction ? '.' + fraction : ''}`;
}
export function sumMoney(
  rows: readonly { amount: unknown; currency: unknown }[],
) {
  const totals: Record<string, string> = {};
  let unavailable = 0;
  for (const row of rows) {
    const amount = decimal(row.amount);
    if (amount === null || !validCurrency(row.currency)) {
      unavailable++;
      continue;
    }
    totals[row.currency] = addDecimals(totals[row.currency] ?? '0', amount);
  }
  return { totals, unavailable };
}
