import { RequestHandler } from 'express';

export function createAiRecommendationController(): RequestHandler {
  return async (req, res) => {
    try {
      const destination = String(req.body?.destination || '').trim();
      if (!destination) {
        res.status(400).json({ success: false, error: 'Destination is required' });
        return;
      }

      const apiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
      if (!apiKey) {
        res.status(503).json({ success: false, error: 'AI provider key is not configured' });
        return;
      }

      const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
      const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          temperature: 0.7,
          max_tokens: 280,
          messages: [
            {
              role: 'system',
              content: 'You are a travel assistant. Provide concise travel recommendations with highlights, best season, and a short practical tip.',
            },
            {
              role: 'user',
              content: `Recommend a vacation plan for: ${destination}. Keep it under 180 words.`,
            },
          ],
        }),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        res.status(502).json({ success: false, error: `AI provider error: ${errText}` });
        return;
      }

      const payload: any = await aiResponse.json();
      const recommendation = payload?.choices?.[0]?.message?.content?.trim();
      if (!recommendation) {
        res.status(502).json({ success: false, error: 'AI provider returned empty content' });
        return;
      }

      res.json({ success: true, destination, recommendation });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };
}

export function createMcpQueryController(callMcpDatabaseQuestion: (question: string) => Promise<string>): RequestHandler {
  return async (req, res) => {
    try {
      const question = String(req.body?.question || '').trim();
      if (!question) {
        res.status(400).json({ success: false, error: 'Question is required' });
        return;
      }

      const answer = await callMcpDatabaseQuestion(question);
      res.json({ success: true, answer, via: 'mcp' });
    } catch (error: any) {
      res.status(502).json({ success: false, error: `MCP server unavailable: ${error.message}` });
    }
  };
}
