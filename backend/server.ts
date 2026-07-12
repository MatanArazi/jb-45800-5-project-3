import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import mysql from 'mysql2/promise';
import multer, { StorageEngine } from 'multer';
import { createAdminOnly } from './middlewares/admin-only';
import { createRejectAdminLike } from './middlewares/reject-admin-like';
import { createLikesController } from './controllers/likes-controller';
import { createGetStats } from './controllers/stats-controller';
import { createGetVacationLikesCsv, createGetVacationLikesReport } from './controllers/reports-controller';
import { createUsersController } from './controllers/users-controller';
import { createLoginController } from './controllers/auth-controller';
import { createAddReviewController } from './controllers/reviews-controller';
import { createAiRecommendationController, createMcpQueryController } from './controllers/ai-mcp-controller';
import { createVacationsController } from './controllers/vacations-controller';
import { createLikesRouter } from './routers/likes-router';
import { createStatsRouter } from './routers/stats-router';
import { createReportsRouter } from './routers/reports-router';
import { createVacationsRouter } from './routers/vacations-router';
import { createUsersRouter } from './routers/users-router';
import { createAuthRouter } from './routers/auth-router';
import { createReviewsRouter } from './routers/reviews-router';
import { createAiMcpRouter } from './routers/ai-mcp-router';

dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// File uploads: ensure upload directory exists and serve it
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

const storage: StorageEngine = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) =>
    cb(null, Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_')),
});
const upload = multer({ storage });

const MCP_URL = process.env.MCP_URL || 'http://localhost:3005/mcp';

function toDateOnly(value: string): string {
  return new Date(value).toISOString().slice(0, 10);
}

function todayDateOnly(): string {
  return new Date().toISOString().slice(0, 10);
}

function toPublicImageUrl(image: string | null): string | null {
  if (!image) return null;
  if (image.startsWith('http://') || image.startsWith('https://') || image.startsWith('/uploads/')) {
    return image;
  }
  return `/uploads/${image}`;
}

function toStoredImageFilename(image: string | null): string | null {
  if (!image) return null;
  if (image.startsWith('/uploads/')) return image.replace('/uploads/', '');
  return image;
}

function imageFilePathFromStored(image: string | null): string | null {
  if (!image) return null;
  const fileName = image.startsWith('/uploads/') ? image.replace('/uploads/', '') : image;
  return path.join(uploadDir, fileName);
}

async function parseMcpJsonResponse(response: globalThis.Response): Promise<any> {
  const contentType = (response.headers.get('content-type') || '').toLowerCase();

  if (contentType.includes('application/json')) {
    return await response.json();
  }

  if (contentType.includes('text/event-stream')) {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('MCP SSE response body was not readable');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) {
          continue;
        }

        const data = trimmed.slice(5).trim();
        if (!data) {
          continue;
        }

        return JSON.parse(data);
      }
    }

    throw new Error('MCP SSE response ended before JSON data was received');
  }

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Unsupported MCP response content type: ${contentType || 'unknown'}`);
  }
}

async function callMcpDatabaseQuestion(question: string): Promise<string> {
  const initializeResponse = await fetch(MCP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'vacation-website-api',
          version: '1.0.0',
        },
      },
    }),
  });

  if (!initializeResponse.ok) {
    throw new Error(`MCP initialize failed with status ${initializeResponse.status}`);
  }

  const sessionId = initializeResponse.headers.get('mcp-session-id');
  if (!sessionId) {
    throw new Error('MCP session id was not returned by the MCP server');
  }

  await fetch(MCP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'mcp-session-id': sessionId,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'notifications/initialized',
      params: {},
    }),
  });

  const toolResponse = await fetch(MCP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'mcp-session-id': sessionId,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'vacation_database_question',
        arguments: { question },
      },
    }),
  });

  if (!toolResponse.ok) {
    throw new Error(`MCP tool call failed with status ${toolResponse.status}`);
  }

  const payload: any = await parseMcpJsonResponse(toolResponse);
  const text = payload?.result?.content?.find((item: any) => item.type === 'text')?.text;

  if (!text) {
    throw new Error('MCP server returned no text response');
  }

  return text;
}

// Database connection pool
let pool: mysql.Pool;

async function initializePool(): Promise<boolean> {
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'vacation_user',
      password: process.env.DB_PASSWORD || 'userpassword',
      database: process.env.DB_NAME || 'vacation_db',
      port: parseInt(process.env.DB_PORT || '3307'),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
    console.log('✓ Database pool created successfully');
    return true;
  } catch (error: any) {
    console.error('✗ Database connection failed:', error.message);
    return false;
  }
}

const adminOnly: RequestHandler = createAdminOnly(() => pool);
const rejectAdminLike: RequestHandler = createRejectAdminLike(() => pool);
const likesController = createLikesController({
  getPool: () => pool,
  toPublicImageUrl,
});
const vacationsController = createVacationsController(() => pool, {
  toDateOnly,
  todayDateOnly,
  toPublicImageUrl,
  toStoredImageFilename,
  imageFilePathFromStored,
});
const usersController = createUsersController(() => pool);
const loginController = createLoginController(() => pool);
const addReviewController = createAddReviewController(() => pool);
const getStats = createGetStats(() => pool);
const getVacationLikesReport = createGetVacationLikesReport(() => pool);
const getVacationLikesCsv = createGetVacationLikesCsv(() => pool);
const aiRecommendationController = createAiRecommendationController();
const mcpQueryController = createMcpQueryController(callMcpDatabaseQuestion);

app.use('/api', createVacationsRouter(vacationsController, adminOnly, upload));
app.use('/api', createLikesRouter(likesController, rejectAdminLike));
app.use('/api', createUsersRouter(usersController));
app.use('/api', createAuthRouter(loginController));
app.use('/api', createReviewsRouter(addReviewController));
app.use('/api', createStatsRouter(getStats));
app.use('/api', createReportsRouter({ getVacationLikesReport, getVacationLikesCsv }));
app.use('/api', createAiMcpRouter({ aiRecommendation: aiRecommendationController, mcpQuery: mcpQueryController }));

// ==================== STATS / HEALTH ====================

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), database: pool ? 'Connected' : 'Disconnected' });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, error: 'Internal server error', message: err.message });
});

// ==================== SERVER START ====================

const PORT = parseInt(process.env.API_PORT || '5000');

async function startServer(): Promise<void> {
  await initializePool();
  app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║    🏖️  Vacation Website API Server (TypeScript)  🏖️        ║
║                                                            ║
║    Server running on: http://localhost:${PORT}              ║
║    Environment: ${process.env.NODE_ENV || 'development'}
║    Database: ${process.env.DB_NAME || 'vacation_db'}
║    Database Port: ${process.env.DB_PORT || 3307}
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `);
  });
}

startServer();

export default app;
