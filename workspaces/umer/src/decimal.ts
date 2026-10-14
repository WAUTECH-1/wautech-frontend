/** Preserve monetary tokens from older numeric APIs; new APIs serialize decimals as strings. */
export function parseMoneyJson(source: string): unknown {
  let quoted = false,
    escaped = false,
    result = '';
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (quoted) {
      result += ch;
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') quoted = false;
    } else if (ch === '"') {
      quoted = true;
      result += ch;
    } else if (
      (ch === '-' || /\d/.test(ch)) &&
      /"amount"\s*:\s*$/.test(source.slice(0, i))
    ) {
      const token = source.slice(i).match(/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/);
      if (!token) throw Error('Invalid monetary JSON');
      result += JSON.stringify(token[0]);
      i += token[0].length - 1;
    } else result += ch;
  }
  return JSON.parse(result);
}
export function validAmount(value: string) {
  return /^\d{1,15}(?:\.\d{1,4})?$/.test(value);
}
export function amountLabel(value: string | number) {
  const [whole, fraction] = String(value).split('.');
  return (
    whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',') +
    (fraction ? '.' + fraction : '')
  );
}
