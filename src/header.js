// Pure builder for the read-only drill header shown above the typing area.
// Rendered in a Monaco view zone; never part of the editor text.
export function buildHeader(problem) {
  const lines = [
    '/*',
    `${problem.id}. ${problem.title}`,
    `Problem Statement: ${problem.statement}`,
    'Solution Steps:',
    ...problem.steps.map((step, i) => `${i + 1}. ${step}`),
    `Time: ${problem.time} | Space: ${problem.space}`,
    '*/',
  ];
  return lines.join('\n');
}
