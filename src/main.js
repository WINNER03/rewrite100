import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import './style.css';
import { problems } from './problems.js';
import { buildHeader } from './header.js';
import { compare, stripWhitespace, calcAccuracy, computeCpm, formatTime } from './drill.js';
import {
  loadDraft,
  saveDraft,
  clearDraft,
  loadLastProblemId,
  saveLastProblemId,
  loadIncludeBonus,
  saveIncludeBonus,
  recordCompletion,
} from './storage.js';

self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === 'typescript' || label === 'javascript') return new tsWorker();
    return new editorWorker();
  },
};

const $ = (id) => document.getElementById(id);
const titleEl = $('problemTitle');
const difficultyEl = $('difficultyBadge');
const patternEl = $('patternTag');
const counterEl = $('counter');
const stepsEl = $('steps');
const statementEl = $('statement');
const complexityEl = $('complexity');
const noteBox = $('noteBox');
const authorBadge = $('authorBadge');
const bonusCheckbox = $('bonusCheckbox');
const bonusLabel = $('bonusLabel');
const statsEl = $('stats');
const prevBtn = $('prevBtn');
const nextBtn = $('nextBtn');
const resetBtn = $('resetBtn');
const toggleBtn = $('toggleBtn');
const leftPane = $('leftPane');
const divider = $('divider');

const refEditor = monaco.editor.create($('refEditor'), {
  language: 'javascript',
  theme: 'vs-dark',
  readOnly: true,
  minimap: { enabled: false },
  automaticLayout: true,
  scrollBeyondLastLine: false,
});

const userEditor = monaco.editor.create($('userEditor'), {
  language: 'javascript',
  theme: 'vs-dark',
  minimap: { enabled: false },
  automaticLayout: true,
  scrollBeyondLastLine: false,
  // Drill mode: auto-closing and indent on, all suggestions off.
  quickSuggestions: false,
  suggestOnTriggerCharacters: false,
  wordBasedSuggestions: 'off',
  acceptSuggestionOnEnter: 'off',
  tabCompletion: 'off',
  parameterHints: { enabled: false },
  inlineSuggest: { enabled: false },
  autoClosingBrackets: 'always',
  autoClosingQuotes: 'always',
  autoClosingOvertype: 'always',
  autoClosingDelete: 'never',
  autoSurround: 'languageDefined',
  autoIndent: 'full',
});

// Disable paste in the drill editor.
userEditor.getDomNode().addEventListener(
  'paste',
  (e) => {
    e.preventDefault();
    e.stopPropagation();
  },
  true
);
userEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV, () => {});

// Handle for automated verification probes (read-only use).
window.__rewrite100 = { userEditor };

let currentIndex = 0;
let includeBonus = false;
const visibleProblems = () =>
  includeBonus ? problems : problems.filter((p) => p.group === 'core');
const currentProblem = () => visibleProblems()[currentIndex];
let startTime = null;
let mistakeCount = 0;
let totalKeystrokes = 0;
let lastClean = true;
let completed = false;
let mismatchDecorations = [];
let ticker = null;
let draftTimer = null;
let suppressDraftSave = false;

function saveDraftNow() {
  if (draftTimer !== null) {
    clearTimeout(draftTimer);
    draftTimer = null;
  }
  const problem = currentProblem();
  if (problem) saveDraft(problem.id, userEditor.getValue());
}

function scheduleDraftSave() {
  if (suppressDraftSave) return;
  if (draftTimer !== null) clearTimeout(draftTimer);
  const problem = currentProblem();
  if (!problem) return;
  const id = problem.id;
  draftTimer = setTimeout(() => {
    draftTimer = null;
    saveDraft(id, userEditor.getValue());
  }, 500);
}

function flushDraftSave() {
  if (draftTimer !== null) saveDraftNow();
}

function clearMismatch() {
  mismatchDecorations = userEditor.deltaDecorations(mismatchDecorations, []);
}

