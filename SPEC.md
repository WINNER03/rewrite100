# Rewrite100 — Spec

A local web app for drilling 100 LeetCode solutions in JavaScript by retyping them.

## Scope: Step 1

Implement everything in this spec. Stop after Step 1.

## Stack

- Vite (vanilla JS, no framework) + `monaco-editor` from npm
- No backend
- No other dependencies without asking (Vitest for tests is OK)

## Layout (desktop)

- Top bar: problem title, difficulty, pattern, prev/next buttons, and an "N/100" counter
- Left pane (read-only): numbered solution steps, then the reference solution in a
  read-only Monaco editor with time/space complexity as comments at the top
- Right pane: an editable Monaco editor where the user retypes the solution
- Draggable divider between panes

## Drill logic

- Compare the user's typing to the reference character by character,
  ignoring whitespace differences
- Highlight the first mismatch in red
- On full match show accuracy %, time taken, and characters per minute
- In the user's editor: disable autocomplete, suggestions, auto-closing
  brackets/quotes, and paste

## Shortcuts

- `Ctrl+Right` / `Ctrl+Left` = next/prev problem
- `Ctrl+R` = reset my editor (prevent browser reload)
- `Ctrl+H` = toggle left pane

## Data

`src/problems.js` exports an array of
`{ id, title, difficulty, pattern, steps[], solution, time, space }`,
seeded with 5 correct, idiomatic JS solutions:

1. Two Sum
2. Valid Parentheses
3. Merge Intervals
4. Binary Tree Level Order Traversal
5. Valid Palindrome II

## Code organization

- Put the comparison logic in a pure module `src/drill.js` with Vitest unit tests.

## Out of scope (later steps)

Saving progress, sidebar, spaced repetition, running code.
