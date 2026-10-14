/** Confirmed writes invalidate independent snapshots. No optimistic data or mutation replay. */
export function recordsChanged() {
  if (typeof window !== 'undefined')
    window.dispatchEvent(new Event('wautech:records-changed'));
}
