import type { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod';
import { answerDatabaseQuestion } from '../services/database-question.js';

export function registerDatabaseQuestionTool(server: McpServer) {
  server.registerTool(
    'vacation_database_question',
    {
      description: 'Answers vacation database questions such as active vacation count, average prices, and future European vacations.',
      inputSchema: z.object({
        question: z.string().min(1),
      }),
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ question }) => {
      const result = await answerDatabaseQuestion(question);

      return {
        content: [
          { type: 'text', text: result.answer },
        ],
      };
    }
  );
}
