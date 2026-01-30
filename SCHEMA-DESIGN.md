# Balance Tracker - Database Schema Design

## Overview

This schema supports a **fully dynamic** portfolio tracker where users can:
- Add/remove/edit portfolio categories
- Mark categories as "liquid" for monthly tracking
- Adjust savings account independently at any time
- Track lent money with categories and individual entries
- Manage joint accounts with dynamic categories
- Track monthly resets with history

## Core Principles

1. **Dynamic Categories**: No hardcoded account types - users create their own
2. **Liquid Flag**: Portfolio items can be marked as "liquid" to include in monthly calculations
3. **Independent Savings**: Savings account is standalone, adjustable anytime
4. **Audit Trail**: Track all changes for financial accuracy
5. **Multi-User Ready**: Schema supports multiple users (future-proof)

## Tables

### 1. `users`
Basic user information for authentication and multi-user support.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| email | VARCHAR(255) | Unique email |
| name | VARCHAR(100) | User's name |
| created_at | TIMESTAMP | Account creation |
| updated_at | TIMESTAMP | Last update |

### 2. `savings_account`
Standalone savings account that can be adjusted independently.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| user_id | INT | FK to users |
| amount | DECIMAL(12,2) | Current balance |
| updated_at | TIMESTAMP | Last update |

**Why Separate?**
- Savings is the core balance, adjustable anytime
- Not tied to portfolio categories
- Referenced in both Portfolio and Liquid Cash views

### 3. `portfolio_categories`
**Dynamic** portfolio categories (Groww, Shareworks, Fixed Deposit, etc.)

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| user_id | INT | FK to users |
| name | VARCHAR(100) | Category name (user-defined) |
| amount | DECIMAL(12,2) | Current value |
| **is_liquid** | **BOOLEAN** | **Include in liquid cash?** |
| sort_order | INT | Display order |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update |

**Key Feature: `is_liquid` Flag**
- When `TRUE`: Included in monthly liquid cash calculation
- When `FALSE`: Only in total portfolio
- Example: Fixed Deposit = liquid, Shareworks RSU = not liquid

### 4. `joint_categories`
Dynamic categories for joint accounts.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| user_id | INT | FK to users |
| name | VARCHAR(100) | Category name |
| amount | DECIMAL(12,2) | Current value |
| sort_order | INT | Display order |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update |

### 5. `lent_categories`
Categories for organizing lent money (Friends, Family, Business, etc.)

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| user_id | INT | FK to users |
| name | VARCHAR(100) | Category name |
| sort_order | INT | Display order |
| created_at | TIMESTAMP | Creation time |

### 6. `lent_entries`
Individual loans/lent amounts.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| category_id | INT | FK to lent_categories |
| name | VARCHAR(100) | Person/entity name |
| amount | DECIMAL(12,2) | Amount lent |
| date | DATE | When lent |
| notes | TEXT | Additional details |
| is_paid | BOOLEAN | Repaid? |
| created_at | TIMESTAMP | Entry creation |
| updated_at | TIMESTAMP | Last update |

### 7. `monthly_resets`
History of monthly liquid cash resets.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| user_id | INT | FK to users |
| reset_date | TIMESTAMP | When reset |
| savings_account_value | DECIMAL(12,2) | Savings at reset |
| total_liquid | DECIMAL(12,2) | Liquid cash at reset |
| total_portfolio | DECIMAL(12,2) | Portfolio at reset |
| notes | TEXT | Optional notes |

## Key Calculations

### Total Portfolio
```sql
Savings Account + SUM(all portfolio_categories.amount)
```

### Liquid Cash
```sql
Savings Account 
+ SUM(portfolio_categories WHERE is_liquid = TRUE) 
+ SUM(lent_entries WHERE is_paid = FALSE)
```

### Joint Total
```sql
SUM(joint_categories.amount)
```

## Use Cases

### Adding a New Investment Type
```sql
INSERT INTO portfolio_categories (user_id, name, amount, is_liquid)
VALUES (1, 'Mutual Funds', 50000, TRUE);
```

### Marking Category as Liquid
```sql
UPDATE portfolio_categories 
SET is_liquid = TRUE 
WHERE id = 5; -- Groww account
```

### Adjusting Savings Independently
```sql
UPDATE savings_account 
SET amount = 48000, updated_at = NOW() 
WHERE user_id = 1;
```

### Monthly Reset
```sql
-- 1. Log the reset
INSERT INTO monthly_resets (user_id, savings_account_value, total_liquid, total_portfolio)
VALUES (1, 45000, 68000, 245000);

-- 2. Update savings if needed
UPDATE savings_account 
SET amount = 45000, updated_at = NOW() 
WHERE user_id = 1;
```

### Getting Money Lent by Category
```sql
SELECT 
  lc.name as category,
  COUNT(le.id) as num_entries,
  SUM(le.amount) as total_lent
FROM lent_categories lc
LEFT JOIN lent_entries le ON le.category_id = lc.id
WHERE lc.user_id = 1 AND (le.is_paid = FALSE OR le.id IS NULL)
GROUP BY lc.id, lc.name;
```

## Views (Pre-calculated)

### `v_portfolio_total`
Quick access to total portfolio per user.

### `v_liquid_cash`
Breakdown of liquid cash components.

### `v_joint_total`
Joint account totals.

## Future Enhancements

1. **Transaction History**: Track every change as a transaction
2. **Recurring Entries**: Auto-add monthly investments
3. **Goals**: Set savings/investment targets
4. **Analytics**: Trends, charts, projections
5. **Multi-Currency**: Support different currencies
6. **Sharing**: Share joint accounts with partner

## Migration Path

Current: JSON → Next: PostgreSQL with Prisma ORM

1. Install Prisma: `npm install @prisma/client prisma`
2. Initialize: `npx prisma init`
3. Apply schema: `npx prisma db push`
4. Generate client: `npx prisma generate`
5. Create API routes for CRUD operations
6. Migrate data from JSON to DB
