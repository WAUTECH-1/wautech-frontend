import type { Money, PipelineStage, Theme } from './contracts';
import { themes } from './contracts';
export function formatMoney(value: Money): string {
  if (
    !Number.isFinite(value.amount) ||
    value.amount < 0 ||
    !/^[A-Z]{3}$/.test(value.currency)
  )
    throw new Error('Invalid monetary value');
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: value.currency,
  }).format(value.amount);
}
/** Never collapses currency totals into one number. */
export function pipelineTotals(stages: readonly PipelineStage[]): Money[] {
  const totals = new Map<string, number>();
  for (const stage of stages)
    for (const value of stage.totals) {
      formatMoney(value);
      const amount = (totals.get(value.currency) || 0) + value.amount;
      if (!Number.isFinite(amount)) throw new Error('Monetary total overflow');
      totals.set(value.currency, amount);
    }
  return [...totals].map(([currency, amount]) => ({ currency, amount }));
}
export function readPreference(key: string, fallback: string) {
  try {
    return typeof window === 'undefined'
      ? fallback
      : window.localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}
export function savePreference(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* Optional browser preferences. */
  }
}
export function resolveTheme(value: string): Theme {
  return themes.find((theme) => theme === value) || themes[0];
}
