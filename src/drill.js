// Pure comparison + stats logic for the Rewrite100 retyping drill.
// Comparison ignores whitespace differences: both strings are compared as
// their sequences of non-whitespace characters.

export function stripWhitespace(s) {
  return s.replace(/\s/g, '');
}

// Map each index of the whitespace-stripped string back to the index of the
// same character in the original string.
export function strippedIndexMap(s) {
  const map = [];
  for (let i = 0; i < s.length; i++) {
    if (!/\s/.test(s[i])) map.push(i);
  }
  return map;
}

// Compare `typed` against `reference` character by character, ignoring
// whitespace differences.
//
// Returns:
//   {
//     isMatch,            // true when the non-whitespace sequences are equal
//     firstMismatch,      // null when typed is a correct (possibly partial) prefix;
//                          // otherwise { expected, actual, typedOffset } where
//                          // typedOffset is the offset in the ORIGINAL typed string
//                          // (typed.length when the user typed extra chars past the end)
//     matchedCount,       // number of leading non-whitespace chars that match
//     refLength,          // non-whitespace length of reference
//     typedLength,        // non-whitespace length of typed
//   }
export function compare(reference, typed) {
  const ref = stripWhitespace(reference);
  const t = stripWhitespace(typed);
  const typedMap = strippedIndexMap(typed);

  let matchedCount = 0;
  while (
    matchedCount < t.length &&
    matchedCount < ref.length &&
    t[matchedCount] === ref[matchedCount]
  ) {
    matchedCount++;
  }

  const isMatch = matchedCount === ref.length && t.length === ref.length;
  let firstMismatch = null;
  if (!isMatch && !(matchedCount === t.length && t.length < ref.length)) {
    firstMismatch = {
      expected: matchedCount < ref.length ? ref[matchedCount] : null,
      actual: matchedCount < t.length ? t[matchedCount] : null,
      typedOffset:
        matchedCount < typedMap.length ? typedMap[matchedCount] : typed.length,
    };
  }
  return {
    isMatch,
    firstMismatch,
    matchedCount,
    refLength: ref.length,
    typedLength: t.length,
  };
}

// accuracy: fraction of typed characters that were correct keystrokes.
// `mistakes` = number of keystrokes that introduced a mismatch,
// `totalKeystrokes` = total content-adding keystrokes (non-whitespace).
export function calcAccuracy(mistakes, totalKeystrokes) {
  if (totalKeystrokes <= 0) return 100;
  return Math.max(0, ((totalKeystrokes - mistakes) / totalKeystrokes) * 100);
}

// Characters (non-whitespace) per minute.
export function computeCpm(charCount, elapsedMs) {
  if (elapsedMs <= 0 || charCount <= 0) return 0;
  return (charCount / (elapsedMs / 60000));
}

export function formatTime(elapsedMs) {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
