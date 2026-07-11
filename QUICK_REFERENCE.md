# 📋 Quick Reference Card

## 🐳 Docker Commands - Copy & Paste

```bash
# Start database
docker-compose up -d

# Stop database
docker-compose down

# Restart database
docker-compose restart mysql

# View status
docker-compose ps

# View logs
docker-compose logs -f mysql

# Connect to MySQL CLI
docker exec -it vacation_db mysql -u vacation_user -p vacation_db

# Delete ALL data (⚠️ careful!)
docker-compose down -v
```

---

## 🗄️ MySQL Commands - Copy & Paste

Once connected with: `docker exec -it vacation_db mysql -u vacation_user -p vacation_db`

```sql
-- Show all tables
SHOW TABLES;

-- Show table structure
DESCRIBE vacations;

-- Count vacations
SELECT COUNT(*) FROM vacations;

-- View all vacations
SELECT * FROM vacations;

-- View likes count per vacation
SELECT v.vacation_id, v.title, COUNT(l.like_id) as likes
FROM vacations v
LEFT JOIN likes l ON v.vacation_id = l.vacation_id
GROUP BY v.vacation_id
ORDER BY likes DESC;

-- Exit
exit
```

---

## 📝 Database Credentials

From `.env` file:

```
Host: localhost
Port: 3306
Database: vacation_db
Username: vacation_user
Password: userpassword
Root Password: rootpassword
```

---

## 🔗 Connection String Examples

### **Node.js (mysql2/promise)**
```javascript
const connection = await mysql.createConnection({
  host: 'localhost',
  user: 'vacation_user',
  password: 'userpassword',
  database: 'vacation_db',
  port: 3306
});
```

### **Node.js (mysql)**
```javascript
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'vacation_user',
  password: 'userpassword',
  database: 'vacation_db'
});
```

### **Python (mysql-connector)**
```python
import mysql.connector

connection = mysql.connector.connect(
  host='localhost',
  user='vacation_user',
  password='userpassword',
  database='vacation_db',
  port=3306
)
```

### **PHP (PDO)**
```php
$pdo = new PDO(
  'mysql:host=localhost;port=3306;dbname=vacation_db',
  'vacation_user',
  'userpassword'
);
```

---

## 📊 Table Quick Reference

### **vacations**
| Field | Type | Notes |
|-------|------|-------|
| vacation_id | INT | Auto-increment PK |
| title | VARCHAR(200) | Vacation name |
| destination | VARCHAR(150) | Where it is |
| **start_date** | DATE | When it starts |
| **end_date** | DATE | When it ends |
| **price** | DECIMAL(10,2) | In USD |
| max_participants | INT | How many can go |
| image_url | VARCHAR(500) | Photo link |
| created_at | TIMESTAMP | Auto-set |

### **likes**
| Field | Type | Notes |
|-------|------|-------|
| like_id | INT | Auto-increment PK |
| user_id | INT | FK to users |
| vacation_id | INT | FK to vacations |
| created_at | TIMESTAMP | Auto-set |

### **users**
| Field | Type | Notes |
|-------|------|-------|
| user_id | INT | Auto-increment PK |
| first_name | VARCHAR(100) | First name |
| last_name | VARCHAR(100) | Last name |
| email | VARCHAR(150) | Unique email |
| password_hash | VARCHAR(255) | Encrypted password |
| created_at | TIMESTAMP | Auto-set |

### **bookings**
| Field | Type | Notes |
|-------|------|-------|
| booking_id | INT | Auto-increment PK |
| user_id | INT | FK to users |
| vacation_id | INT | FK to vacations |
| status | ENUM | pending/confirmed/cancelled |
| created_at | TIMESTAMP | Auto-set |

### **reviews**
| Field | Type | Notes |
|-------|------|-------|
| review_id | INT | Auto-increment PK |
| user_id | INT | FK to users |
| vacation_id | INT | FK to vacations |
| rating | INT | 1-5 stars |
| comment | TEXT | Review text |
| created_at | TIMESTAMP | Auto-set |

---

## 🎯 Common API Queries

