# PostgreSQL Database Setup (sagor_db)

This document provides comprehensive instructions for setting up the PostgreSQL database `sagor_db` for the B2B Ecommerce Frontend application.

## 📋 Prerequisites

1. **PostgreSQL Installation**
   - Install PostgreSQL on your system
   - Ensure PostgreSQL service is running
   - Default port: 5432

2. **Database Creation**
   ```sql
   -- Connect to PostgreSQL as superuser
   psql -U postgres
   
   -- Create the database
   CREATE DATABASE sagor_db;
   
   -- Create user (optional)
   CREATE USER sagor_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE sagor_db TO sagor_user;
   
   -- Exit psql
   \q
   ```

## 🔧 Environment Configuration

1. **Update .env file** (already configured):
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sagor_db"
   ```

2. **Alternative configurations**:
   ```env
   # If you have different credentials:
   DATABASE_URL="postgresql://username:password@localhost:5432/sagor_db"
   
   # If PostgreSQL runs on different port:
   DATABASE_URL="postgresql://postgres:postgres@localhost:5433/sagor_db"
   ```

## 🚀 Database Setup (Automatic)

Run the automated setup script:

```bash
npm run db:setup
```

This script will:
- Generate Prisma Client
- Run database migrations
- Seed initial data

## 🛠️ Manual Setup Steps

### 1. Generate Prisma Client
```bash
npm run db:generate
```

### 2. Run Database Migrations
```bash
npm run db:migrate
```

### 3. Seed Database (Optional)
```bash
npm run db:seed
```

## 📊 Database Schema

The database includes the following tables:

### Core Tables
- `users` - User accounts (buyers, sellers, admins)
- `categories` - Product categories
- `products` - Product catalog
- `orders` - Order management
- `order_items` - Order line items
- `payments` - Payment transactions
- `addresses` - User addresses

### Initial Data
After seeding, you'll have:
- **Admin User**: admin@skyzonebd.com / 11admin22
- **Test Buyer**: buyer@example.com / buyer123
- **Sample Products**: Electronics, Baby Items
- **Categories**: Electronics, Baby Items

## 🔍 Database Management

### View Database in Browser
```bash
npm run db:studio
```
Access: http://localhost:5555

### Reset Database
```bash
npm run db:reset
```
⚠️ **Warning**: This will delete all data!

### Check Database Status
```bash
curl http://localhost:3000/api/db/status
```

## 🔧 Troubleshooting

### Connection Issues

1. **PostgreSQL not running**:
   ```bash
   # Windows (if using pg service)
   net start postgresql
   
   # Linux/Mac
   sudo service postgresql start
   # or
   brew services start postgresql
   ```

2. **Database doesn't exist**:
   ```sql
   psql -U postgres -c "CREATE DATABASE sagor_db;"
   ```

3. **Permission denied**:
   ```sql
   psql -U postgres
   GRANT ALL PRIVILEGES ON DATABASE sagor_db TO your_username;
   ```

4. **Wrong credentials**:
   - Update USERNAME and PASSWORD in .env file
   - Ensure user exists in PostgreSQL

### Migration Issues

1. **Migration failed**:
   ```bash
   # Reset and try again
   npx prisma migrate reset
   npx prisma migrate dev --name init
   ```

2. **Schema out of sync**:
   ```bash
   npx prisma db push
   ```

## 📈 Performance Tips

1. **Connection Pooling**: Already configured in `db.ts`
2. **Indexing**: Schema includes appropriate indexes
3. **Query Optimization**: Use Prisma's query capabilities

## 🔐 Security Notes

1. **Change default passwords** in production
2. **Use environment variables** for credentials
3. **Enable SSL** for production databases
4. **Regular backups** recommended

## 🧪 Testing Database Connection

1. **API Endpoint**: GET `/api/db/status`
2. **Expected Response**:
   ```json
   {
     "success": true,
     "message": "Database connected successfully!",
     "database": "sagor_db",
     "status": "connected",
     "statistics": {
       "users": 2,
       "products": 4,
       "categories": 2,
       "orders": 0
     }
   }
   ```

## 📚 Available NPM Scripts

```bash
npm run db:setup      # Complete database setup
npm run db:migrate    # Run migrations
npm run db:generate   # Generate Prisma client
npm run db:seed       # Seed database with initial data
npm run db:studio     # Open Prisma Studio
npm run db:reset      # Reset database (⚠️ Deletes all data)
```

## 🚀 Next Steps

After successful database setup:

1. **Start the application**:
   ```bash
   npm run dev
   ```

2. **Access the application**:
   - Frontend: http://localhost:3000
   - Database Admin: http://localhost:5555 (Prisma Studio)
   - API Status: http://localhost:3000/api/db/status

3. **Test the features**:
   - User registration/login
   - Product browsing
   - Cart functionality
   - Order placement

---

## 📞 Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Verify PostgreSQL is running
3. Ensure database `sagor_db` exists
4. Check environment variable configuration