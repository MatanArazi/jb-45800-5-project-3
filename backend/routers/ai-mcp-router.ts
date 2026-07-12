import { Router, RequestHandler } from 'express';

interface AiMcpHandlers {
  aiRecommendation: RequestHandler;
  mcpQuery: RequestHandler;
}

export function createAiMcpRouter(handlers: AiMcpHandlers): Router {
  const router = Router();
  router.post('/ai/recommendation', handlers.aiRecommendation);
  router.post('/mcp/query', handlers.mcpQuery);
  return router;
}
