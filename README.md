# 🏖️ Vacation Selling Website

A web application where users can browse vacation packages, add them to favorites (like feature), and make bookings. Built with Node.js, React, TypeScript, and MySQL.

## 📋 Features

- ✅ Browse vacation packages
- ❤️ Like/favorite vacations (social media style)
- 📅 Filter by dates and price
- 🔐 User authentication & profiles
- 📝 Write and read reviews
- 💰 Booking management system
- 🌍 Global pricing in USD
- 👤 Role-based users (`admin` / `user`)
- 🔎 Single-filter pagination workflow (limit + offset)

## 🏗️ Tech Stack

- **Backend**: Node.js + Express.js
- **Frontend**: React + TypeScript
- **Database**: MySQL 8.0
- **Containerization**: Docker & Docker Compose
- **State Management**: Redux/Context API (TBD)

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose installed ([Download here](https://www.docker.com/products/docker-desktop))
- Node.js 16+ (for local development)

### 1. Setup Database

```bash
# Copy environment file
cp .env.example .env

# Start MySQL database in Docker
docker-compose up -d

# Verify it's running
docker-compose ps
```

### 2. Verify Database Connection

```bash
# Connect to MySQL and check tables
docker exec -it vacation_db mysql -u vacation_user -p vacation_db

# List tables (at MySQL prompt)
SHOW TABLES;
exit
```

### 3. Setup Backend (Node.js)

```bash
# Create backend directory
mkdir -p src/backend
cd src/backend

# Initialize Node project
npm init -y
npm install express mysql2 dotenv cors

# Create .env file for backend
cp ../../.env.example .env
```

### 4. Setup Frontend (React)

```bash
# Create React app
npx create-react-app src/frontend --template typescript

# Install dependencies
cd src/frontend
npm install
```

## 📚 Documentation

- **[Docker Setup Guide](./DOCKER_SETUP.md)** - Detailed Docker and database configuration
- **Database Schema** - See init-db.sql for table structures
- **[Environment Variables](./.env.example)** - Configuration template

## 🐳 Docker Commands

### Start Database
```bash
docker-compose up -d
```

### Stop Database
```bash
docker-compose down
```

### View Logs
```bash
docker-compose logs mysql
```

### Connect to Database
```bash
docker exec -it vacation_db mysql -u vacation_user -p vacation_db
```

### Helper Script (Linux/Mac)
```bash
chmod +x docker-helper.sh
./docker-helper.sh help
```

## 📊 Database Schema

### Core Tables:
- **users** - Customer profiles
- **vacations** - Vacation packages (with start_date, end_date, price)
- **likes** - User favorites system
- **bookings** - Vacation reservations
- **reviews** - User ratings and feedback

### Important Project Constraints (Aligned with Course Notes)
- `users.role` is an ENUM with values: `admin`, `user`.
- Initial SQL bootstrap seeds at least 12 vacations, each with an image URL.
- Initial SQL bootstrap seeds one admin account.
- Pagination supports `limit` and `offset` (via `page` + `limit` in API, converted to offset).
- At any given request, only one filter is applied (no stacked filter combinations).

### Default Admin Credentials (Seeded)
- Email: `admin@vacations.local`
- Password: `Admin1234`

See [init-db.sql](./init-db.sql) for complete schema.

## 🔧 Development Workflow

1. Start Docker database: `docker-compose up -d`
2. Connect app to localhost:3306
3. Use credentials from .env file
4. Run migrations/setup as needed
5. Stop when done: `docker-compose down`

## 🛠️ Useful Links

- [Docker Docs](https://docs.docker.com/compose/)
- [MySQL Reference](https://dev.mysql.com/doc/refman/8.0/en/)
- [Express.js Guide](https://expressjs.com/)
- [React Documentation](https://react.dev/)

## 📝 Notes

- Database data persists in Docker volumes
- Credentials are in .env (never commit this file!)
- init-db.sql runs automatically on first start
- Database accessible at localhost:3306
- If MySQL volume already exists, re-seeding requires volume reset:
	- `docker-compose down -v`
	- `docker-compose up -d`

## 🤝 Contributing

This is a learning project. Feel free to modify and extend!

---

**Status**: 🔨 In Development  
**Database**: MySQL 8.0 + Docker  
**Last Updated**: July 11, 2026