#!/bin/bash

# =========================================
#  VACATION WEBSITE - SETUP INSTRUCTIONS
# =========================================

cat << "EOF"

╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║         🏖️  VACATION WEBSITE - DATABASE SETUP  🏖️             ║
║                                                                ║
║             Your Docker + MySQL infrastructure                 ║
║                is now ready to use!                            ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝

📦 FILES CREATED:
═══════════════════════════════════════════════════════════════════

✅ CONFIGURATION FILES:
   • docker-compose.yml ......... Orchestrates MySQL container
   • init-db.sql ................ Database schema (auto-executed)
   • .env.example ............... Environment variables template
   • .gitignore ................. Git ignore rules

✅ DOCUMENTATION:
   • README.md .................. Project overview
   • DOCKER_SETUP.md ............ Detailed Docker guide
   • PROJECT_SETUP_SUMMARY.md ... Architecture & explanation
   • QUICK_REFERENCE.md ......... Copy-paste commands
   • SETUP_INSTRUCTIONS.sh ...... This file

✅ UTILITIES:
   • docker-helper.sh ........... Helper script for commands


🚀 24-SECOND QUICK START:
═══════════════════════════════════════════════════════════════════

Step 1: Create .env file (5 sec)
   $ cp .env.example .env

Step 2: Start database (3 sec)
   $ docker-compose up -d

Step 3: Wait for startup (10 sec)
   $ sleep 10

Step 4: Verify it works (6 sec)
   $ docker-compose ps

✓ DONE! Your database is running.


📋 DETAILED INSTRUCTIONS:
═══════════════════════════════════════════════════════════════════

1️⃣  FIRST TIME SETUP (Do this once)
─────────────────────────────────────────

   a) Open terminal/command prompt
   
   b) Navigate to project directory:
      cd /path/to/jb-45800-5-project-3
   
   c) Create .env file from template:
      cp .env.example .env
   
      (Optional: Edit if you want different credentials)
      nano .env     (Linux/Mac)
      code .env     (VS Code)
   
   d) Start the database:
      docker-compose up -d
   
   e) Wait for MySQL to initialize (10-15 seconds)
   
   f) Verify it's running:
      docker-compose ps
      
      You should see:
      NAME              STATUS
      vacation_db       Up X seconds


2️⃣  VERIFY DATABASE WORKS
─────────────────────────────────────────

   a) Connect to MySQL:
      docker exec -it vacation_db mysql -u vacation_user -p vacation_db
   
   b) When prompted for password, type:
      userpassword
   
   c) You should see: mysql>
   
   d) List the tables:
      SHOW TABLES;
   
      Expected output:
      +------------------+
      | Tables_in_vacation_db |
      +------------------+
      | bookings         |
      | likes            |
      | reviews          |
      | users            |
      | vacations        |
      +------------------+
   
   e) Exit MySQL:
      exit


3️⃣  CONNECT YOUR APP (NODE.JS EXAMPLE)
─────────────────────────────────────────

   // In your Node.js app:
   const mysql = require('mysql2/promise');
   
   const connection = await mysql.createConnection({
     host: 'localhost',
     user: 'vacation_user',
     password: 'userpassword',
     database: 'vacation_db',
     port: 3306
   });
   
   // Now you can query!
   const [rows] = await connection.execute('SELECT * FROM vacations');
   console.log(rows);


4️⃣  DAILY USAGE
─────────────────────────────────────────

   Start of day:
   $ docker-compose up -d

   End of day:
   $ docker-compose down


📚 DOCUMENTATION MAP:
═══════════════════════════════════════════════════════════════════

   Need ...                          Read ...
   ─────────────────────────────────────────────────────
   Basic setup instructions?         ➜ README.md
   Docker explained in detail?       ➜ DOCKER_SETUP.md
   Architecture overview?            ➜ PROJECT_SETUP_SUMMARY.md
   Quick commands copy-paste?        ➜ QUICK_REFERENCE.md
   Copy SQL queries?                 ➜ QUICK_REFERENCE.md
   Database schema details?          ➜ init-db.sql


🔐 DATABASE CREDENTIALS:
═══════════════════════════════════════════════════════════════════

   Host:     localhost
   Port:     3306
   Database: vacation_db
   Username: vacation_user
   Password: userpassword
   
   (Edit .env file to change these)


