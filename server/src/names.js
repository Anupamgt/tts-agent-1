export function normName(s) {
  return String(s || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normCode(s) {
  return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 2) return 3;
  const rows = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= a.length; j++) rows[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b[i - 1] === a[j - 1] ? 0 : 1;
      rows[i][j] = Math.min(rows[i - 1][j - 1] + cost, rows[i][j - 1] + 1, rows[i - 1][j] + 1);
    }
  }
  return rows[b.length][a.length];
}

// Latin seed names: distance <= 2 when the stored name is at least 5 characters, else exact.
export function namesMatch(spoken, stored) {
  const a = normName(spoken);
  const b = normName(stored);
  if (!a || !b) return false;
  if (a === b) return true;
  if (b.length < 5) return false;
  return levenshtein(a, b) <= 2;
}
