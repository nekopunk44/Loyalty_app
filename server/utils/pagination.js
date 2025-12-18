const MAX_PAGE_LIMIT = 100;

/**
 * Парсит ?limit=N&offset=M из query-строки.
 * Clamps: limit в [1, MAX_PAGE_LIMIT], offset в [0, ∞).
 */
const parsePagination = (query, defaultLimit = 20) => ({
  limit:  Math.min(Math.max(parseInt(query.limit)  || defaultLimit, 1), MAX_PAGE_LIMIT),
  offset: Math.max(parseInt(query.offset) || 0, 0),
});

module.exports = { parsePagination, MAX_PAGE_LIMIT };
