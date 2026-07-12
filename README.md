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

