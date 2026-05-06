/**
 * CSS Parser helper for responsive design property-based tests.
 * Parses a CSS string and returns structured data about media queries,
 * declarations, and rules.
 *
 * @param {string} cssString - Raw CSS content as a string
 * @returns {{ mediaQueries: MediaQuery[], declarations: Declaration[], rules: Rule[] }}
 */

/**
 * @typedef {Object} MediaQuery
 * @property {string} condition - The media query condition (e.g. "(min-width: 48rem)")
 * @property {string} body - The CSS rules inside the media query block
 */

/**
 * @typedef {Object} Declaration
 * @property {string} property - CSS property name (e.g. "font-size")
 * @property {string} value - CSS property value (e.g. "1rem")
 * @property {string} selector - The selector this declaration belongs to
 * @property {string|null} mediaCondition - The media query condition, or null if top-level
 */

/**
 * @typedef {Object} Rule
 * @property {string} selector - CSS selector string
 * @property {Declaration[]} declarations - Declarations within this rule
 * @property {string|null} mediaCondition - The media query condition, or null if top-level
 */

/**
 * Strips CSS comments from a string.
 * @param {string} css
 * @returns {string}
 */
function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * Extracts all @media blocks from a CSS string.
 * @param {string} css
 * @returns {MediaQuery[]}
 */
function extractMediaQueries(css) {
  const mediaQueries = [];
  // Match @media ... { ... } — handles nested braces
  const mediaRegex = /@media\s+([^{]+)\{/g;
  let match;

  while ((match = mediaRegex.exec(css)) !== null) {
    const condition = match[1].trim();
    const startIndex = match.index + match[0].length;

    // Find the matching closing brace by counting brace depth
    let depth = 1;
    let i = startIndex;
    while (i < css.length && depth > 0) {
      if (css[i] === '{') depth++;
      else if (css[i] === '}') depth--;
      i++;
    }

    const body = css.slice(startIndex, i - 1).trim();
    mediaQueries.push({ condition, body });
  }

  return mediaQueries;
}

/**
 * Parses individual CSS rules from a block of CSS text (no nested @media).
 * @param {string} cssBlock - CSS text without @media wrappers
 * @param {string|null} mediaCondition - The enclosing media condition, or null
 * @returns {Rule[]}
 */
function parseRulesFromBlock(cssBlock, mediaCondition) {
  const rules = [];
  // Match selector { declarations }
  const ruleRegex = /([^{@]+)\{([^}]*)\}/g;
  let match;

  while ((match = ruleRegex.exec(cssBlock)) !== null) {
    const selector = match[1].trim();
    const declarationsBlock = match[2].trim();

    if (!selector || !declarationsBlock) continue;

    const declarations = parseDeclarations(declarationsBlock, selector, mediaCondition);
    rules.push({ selector, declarations, mediaCondition: mediaCondition || null });
  }

  return rules;
}

/**
 * Parses individual declarations from a declarations block.
 * @param {string} block - e.g. "font-size: 1rem; color: red;"
 * @param {string} selector
 * @param {string|null} mediaCondition
 * @returns {Declaration[]}
 */
function parseDeclarations(block, selector, mediaCondition) {
  const declarations = [];
  const lines = block.split(';');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;

    const property = trimmed.slice(0, colonIndex).trim();
    const value = trimmed.slice(colonIndex + 1).trim();

    if (property && value) {
      declarations.push({
        property,
        value,
        selector,
        mediaCondition: mediaCondition || null,
      });
    }
  }

  return declarations;
}

/**
 * Parses a CSS string into structured data.
 *
 * @param {string} cssString - Raw CSS content
 * @returns {{ mediaQueries: MediaQuery[], declarations: Declaration[], rules: Rule[] }}
 */
export function parseCSS(cssString) {
  const cleaned = stripComments(cssString);

  // Extract media queries
  const mediaQueries = extractMediaQueries(cleaned);

  // Remove @media blocks to get top-level CSS
  const topLevelCSS = cleaned.replace(/@media\s+[^{]+\{[\s\S]*?\}/g, (match) => {
    // Replace with empty string — we handle nested content separately
    return '';
  });

  // Parse top-level rules
  const topLevelRules = parseRulesFromBlock(topLevelCSS, null);

  // Parse rules inside each media query
  const mediaRules = mediaQueries.flatMap((mq) =>
    parseRulesFromBlock(mq.body, mq.condition)
  );

  const allRules = [...topLevelRules, ...mediaRules];
  const allDeclarations = allRules.flatMap((r) => r.declarations);

  return {
    mediaQueries,
    declarations: allDeclarations,
    rules: allRules,
  };
}
