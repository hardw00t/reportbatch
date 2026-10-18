import type { Analysis } from './core/types';

/** Keep the inspector, source preview and visible table page on one report. */
export function reviewSelection(outputs: Analysis['outputs'], selectedId: string) {
  const selectedIndex = outputs.findIndex(output => output.id === selectedId);
  const index = selectedIndex < 0 ? 0 : selectedIndex;
  const output = outputs[index];
  return { outputId: output?.id ?? 'p1', sourcePage: output?.pages[0] ?? 1, tablePage: Math.floor(index / 50) };
}
