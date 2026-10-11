import { expect, test } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import App from './App';

test('renders only the developer workspace heading', () => {
  expect(renderToStaticMarkup(<App />)).toBe(
    '<h1 class="text-2xl font-semibold">WAUTECH Intelligence — Asad Workspace</h1>',
  );
});
