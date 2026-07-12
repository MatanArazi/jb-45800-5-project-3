# Vacation Selling Website

## Overview
Vacation Selling Website is a full-stack application for browsing, liking, and managing vacation packages.

The system supports role-based access (`admin` and `user`), authentication, pagination, filtering, and image-backed vacation cards.

## Tech Stack
- Backend: Node.js, Express, TypeScript
- Frontend: React, TypeScript
- Database: MySQL 8
- Infrastructure: Docker, Docker Compose

## Core Capabilities
- User signup and login
- Role-based authorization (`admin` / `user`)
- Vacation catalog with pagination (`page`, `limit`)
- Single active filter per request (`all`, `liked`, `active`, `future`)
- Likes
- Vacation CRUD for admins
- Vacation images via URL or uploaded files

## Database Notes
- Schema and seed data are defined in `init-db.sql`.
- Seed includes:
  - One admin account
  - A vacation catalog with image URLs (mostly real destinations)

## Admin Credentials (Seeded)
- Email: `admin@vacations.local`
- Password: `Admin1234`

## Repository Notes
- Main backend entry: `backend/server.ts`
- Backend modular structure: `backend/controllers`, `backend/routers`, `backend/middlewares`
- Main frontend entry: `frontend/src/App.tsx`
- Frontend modular structure: `frontend/src/services`, `frontend/src/components/layout`
- Docker definition: `docker-compose.yml`

## Run With Docker
1. Copy `.env.example` to `.env` (optional if defaults are fine).
2. Start all services:

```bash
docker compose up -d --build
```

3. Open the app at `http://localhost:3000`.
4. Backend API is available at `http://localhost:5000`.

This command starts all required containers:
- `mysql` (database)
- `backend` (API)
- `mcp` (MCP service)
- `frontend` (React app)

## Status
- In active development