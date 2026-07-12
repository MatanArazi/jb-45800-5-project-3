import { McpServer } from '@modelcontextprotocol/server';
import { registerDatabaseQuestionTool } from './tools/database-question.js';

export function createMcpServer() {
  const server = new McpServer(
    {
      name: 'vacation-mcp-server',
      version: '1.0.0',
    },
    {
      instructions: 'Tools for querying the vacation database. Use the database question tool for active count, average price, and future Europe vacations.',
    }
  );

  registerDatabaseQuestionTool(server);

  return server;
}
