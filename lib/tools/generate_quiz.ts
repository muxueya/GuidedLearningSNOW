export function executeGenerateQuiz(_opts: { subtopic: string; questionCount: number }): { instruction: string } {
  return {
    instruction: `Generate ${_opts.questionCount} quiz questions about "${_opts.subtopic}". Return as JSON array: [{"question": "...", "answer": "...", "type": "short"}]. Present each question to the user one at a time, wait for their answer, then reveal the correct answer before moving to the next.`,
  }
}
