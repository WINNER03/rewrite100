# Rewrite100: how problems.js was built from your file

**Result:** 84 unique problems. Every reference solution passed test cases, and so did the comment-free drill version of each one.

## What each problem contains
| Field | Source |
|---|---|
| `solution` | Your code as written, including your comments. Shown on the left. |
| `drill` | The same code with comments removed, using a real JS parser. This is what you retype. |
| `statement`, `steps`, `time`, `space` | Your comment blocks. |
| `difficulty`, `pattern` | Added by me. |

## Code fixes (4 problems; everything else is untouched)
1. **Meeting Rooms II**: `starts[start hi]` → `starts[start]`. It was a syntax error.
2. **Binary Tree Level Order Traversal**: `let level = []` was outside the `while` loop, so every level shared one array. Output was `[[3,9,20,15,7], …]` instead of `[[3],[9,20],[15,7]]`. Moved it inside the loop.
3. **Subtree of Another Tree**: `isSubtree` was missing its closing `}`, so `isSame` was nested inside it. It still ran because of hoisting. The brace is now in the right place.
4. **Valid Word Abbreviation**: Your version couldn't work. `j` was never declared, `isNaN(abbr)` checked the whole string, the number loop never advanced `j` (an infinite loop), `i` never moved, and `return` was inside the loop. **Rewritten** to follow your own Solution Steps, with your names and structure.

## Left out
- **Your practice attempts**: `twosum`, `contianduplicate`, `megre`, `topkelemetnt`, `p`, and others. Several had bugs.
- **Duplicates**: Merge Intervals (top of file), Valid Palindrome (top), Sudoku Solver (backtracking version at the top; I kept #47), N-Queens (heavily commented copy), and Add Two Numbers (second copy).

## Text I wrote (your file had none for these)
- **Statements:** for most of the unnumbered problems, plus a few numbered ones (Longest Palindromic Substring, Course Schedule II, One Edit Distance).
- **Full steps:** for Longest Repeating Character Replacement and Average of BST Nodes Less Than K.
- **Steps from your inline comments:** for Best Time to Buy and Sell Stock II, Vertical Order Traversal, and Lowest K Request Times.

## Things to know
- **Find Median from Data Stream** uses a `Heap` class your file doesn't define. LeetCode's JS environment doesn't provide one under that name either. It was tested with a small Heap stand-in. This doesn't affect drilling.
- **Implement Trie:** your steps mention a `TrieNode` class, but your code uses plain objects. The code is correct; the steps just describe a different version.
- **Count:** 84, not 100. Add more problems to your file later and rebuild.
