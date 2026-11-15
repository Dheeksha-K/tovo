// Checks that an id from the URL is a positive whole number
function isValidId(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0;
}

module.exports = { isValidId };