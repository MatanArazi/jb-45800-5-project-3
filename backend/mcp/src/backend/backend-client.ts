export async function getVacationsSummary(question: string): Promise<string> {
  const normalized = question.trim().toLowerCase();

  if (normalized.includes('how many') && (normalized.includes('active') || normalized.includes('rn'))) {
    return 'Ask the backend MCP database route for the active vacations count.';
  }

  if ((normalized.includes('average') || normalized.includes('avg')) && normalized.includes('price')) {
    return 'Ask the backend MCP database route for the average vacation price.';
  }

  if ((normalized.includes('future') || normalized.includes('upcoming')) && (normalized.includes('europe') || normalized.includes('european'))) {
    return 'Ask the backend MCP database route for future European vacations.';
  }

  return 'Unsupported question.';
}
