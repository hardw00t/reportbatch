import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewSelection } from '../src/review';
import type { Analysis } from '../src/core/types';

const outputs = (groups: number[][]): Analysis['outputs'] => groups.map((pages, index) => ({
  id: `p${pages[0]}`, index: index + 1, pages, fields: {}, filename: `${index}.pdf`, issues: [], notices: [],
}));
test('rechecking corrections preserves the selected report and synchronizes its first source page', () => {
  assert.deepEqual(reviewSelection(outputs([[1], [2], [3]]), 'p3'), { outputId: 'p3', sourcePage: 3, tablePage: 0 });
  assert.deepEqual(reviewSelection(outputs([[1, 2], [3], [4, 5, 6]]), 'p4'), { outputId: 'p4', sourcePage: 4, tablePage: 0 });
});
test('changed grouping falls back consistently and selected reports remain on the visible table page', () => {
  assert.deepEqual(reviewSelection(outputs([[1, 2, 3], [4]]), 'p3'), { outputId: 'p1', sourcePage: 1, tablePage: 0 });
  assert.deepEqual(reviewSelection(outputs(Array.from({ length: 120 }, (_, i) => [i + 1])), 'p103'), { outputId: 'p103', sourcePage: 103, tablePage: 2 });
  assert.deepEqual(reviewSelection([], 'p3'), { outputId: 'p1', sourcePage: 1, tablePage: 0 });
});
