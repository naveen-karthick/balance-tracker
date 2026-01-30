# Database Quick Start Guide

## Step-by-Step Setup

### 1. Get Your Neon Connection String

Go to your Neon.tech dashboard and copy the PostgreSQL connection string. It should look like:

```
postgresql://username:password@ep-xxx.region.aws.neon.tech/database?sslmode=require
```

### 2. Update .env File

Open `.env` and replace the DATABASE_URL:

```env
DATABASE_URL="your-neon-connection-string-here"
```

### 3. Run Migration to Create Tables

```bash
npm run db:migrate
```

When prompted, enter a migration name like: `initial_setup`

This creates all the tables:
- users
- savings_account
- portfolio_categories
- joint_categories
- lent_categories
- lent_entries
- monthly_resets

### 4. Generate Prisma Client

```bash
npm run db:generate
```

### 5. Create Your First User

Open your browser and go to:
```
http://localhost:3000/register
```

Fill in:
- **Email** (required): your@email.com
- **Name** (optional): Your Name
- **Phone** (optional): +1234567890

Click "Create Account"

### 6. Verify in Prisma Studio

```bash
npm run db:studio
```

This opens a visual database browser where you can see:
- Your user account
- Empty savings account (created automatically)
- All tables ready to use

## What Happens After Registration?

1. User account is created in the `users` table
2. A `savings_account` record is automatically created with $0 balance
3. User is redirected to the dashboard
4. Ready to start tracking portfolio!

## Next Steps

After creating a user, you need to:

1. **Add Authentication**: Currently no auth - anyone can access any data
2. **Update API Routes**: Change from mock data to Prisma queries
3. **Add User Context**: Store logged-in user ID
4. **Protect Routes**: Add middleware for protected pages

## Database Scripts Reference

| Command | What It Does |
|---------|-------------|
| `npm run db:migrate` | Create new migration + apply to DB |
| `npm run db:push` | Push schema without migration files (dev only) |
| `npm run db:generate` | Regenerate Prisma Client after schema changes |
| `npm run db:studio` | Open visual database editor |
| `npm run db:seed` | Run seed file (not created yet) |

## Common Issues

**Error: Can't reach database server**
- Check your connection string in `.env`
- Make sure your Neon database is active

**Error: User already exists**
- Use a different email or phone number
- Or delete the user from Prisma Studio first

**Error: Prisma Client not generated**
- Run `npm run db:generate`

## Database Schema Overview

```
User (1) ──┬── SavingsAccount (1)
           ├── PortfolioCategory (many)
           ├── JointCategory (many)
           ├── LentCategory (many)
           └── MonthlyReset (many)

LentCategory (1) ── LentEntry (many)
```

## Production Deployment (Vercel)

When deploying to Vercel:

1. Set `DATABASE_URL` in Vercel environment variables
2. Migrations run automatically on build
3. No additional setup needed!

## Ready to Go!

Your database is set up. Now you can:
- ✅ Create users via `/register`
- ✅ View data in Prisma Studio
- ⏭️ Next: Update API routes to use Prisma
- ⏭️ Next: Add authentication
