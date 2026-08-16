export const PRODUCT_SEARCH_RESULT_LIMIT = 30;

const SEARCH_FIELDS = [
  "display_name",
  "name",
  "spec",
  "code",
  "major_name",
  "minor_name",
];

function normalizeSearchValue(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("ko-KR")
    .trim()
    .replace(/\s+/g, " ");
}

function searchableFields(product) {
  return SEARCH_FIELDS.map((field) => normalizeSearchValue(product?.[field]));
}

function matchScore(product, query) {
  const fields = searchableFields(product);
  const [displayName = "", name = "", spec = "", code = "", major = "", minor = ""] = fields;
  const haystack = fields.filter(Boolean).join(" ");
  const compactHaystack = haystack.replace(/\s/g, "");
  const compactFields = fields.filter(Boolean).map((field) => field.replace(/\s/g, ""));
  const compactQuery = query.replace(/\s/g, "");
  const terms = query
    .replace(/([\p{L}])(\p{N})/gu, "$1 $2")
    .replace(/(\p{N})([\p{L}])/gu, "$1 $2")
    .split(" ")
    .filter(Boolean);

  const matchesEachTerm = terms.every((term) => (
    haystack.includes(term) || compactHaystack.includes(term.replace(/\s/g, ""))
  ));
  const matchesFieldCombination = compactFields.some((left) => (
    compactFields.some((right) => `${left}${right}`.includes(compactQuery))
  ));
  if (!matchesEachTerm && !matchesFieldCombination) return null;

  if (code === query) return 0;
  if (displayName === query || name === query) return 1;
  if (displayName.startsWith(query) || name.startsWith(query)) return 2;
  if (code.startsWith(query)) return 3;
  if (spec.startsWith(query)) return 4;
  if (major.startsWith(query) || minor.startsWith(query)) return 5;
  return 6;
}

/**
 * Search the live catalog without producing a thousand-node native select.
 * The result count remains available so the UI can explain when it is capped.
 */
export function searchCatalogProducts(catalog, rawQuery, limit = PRODUCT_SEARCH_RESULT_LIMIT) {
  const products = Array.isArray(catalog) ? catalog : [];
  const query = normalizeSearchValue(rawQuery);
  const safeLimit = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : PRODUCT_SEARCH_RESULT_LIMIT;

  if (!query) {
    return {
      items: products.slice(0, safeLimit),
      total: products.length,
    };
  }

  const matches = [];
  products.forEach((product, index) => {
    const score = matchScore(product, query);
    if (score !== null) matches.push({ product, score, index });
  });
  matches.sort((left, right) => left.score - right.score || left.index - right.index);

  return {
    items: matches.slice(0, safeLimit).map(({ product }) => product),
    total: matches.length,
  };
}
