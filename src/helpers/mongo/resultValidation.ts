/**
 * Verify if more than 0 documents have been modified
 */
export function isModified(query: any) {
  return query.nModified > 0;
}

/**
 * Verify if >= :expectedCount of documents have been matched
 */
export function isMatched(query: any, expectedCount = 1) {
  return query.n >= expectedCount;
}
