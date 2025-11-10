// services/tokenBlacklist.js
const tokenBlacklist = new Set();

function addToken(token) {
  tokenBlacklist.add(token);
}

function isTokenBlacklisted(token) {
  return tokenBlacklist.has(token);
}

module.exports = { addToken, isTokenBlacklisted };