```sql
-- Get all vacations with like count
SELECT v.*, COUNT(l.like_id) as total_likes
FROM vacations v
LEFT JOIN likes l ON v.vacation_id = l.vacation_id
GROUP BY v.vacation_id;

-- Get vacations in a date range
SELECT * FROM vacations
WHERE start_date >= '2024-06-01' AND end_date <= '2024-08-31';

-- Get vacations by price range
SELECT * FROM vacations
WHERE price BETWEEN 500 AND 2000
ORDER BY price ASC;

-- Get user's liked vacations
SELECT v.* FROM vacations v
JOIN likes l ON v.vacation_id = l.vacation_id
WHERE l.user_id = 1;

-- Get vacation with reviews
SELECT v.*, r.rating, r.comment, u.first_name, u.last_name
FROM vacations v
LEFT JOIN reviews r ON v.vacation_id = r.vacation_id
LEFT JOIN users u ON r.user_id = u.user_id
WHERE v.vacation_id = 1;

-- Get top-rated vacations
SELECT v.*, AVG(r.rating) as avg_rating, COUNT(r.review_id) as review_count
FROM vacations v
LEFT JOIN reviews r ON v.vacation_id = r.vacation_id
GROUP BY v.vacation_id
ORDER BY avg_rating DESC;

-- Get vacations sorted by likes
SELECT v.*, COUNT(l.like_id) as likes
FROM vacations v
LEFT JOIN likes l ON v.vacation_id = l.vacation_id
GROUP BY v.vacation_id
ORDER BY likes DESC;
```

---

## 🛠️ Troubleshooting Quick Links

| Problem | Solution |
|---------|----------|
| Port 3306 in use | Edit .env: change DB_PORT to 3307 (or higher) |
| Can't connect | Check: docker-compose ps (is it running?) |
| Connection refused | Wait 10 seconds, try again: `docker-compose logs mysql` |
| Tables not created | Delete volume: `docker-compose down -v` then restart |
| Forgot password | Edit .env and `docker-compose down -v` then `docker-compose up -d` |
| Docker not installed | Download: https://www.docker.com/products/docker-desktop |

---

## 📁 File Locations

```
project-3/
├── docker-compose.yml ........... Docker configuration
├── init-db.sql .................. Database schema
├── .env ......................... Credentials (CREATE THIS)
├── .env.example ................. Credentials template
├── .gitignore ................... What to ignore in Git
├── docker-helper.sh ............. Helper script
├── README.md .................... Project overview
├── DOCKER_SETUP.md .............. Docker documentation
├── PROJECT_SETUP_SUMMARY.md ..... This document
└── QUICK_REFERENCE.md ........... Quick commands (this file)
```

---

## ✅ Setup Checklist

```bash
# 1. Copy .env template
cp .env.example .env

# 2. Start database
docker-compose up -d

# 3. Wait 5 seconds
sleep 5

# 4. Verify it's running
docker-compose ps

# 5. Connect and check tables
docker exec -it vacation_db mysql -u vacation_user -p vacation_db

# (At MySQL prompt, type: SHOW TABLES; then exit)
```

---

## 🚀 Next Steps

1. **Connect Your App** - Use credentials above
2. **Add Sample Data** - INSERT INTO vacations VALUES (...)
3. **Build API** - Create backend endpoints
4. **Build Frontend** - Create React components
5. **Test Features** - Like, book, review functionality

---

## 💬 File Guide

| File | What It Does | When To Read |
|------|-------------|-------------|
| README.md | Project overview | Getting started |
| DOCKER_SETUP.md | Docker explained in detail | Understanding Docker |
| PROJECT_SETUP_SUMMARY.md | What was created & why | Understanding architecture |
| QUICK_REFERENCE.md | Commands & credentials | When you need quick info |
| docker-compose.yml | Container configuration | Modifying setup |
| init-db.sql | Database schema | Understanding tables |
| .env.example | Environment template | Creating .env |

---

**Print This!** ➡️ Use this as your cheat sheet while building the project.

**Last Updated**: July 11, 2026  
**Database**: MySQL 8.0 + Docker