function showMismatch(offset) {
  const model = userEditor.getModel();
  const start = model.getPositionAt(Math.min(offset, model.getValueLength()));
  const end =
    offset < model.getValueLength()
      ? model.getPositionAt(offset + 1)
      : start;
  // Zero-width at end of text still needs a visible range: underline the last char.
  const range =
    start.equals(end) && offset > 0
      ? new monaco.Range(start.lineNumber, Math.max(1, start.column - 1), start.lineNumber, start.column)
      : new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column);
  mismatchDecorations = userEditor.deltaDecorations(mismatchDecorations, [
    { range, options: { inlineClassName: 'mismatch-highlight' } },
  ]);
}

let headerZoneId = null;

// Locked header above the typing area. A view zone is outside the editor
// text, so it never affects the drill comparison.
function setHeader(problem) {
  const text = buildHeader(problem);
  userEditor.changeViewZones((accessor) => {
    if (headerZoneId !== null) accessor.removeZone(headerZoneId);
    const domNode = document.createElement('div');
    domNode.className = 'drill-header-zone';
    domNode.textContent = text;
    domNode.style.fontSize = `${userEditor.getOption(monaco.editor.EditorOption.fontSize)}px`;
    domNode.style.fontFamily = userEditor.getOption(monaco.editor.EditorOption.fontFamily);
    domNode.style.lineHeight = `${userEditor.getOption(monaco.editor.EditorOption.lineHeight)}px`;
    headerZoneId = accessor.addZone({
      afterLineNumber: 0,
      heightInLines: text.split('\n').length,
      domNode,
    });
  });
}

function elapsedMs() {
  return startTime === null ? 0 : Date.now() - startTime;
}

function liveStats(problem, result) {
  statsEl.classList.remove('complete');
  statsEl.textContent =
    totalKeystrokes === 0 && result.typedLength === 0
      ? 'Start typing to begin.'
      : `${result.matchedCount}/${result.refLength} chars • ${formatTime(elapsedMs())}`;
}

function finalStats(problem, result) {
  const ms = elapsedMs();
  const accuracy = calcAccuracy(mistakeCount, totalKeystrokes);
  const cpm = Math.round(computeCpm(result.refLength, ms));
  statsEl.classList.add('complete');
  statsEl.textContent =
    `Matched! Accuracy ${accuracy.toFixed(1)}% • Time ${formatTime(ms)} • ${cpm} CPM`;
}

function stopTicker() {
  if (ticker !== null) {
    clearInterval(ticker);
    ticker = null;
  }
}

function resetDrillState() {
  startTime = null;
  mistakeCount = 0;
  totalKeystrokes = 0;
  lastClean = true;
  completed = false;
  stopTicker();
  clearMismatch();
}

function loadProblem(index) {
  flushDraftSave();
  const visible = visibleProblems();
  currentIndex = Math.max(0, Math.min(visible.length - 1, index));
  const problem = visible[currentIndex];

  titleEl.textContent = problem.title;
  difficultyEl.textContent = problem.difficulty;
  difficultyEl.className = problem.difficulty.toLowerCase();
  patternEl.textContent = problem.pattern;
  authorBadge.hidden = problem.author !== 'claude';
  counterEl.textContent = `${currentIndex + 1}/${visible.length}`;

  statementEl.textContent = problem.statement;

  stepsEl.innerHTML = '';
  for (const step of problem.steps) {
    const li = document.createElement('li');
    li.textContent = step;
    stepsEl.appendChild(li);
  }

  complexityEl.textContent = `Time: ${problem.time} · Space: ${problem.space}`;

  refEditor.setValue(problem.solution);

  if (problem.note) {
    noteBox.textContent = problem.note;
    noteBox.hidden = false;
  } else {
    noteBox.hidden = true;
  }

  suppressDraftSave = true;
  try {
    userEditor.setValue(loadDraft(problem.id) ?? '');
  } finally {
    suppressDraftSave = false;
  }
  setHeader(problem);
  resetDrillState();
  statsEl.classList.remove('complete');
  statsEl.textContent = 'Start typing to begin.';

  saveLastProblemId(problem.id);
  prevBtn.disabled = currentIndex === 0;
  nextBtn.disabled = currentIndex === visible.length - 1;
  userEditor.focus();
}

