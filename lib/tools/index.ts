import Anthropic from '@anthropic-ai/sdk'

export const TOOL_DEFINITIONS: Anthropic.Tool[] = [
  {
    name: 'search_web',
    description: 'Search the web for current information on a topic using Brave Search.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        limit: { type: 'number', description: 'Max results (default 5)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'save_note',
    description: 'Persist a learning note for the current session.',
    input_schema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Note content to save' },
      },
      required: ['content'],
    },
  },
  {
    name: 'get_progress',
    description: "Retrieve the user's learning history and scores for a topic.",
    input_schema: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: 'Topic name to look up (partial match)' },
      },
      required: ['topic'],
    },
  },
  {
    name: 'generate_quiz',
    description: 'Generate quiz questions on a subtopic. Returns instructions for how to run the quiz interactively.',
    input_schema: {
      type: 'object',
      properties: {
        subtopic: { type: 'string', description: 'The subtopic to quiz on' },
        questionCount: { type: 'number', description: 'Number of questions (3-5)' },
      },
      required: ['subtopic', 'questionCount'],
    },
  },
  {
    name: 'set_music_mood',
    description: 'Change the background music mood. Call this when transitioning between learning phases.',
    input_schema: {
      type: 'object',
      properties: {
        mood: { type: 'string', enum: ['focus', 'chill', 'upbeat', 'ambient'], description: 'Music mood' },
      },
      required: ['mood'],
    },
  },
  {
    name: 'mark_complete',
    description: 'Log that a subtopic is complete with a score.',
    input_schema: {
      type: 'object',
      properties: {
        topicName: { type: 'string', description: 'Name of the completed topic' },
        score: { type: 'number', description: 'Score 0-100 based on quiz performance' },
      },
      required: ['topicName', 'score'],
    },
  },
  {
    name: 'create_flashcard',
    description: 'Push a flashcard to Anki via AnkiConnect. Call after covering an important concept.',
    input_schema: {
      type: 'object',
      properties: {
        front: { type: 'string', description: 'Question or concept on the front of the card' },
        back: { type: 'string', description: 'Answer or explanation on the back' },
      },
      required: ['front', 'back'],
    },
  },
]
