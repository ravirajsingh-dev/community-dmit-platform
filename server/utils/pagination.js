/**
 * Pagination Utilities for Team APIs
 *
 * Standard params: page (1-based), limit (default 20, max 100)
 * Sanitizes and returns: skip, limit, page for MongoDB queries.
 */

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Parse and sanitize pagination params from query
 * @param {Object} query - req.query
 * @returns {{ page: number, limit: number, skip: number }}
 */
function parsePaginationParams(query = {}) {
  let page = Math.max(1, parseInt(query.page, 10) || 1);
  let limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(query.limit, 10) || DEFAULT_LIMIT)
  );
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

/**
 * Build pagination meta for response
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {number} totalCount - Total matching documents
 * @returns {{ page, limit, totalCount, totalPages }}
 */
function buildPaginationMeta(page, limit, totalCount) {
  return {
    page,
    limit,
    totalCount,
    totalPages: Math.ceil(totalCount / limit) || 1,
  };
}

module.exports = {
  parsePaginationParams,
  buildPaginationMeta,
  DEFAULT_LIMIT,
  MAX_LIMIT,
};
