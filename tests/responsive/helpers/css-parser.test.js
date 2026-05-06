import { describe, it, expect } from 'vitest';
import { parseCSS } from './css-parser.js';

describe('parseCSS helper', () => {
  it('returns empty arrays for empty CSS', () => {
    const result = parseCSS('');
    expect(result.mediaQueries).toEqual([]);
    expect(result.declarations).toEqual([]);
    expect(result.rules).toEqual([]);
  });

  it('parses top-level declarations', () => {
    const css = `
      body {
        font-size: 1rem;
        line-height: 1.5;
      }
    `;
    const { declarations, rules } = parseCSS(css);
    expect(rules).toHaveLength(1);
    expect(rules[0].selector).toBe('body');
    expect(declarations).toHaveLength(2);
    expect(declarations[0].property).toBe('font-size');
    expect(declarations[0].value).toBe('1rem');
    expect(declarations[0].mediaCondition).toBeNull();
  });

  it('parses media queries', () => {
    const css = `
      @media (min-width: 48rem) {
        .sidebar {
          transform: translateX(0);
        }
      }
    `;
    const { mediaQueries, rules } = parseCSS(css);
    expect(mediaQueries).toHaveLength(1);
    expect(mediaQueries[0].condition).toBe('(min-width: 48rem)');
    expect(rules).toHaveLength(1);
    expect(rules[0].mediaCondition).toBe('(min-width: 48rem)');
  });

  it('strips CSS comments before parsing', () => {
    const css = `
      /* This is a comment */
      html {
        /* another comment */
        font-size: 1rem;
      }
    `;
    const { declarations } = parseCSS(css);
    expect(declarations).toHaveLength(1);
    expect(declarations[0].property).toBe('font-size');
  });

  it('returns mediaCondition null for top-level rules', () => {
    const css = `.card { padding: 1rem; }`;
    const { declarations } = parseCSS(css);
    expect(declarations[0].mediaCondition).toBeNull();
  });

  it('attaches mediaCondition to declarations inside media queries', () => {
    const css = `
      @media (min-width: 64rem) {
        .main-wrapper { margin-left: 15rem; }
      }
    `;
    const { declarations } = parseCSS(css);
    expect(declarations[0].mediaCondition).toBe('(min-width: 64rem)');
  });
});
