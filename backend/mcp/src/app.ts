import { randomUUID } from 'node:crypto';
import { createMcpExpressApp } from '@modelcontextprotocol/express';
import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';
import { isInitializeRequest } from '@modelcontextprotocol/server';
import config from 'config';
import type { Request, Response } from 'express';
import morgan from 'morgan';
import { createMcpServer } from './server.js';

const port = config.get<number>('app.port');
const name = config.get<string>('app.name');

const app = config.has('app.host')
  ? createMcpExpressApp({ host: config.get<string>('app.host') as '0.0.0.0' })
  : createMcpExpressApp();

app.use(morgan('dev'));

app.get('/health', (_request, response) => {
  response.json({ status: 'ok' });
});

const transports: Record<string, NodeStreamableHTTPServerTransport> = {};

async function mcpPostHandler(request: Request, response: Response) {
  const sessionId = request.headers['mcp-session-id'] as string | undefined;

  try {
    let transport: NodeStreamableHTTPServerTransport;

    if (sessionId && transports[sessionId]) {
      transport = transports[sessionId];
    } else if (!sessionId && isInitializeRequest(request.body)) {
      transport = new NodeStreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id) => {
          transports[id] = transport;
        },
      });

      transport.onclose = () => {
        const id = transport.sessionId;
        if (id && transports[id]) {
          delete transports[id];
        }
      };

      const server = createMcpServer();
      await server.connect(transport);
      await transport.handleRequest(request, response, request.body);
      return;
    } else if (sessionId) {
      response.status(404).json({
        jsonrpc: '2.0',
        error: { code: -32001, message: 'Session not found' },
        id: null,
      });
      return;
    } else {
      response.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Bad Request: No valid session ID provided' },
        id: null,
      });
      return;
    }

    await transport.handleRequest(request, response, request.body);
  } catch (e) {
    console.error('error handling mcp request', e);
    if (!response.headersSent) {
      response.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'internal server error',
        },
        id: null,
      });
    }
  }
}

async function mcpGetHandler(request: Request, response: Response) {
  const sessionId = request.headers['mcp-session-id'] as string | undefined;
  if (!sessionId) {
    response.status(400).send('Missing session ID');
    return;
  }

  const transport = transports[sessionId];
  if (!transport) {
    response.status(404).send('Session not found');
    return;
  }

  await transport.handleRequest(request, response);
}

async function mcpDeleteHandler(request: Request, response: Response) {
  const sessionId = request.headers['mcp-session-id'] as string | undefined;
  if (!sessionId) {
    response.status(400).send('Missing session ID');
    return;
  }

  const transport = transports[sessionId];
  if (!transport) {
    response.status(404).send('Session not found');
    return;
  }

  await transport.handleRequest(request, response);
}

app.post('/mcp', mcpPostHandler);
app.get('/mcp', mcpGetHandler);
app.delete('/mcp', mcpDeleteHandler);

app.listen(port, () => console.log(`app ${name} started on port ${port}....`));

process.on('SIGINT', async () => {
  for (const sessionId in transports) {
    try {
      await transports[sessionId]?.close();
      delete transports[sessionId];
    } catch (e) {
      console.error(`error closing transport for session ${sessionId}`, e);
    }
  }

  process.exit(0);
});

export default app;
