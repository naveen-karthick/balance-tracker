# Database Setup Guide - Neon.tech + Prisma

## Prerequisites
- Neon.tech account (via Vercel)
- PostgreSQL database created in Neon

## Step 1: Get Your Neon Connection String

### From Vercel Dashboard:
1. Go to your Vercel project
2. Click on **Storage** tab
3. If you don't have a database:
   - Click "Create Database"
   - Select "Neon Postgres"
   - Follow the setup wizard
4. Once created, click on your database
5. Copy the **Connection String** (should look like):
   ```
   postgresql://username:password@ep-xyz.region.aws.neon.tech/database?sslmode=require
   ```

### From Neon.tech Dashboard:
1. Go to [console.neon.tech](https://console.neon.tech)
2. Select your project
3. Go to "Connection Details"
4. Copy the connection string

## Step 2: Configure Environment Variables

1. Open `.env` file in your project root
2. Replace the `DATABASE_URL` with your Neon connection string:

```env
DATABASE_URL="postgresql://your-username:your-password@ep-xyz.region.aws.neon.tech/your-database?sslmode=require"
```

**Important:** Make sure `.env` is in your `.gitignore` (it should be by default)

## Step 3: Run Database Migrations

Now create the database tables by running:

```bash
npm run db:migrate
```

This will:
- Create all the tables in your Neon database
- Generate Prisma Client
- Create a migration history in `prisma/migrations/`

**When prompted:**
- Enter a migration name like: `initial_setup` or `create_tables`

## Step 4: Verify the Migration

Check your database was created successfully:

```bash
npm run db:studio
```

This opens Prisma Studio in your browser where you can:
- View all tables
- See the schema
- Add/edit data manually

## Database Scripts

We've added the following scripts to `package.json`:

| Command | Description |
|---------|-------------|
| `npm run db:migrate` | Create and apply migrations |
| `npm run db:push` | Push schema changes (no migration files) |
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:studio` | Open Prisma Studio (DB GUI) |
| `npm run db:seed` | Seed the database with test data |

## Step 5: Generate Prisma Client

After migration, generate the Prisma Client:

```bash
npm run db:generate
```

## Tables Created

The migration will create the following tables:

1. **users** - User accounts (email, phone number)
2. **savings_account** - Bank balance for each user
3. **portfolio_categories** - Dynamic portfolio items
4. **joint_categories** - Joint account categories
5. **lent_categories** - Categories for lent money
6. **lent_entries** - Individual loan entries
7. **monthly_resets** - History of monthly resets

## Next Steps

After database setup:
1. Create a user registration page
2. Update API routes to use Prisma instead of mock data
3. Add authentication
4. Deploy to Vercel

## Troubleshooting

### Connection Error
```
Error: P1001: Can't reach database server
```
**Solution:** Check your connection string and ensure your IP is whitelisted in Neon

### Migration Failed
```
Error: P3009: Failed to create migration
```
**Solution:** 
- Check if DATABASE_URL is correct
- Ensure database exists
- Try `npm run db:push` instead for development

### SSL Error
```
Error: SSL connection required
```
**Solution:** Make sure your connection string includes `?sslmode=require`

## Development vs Production

**Development:**
```bash
npm run db:migrate  # Creates migration files
npm run db:studio   # Visual editor
```

**Production (Vercel):**
- Set `DATABASE_URL` in Vercel environment variables
- Migrations run automatically on deployment
- Or run manually: `npx prisma migrate deploy`

## Resetting Database

To reset your database (⚠️ deletes all data):

```bash
npx prisma migrate reset
```

This will:
1. Drop all tables
2. Re-run all migrations
3. Run seed file (if exists)
