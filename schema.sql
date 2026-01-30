-- Balance Tracker PostgreSQL Schema
-- Supports dynamic categories for portfolio, joint accounts, and lent money

-- Users table (for future multi-user support)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Savings Account (standalone, adjustable anytime)
CREATE TABLE savings_account (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Portfolio Categories (dynamic - user can add/remove)
CREATE TABLE portfolio_categories (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  is_liquid BOOLEAN DEFAULT FALSE, -- Mark if this counts towards liquid cash
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Joint Account Categories (dynamic)
CREATE TABLE joint_categories (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Lent Money Categories
CREATE TABLE lent_categories (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Lent Money Entries (individual loans)
CREATE TABLE lent_entries (
  id SERIAL PRIMARY KEY,
  category_id INT REFERENCES lent_categories(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  date DATE NOT NULL,
  notes TEXT,
  is_paid BOOLEAN DEFAULT FALSE, -- Track if loan is repaid
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Monthly Resets History (track when liquid cash is reset)
CREATE TABLE monthly_resets (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  reset_date TIMESTAMP DEFAULT NOW(),
  savings_account_value DECIMAL(12,2),
  total_liquid DECIMAL(12,2),
  total_portfolio DECIMAL(12,2),
  notes TEXT
);

-- Audit Log (optional - track all changes for financial accuracy)
CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(50), -- 'update', 'create', 'delete'
  table_name VARCHAR(50),
  record_id INT,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_portfolio_user ON portfolio_categories(user_id);
CREATE INDEX idx_portfolio_liquid ON portfolio_categories(is_liquid);
CREATE INDEX idx_joint_user ON joint_categories(user_id);
CREATE INDEX idx_lent_cat_user ON lent_categories(user_id);
CREATE INDEX idx_lent_entries_cat ON lent_entries(category_id);
CREATE INDEX idx_lent_entries_paid ON lent_entries(is_paid);
CREATE INDEX idx_monthly_resets_user ON monthly_resets(user_id, reset_date DESC);

-- Views for easier querying

-- Total Portfolio View
CREATE VIEW v_portfolio_total AS
SELECT 
  u.id as user_id,
  COALESCE(sa.amount, 0) + COALESCE(SUM(pc.amount), 0) as total_portfolio
FROM users u
LEFT JOIN savings_account sa ON sa.user_id = u.id
LEFT JOIN portfolio_categories pc ON pc.user_id = u.id
GROUP BY u.id, sa.amount;

-- Liquid Cash View
CREATE VIEW v_liquid_cash AS
SELECT 
  u.id as user_id,
  COALESCE(sa.amount, 0) as savings,
  COALESCE(SUM(CASE WHEN pc.is_liquid THEN pc.amount ELSE 0 END), 0) as liquid_assets,
  COALESCE(SUM(le.amount), 0) as money_lent,
  COALESCE(sa.amount, 0) + 
  COALESCE(SUM(CASE WHEN pc.is_liquid THEN pc.amount ELSE 0 END), 0) +
  COALESCE(SUM(le.amount), 0) as total_liquid
FROM users u
LEFT JOIN savings_account sa ON sa.user_id = u.id
LEFT JOIN portfolio_categories pc ON pc.user_id = u.id
LEFT JOIN lent_categories lc ON lc.user_id = u.id
LEFT JOIN lent_entries le ON le.category_id = lc.id AND le.is_paid = FALSE
GROUP BY u.id, sa.amount;

-- Joint Account Total View
CREATE VIEW v_joint_total AS
SELECT 
  user_id,
  SUM(amount) as total_joint
FROM joint_categories
GROUP BY user_id;

-- Example Queries:

-- Get user's complete portfolio
-- SELECT * FROM v_portfolio_total WHERE user_id = 1;

-- Get user's liquid cash breakdown
-- SELECT * FROM v_liquid_cash WHERE user_id = 1;

-- Get all portfolio categories for a user
-- SELECT * FROM portfolio_categories WHERE user_id = 1 ORDER BY sort_order, name;

-- Get money lent grouped by category
-- SELECT lc.name, SUM(le.amount) as total_lent
-- FROM lent_categories lc
-- JOIN lent_entries le ON le.category_id = lc.id
-- WHERE lc.user_id = 1 AND le.is_paid = FALSE
-- GROUP BY lc.name;

-- Monthly reset history
-- SELECT * FROM monthly_resets WHERE user_id = 1 ORDER BY reset_date DESC LIMIT 12;