function resetEditor() {
  if (draftTimer !== null) {
    clearTimeout(draftTimer);
    draftTimer = null;
  }
  const problem = currentProblem();
  if (problem) clearDraft(problem.id);
  suppressDraftSave = true;
  try {
    userEditor.setValue('');
  } finally {
    suppressDraftSave = false;
  }
  resetDrillState();
  statsEl.classList.remove('complete');
  statsEl.textContent = 'Start typing to begin.';
  userEditor.focus();
}

function toggleLeftPane() {
  leftPane.classList.toggle('hidden');
  toggleBtn.textContent = leftPane.classList.contains('hidden') ? 'Show ref' : 'Hide ref';
}

userEditor.onDidChangeModelContent((event) => {
  scheduleDraftSave();
  if (completed) return;
  const problem = currentProblem();

  if (startTime === null) {
    startTime = Date.now();
    stopTicker();
    ticker = setInterval(() => {
      if (!completed) {
        const r = compare(problem.drill, userEditor.getValue());
        liveStats(problem, r);
      }
    }, 1000);
  }

  let added = 0;
  for (const change of event.changes) {
    added += stripWhitespace(change.text).length;
  }
  totalKeystrokes += added;

  const result = compare(problem.drill, userEditor.getValue());
  if (added > 0 && lastClean && result.firstMismatch !== null) {
    mistakeCount += 1;
  }
  lastClean = result.firstMismatch === null;

  clearMismatch();
  if (result.firstMismatch !== null) {
    showMismatch(result.firstMismatch.typedOffset);
    liveStats(problem, result);
  } else if (result.isMatch) {
    completed = true;
    stopTicker();
    saveDraftNow();
    recordCompletion(problem.id, {
      accuracy: calcAccuracy(mistakeCount, totalKeystrokes),
      timeMs: elapsedMs(),
    });
    finalStats(problem, result);
  } else {
    liveStats(problem, result);
  }
});

prevBtn.addEventListener('click', () => loadProblem(currentIndex - 1));
nextBtn.addEventListener('click', () => loadProblem(currentIndex + 1));
resetBtn.addEventListener('click', resetEditor);
toggleBtn.addEventListener('click', toggleLeftPane);

bonusLabel.textContent = `Include bonus (${problems.filter((p) => p.group === 'bonus').length})`;
bonusCheckbox.addEventListener('change', () => {
  includeBonus = bonusCheckbox.checked;
  saveIncludeBonus(includeBonus);
  const id = currentProblem().id;
  const kept = visibleProblems().findIndex((p) => p.id === id);
  loadProblem(kept === -1 ? 0 : kept);
});

window.addEventListener(
  'keydown',
  (e) => {
    if (!e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      e.stopPropagation();
      loadProblem(currentIndex + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      e.stopPropagation();
      loadProblem(currentIndex - 1);
    } else if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      e.stopPropagation();
      if (!e.repeat) resetEditor();
    } else if (e.key === 'h' || e.key === 'H') {
      e.preventDefault();
      e.stopPropagation();
      if (!e.repeat) toggleLeftPane();
    }
  },
  true
);

// Draggable divider.
divider.addEventListener('mousedown', (e) => {
  e.preventDefault();
  divider.classList.add('dragging');
  const onMove = (moveEvent) => {
    const splitRect = $('split').getBoundingClientRect();
    const width = Math.max(
      200,
      Math.min(splitRect.width - 200, moveEvent.clientX - splitRect.left)
    );
    leftPane.style.width = `${width}px`;
  };
  const onUp = () => {
    divider.classList.remove('dragging');
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
  };
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
});

const restoredBonus = loadIncludeBonus();
if (restoredBonus !== null) {
  includeBonus = restoredBonus;
  bonusCheckbox.checked = restoredBonus;
}
let initialIndex = 0;
const lastId = loadLastProblemId();
if (lastId !== null && lastId !== undefined) {
  const found = visibleProblems().findIndex(
    (p) => p.id === lastId || String(p.id) === String(lastId)
  );
  if (found !== -1) initialIndex = found;
}
loadProblem(initialIndex);
