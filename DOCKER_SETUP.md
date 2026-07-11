# Vacation Website - Docker Setup Guide

## 📋 Project Overview

This is a vacation selling website where users can:
- Browse vacation packages
- "Like" vacations (similar to social media)
- Book vacations
- Leave reviews

**Key Features:**
- Start and end dates for each vacation
- Price in USD
- Like/favorite system
- User authentication
- Booking management

---

## 🐳 Docker Architecture

### What is Docker?
Docker allows us to run MySQL in an isolated container on your machine - like a separate computer running just the database.

### Components:
1. **MySQL Container** - Database runs here
2. **Volume** - Persists data (doesn't get deleted when container stops)
3. **Network** - Allows your app to communicate with the database

### File Structure:
```
project-3/
├── docker-compose.yml      # Orchestrates Docker containers
├── init-db.sql            # Database schema (tables, relationships)
├── .env.example           # Environment variables template
├── .env                   # Your actual credentials (CREATE THIS)
├── src/                   # Your application code
└── ...
```

---

## 🚀 Quick Start

### Step 1: Install Docker & Docker Compose
- **Windows/Mac**: Download [Docker Desktop](https://www.docker.com/products/docker-desktop)
- **Linux**: Install Docker and Docker Compose via package manager

### Step 2: Create Your .env File
```bash
# Copy the example file
cp .env.example .env

# Edit .env with your desired credentials (or keep defaults)
nano .env
```

### Step 3: Start the Database
```bash
# Navigate to project directory
cd /path/to/jb-45800-5-project-3

# Start MySQL in Docker
docker-compose up -d

# View logs (check if it's running)
docker-compose logs mysql

# You should see: "ready for connections"
```

### Step 4: Verify Connection
```bash
# Connect to the database
docker exec -it vacation_db mysql -u vacation_user -p vacation_db

# When prompted for password, enter: userpassword

# View the tables (in MySQL CLI)
SHOW TABLES;

# Exit MySQL
exit
```

---

## 📊 Database Schema

### Tables Created:

#### **users**
- Stores customer information
- Fields: user_id, first_name, last_name, email, password_hash, created_at

#### **vacations** ⭐ (Main Table)
- Vacation packages offered
- Fields: vacation_id, title, description, destination, **start_date**, **end_date**, **price**, image_url, created_at

#### **likes** (Social Feature)
- Tracks which users liked which vacations
- Creates many-to-many relationship
- Fields: like_id, user_id, vacation_id, created_at

#### **bookings**
- Tracks vacation reservations
- Fields: booking_id, user_id, vacation_id, status, created_at

#### **reviews**
- User feedback on vacations
- Fields: review_id, user_id, vacation_id, rating (1-5), comment

---

## 🔧 Common Docker Commands

### Start the database
```bash
docker-compose up -d
```

### Stop the database
```bash
docker-compose down
```

### View running containers
```bash
docker-compose ps
```

### View database logs
```bash
docker-compose logs mysql
```

### Connect to MySQL CLI
```bash
docker exec -it vacation_db mysql -u vacation_user -p vacation_db
```

### Restart the database
```bash
docker-compose restart mysql
```

### Remove everything (INCLUDING DATA!)
```bash
docker-compose down -v
```

---

## 🔐 Security Notes

⚠️ **For Development Only:**
- Default credentials are simple (change in .env)
- Database exposed on localhost:3306
- Not suitable for production

**For Production:**
- Use strong passwords
- Don't commit .env file to Git
- Use environment-specific configurations
- Enable SSL/TLS

---

## 📝 How It Works (Explained)

### When you run `docker-compose up -d`:

1. **Docker pulls MySQL image** - Downloads the official MySQL 8.0 container
2. **Creates container** - Sets up isolated environment with proper settings
3. **Mounts volume** - Creates persistent storage for your data
4. **Runs init script** - Executes init-db.sql to create all tables
5. **Exposes port** - Makes MySQL accessible at localhost:3306
6. **Health check** - Verifies MySQL is ready to accept connections

### Data Flow:
```
Your App → Localhost:3306 → Docker Network → Container → MySQL Process → Volume Storage
```

---

## 🛠️ Connecting Your App

### Node.js Example:
```javascript
const mysql = require('mysql2/promise');

const connection = await mysql.createConnection({
  host: 'localhost',
  user: 'vacation_user',
  password: 'userpassword',
  database: 'vacation_db',
  port: 3306
});
```

### React (via API):
```javascript
fetch('http://localhost:5000/api/vacations')
  .then(res => res.json())
  .then(data => console.log(data));
```

---

## 📚 Database Relationships (ERD)

```
users
  ↓ (1:N)
vacations ← ← ← likes ← ← ← users (N:N relationship)
  ↓ (1:N)           ↓ (1:N)
bookings ← ← ← ← ← users
  ↓ (1:N)
reviews ← ← ← users
```

---

## ❓ Troubleshooting

### "Port 3306 already in use"
```bash
# Change port in docker-compose.yml or .env
# Then restart: docker-compose down && docker-compose up -d
```

### "Connection refused"
```bash
# Check if container is running
docker-compose ps

# Check logs for errors
docker-compose logs mysql
```

### "Permission denied"
- Run docker commands with `sudo` on Linux
- Or [add your user to docker group](https://docs.docker.com/engine/install/linux-postinstall/)

### "Cannot create database"
- Delete volume: `docker-compose down -v`
- Restart: `docker-compose up -d`

---

## 📖 Next Steps

1. **Create Node.js API** - Connect to this database
2. **Create React Frontend** - Display vacations and like feature
3. **Implement Authentication** - User login/signup
4. **Add Business Logic** - Handle bookings, calculate totals

---

## 🔗 Useful Resources

- [Docker Documentation](https://docs.docker.com/compose/)
- [MySQL Reference](https://dev.mysql.com/doc/refman/8.0/en/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop)

---

**Created**: July 11, 2026  
**Project**: Vacation Selling Website  
**Database**: MySQL 8.0  
**Status**: Ready for development