🛠️  HELPFUL COMMANDS:
═══════════════════════════════════════════════════════════════════

   # Start database
   docker-compose up -d

   # Stop database
   docker-compose down

   # Restart database
   docker-compose restart mysql

   # View logs
   docker-compose logs mysql

   # Connect to MySQL CLI
   docker exec -it vacation_db mysql -u vacation_user -p vacation_db

   # View database size
   docker exec vacation_db du -sh /var/lib/mysql

   # Backup database
   docker exec vacation_db mysqldump -u vacation_user -p vacation_db > backup.sql

   # Delete all data and start over
   docker-compose down -v


📊 WHAT'S IN YOUR DATABASE:
═══════════════════════════════════════════════════════════════════

   users
   ├─ Store customer profiles
   ├─ Fields: user_id, first_name, last_name, email, password_hash
   └─ Sample: John Smith (john@example.com)

   vacations ⭐ MAIN TABLE
   ├─ Store vacation packages
   ├─ Fields: vacation_id, title, destination, START_DATE, END_DATE, PRICE
   └─ Sample: "Paris Summer 2024" - $1500 (June 1 - June 15)

   likes
   ├─ Track user's favorite vacations
   ├─ Fields: like_id, user_id, vacation_id
   └─ Example: User 1 likes Vacation 5

   bookings
   ├─ Track reservations
   ├─ Fields: booking_id, user_id, vacation_id, status
   └─ Status: pending, confirmed, cancelled

   reviews
   ├─ Store user ratings/reviews
   ├─ Fields: review_id, user_id, vacation_id, rating (1-5), comment
   └─ Example: "Amazing trip! 5 stars"


❓ COMMON QUESTIONS:
═══════════════════════════════════════════════════════════════════

   Q: Do I have to install MySQL separately?
   A: NO! Docker handles everything. Just run docker-compose up.

   Q: Where is my data stored?
   A: In a Docker volume on your computer. It persists automatically.

   Q: What if I turn off Docker?
   A: Your data stays safe. Run docker-compose up again to access it.

   Q: Can I use localhost:3306 from my app?
   A: YES! That's exactly how you connect.

   Q: Do I need to modify init-db.sql?
   A: Only if you want to change the schema. It runs automatically.

   Q: How do I delete all data and start over?
   A: docker-compose down -v (⚠️ you lose all data!)

   Q: Can I change the password?
   A: YES! Edit .env then run: docker-compose down -v && docker-compose up -d


🎯 YOUR NEXT STEPS:
═══════════════════════════════════════════════════════════════════

   ✓ Database setup ................. COMPLETE ✅

   → 1. Start the database (docker-compose up -d)
   → 2. Create your Node.js/Express API
   → 3. Create your React frontend
   → 4. Connect app to database
   → 5. Add sample vacation data
   → 6. Build like/booking features
   → 7. Deploy! 🚀


💡 TIPS:
═══════════════════════════════════════════════════════════════════

   • Keep .env file safe (contains passwords!)
   • Never commit .env to Git (it's in .gitignore)
   • Database starts automatically with docker-compose up -d
   • Use QUICK_REFERENCE.md as your cheat sheet
   • Read DOCKER_SETUP.md if something doesn't work


📞 TROUBLESHOOTING:
═══════════════════════════════════════════════════════════════════

   Problem: "Connection refused"
   Solution: Is Docker running? Check: docker-compose ps

   Problem: "Port 3306 already in use"
   Solution: Change port in .env (DB_PORT=3307)

   Problem: "Tables not found"
   Solution: Wait 15 seconds or run: docker-compose restart mysql

   Problem: "Permission denied"
   Solution: Add your user to docker group (Linux)

   → See DOCKER_SETUP.md for more solutions


═══════════════════════════════════════════════════════════════════

NOW YOU'RE READY! 🎉

Run this command to start:

   $ cp .env.example .env && docker-compose up -d

Then verify:

   $ docker-compose ps

If you see vacation_db running, you're good to go!

═══════════════════════════════════════════════════════════════════

Questions? Check:
  • README.md .................. Overview
  • DOCKER_SETUP.md ............ Detailed guide
  • QUICK_REFERENCE.md ......... Commands
  • PROJECT_SETUP_SUMMARY.md ... Architecture

═══════════════════════════════════════════════════════════════════

Good luck! 🚀

EOF
