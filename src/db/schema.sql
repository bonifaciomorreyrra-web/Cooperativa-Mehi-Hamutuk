-- KMH Database Schema

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role TEXT CHECK(role IN ('member','admin','president')) NOT NULL DEFAULT 'member',
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  member_no VARCHAR(20) UNIQUE,
  full_name VARCHAR(100) NOT NULL,
  bi_electoral_no VARCHAR(50),
  date_of_birth DATE,
  place_of_birth VARCHAR(100),
  profession VARCHAR(100),
  address VARCHAR(200),
  phone VARCHAR(20),
  email VARCHAR(100),
  member_type TEXT CHECK(member_type IN ('employee','student')) DEFAULT 'employee',
  photo_url VARCHAR(255),
  joined_date DATE,
  status TEXT CHECK(status IN ('active','pending','inactive')) DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS savings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER REFERENCES members(id),
  amount DECIMAL(10,2) NOT NULL,
  type TEXT CHECK(type IN ('mandatory','voluntary','dividend','penalty')) NOT NULL,
  description VARCHAR(200),
  transaction_date DATE NOT NULL,
  balance_after DECIMAL(10,2),
  created_by INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS loans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  loan_ref VARCHAR(30) UNIQUE,
  member_id INTEGER REFERENCES members(id),
  amount DECIMAL(10,2) NOT NULL,
  purpose TEXT,
  duration_months INTEGER NOT NULL,
  interest_rate DECIMAL(5,2) DEFAULT 7.00,
  monthly_payment DECIMAL(10,2),
  total_repayment DECIMAL(10,2),
  collateral TEXT,
  guarantor_name VARCHAR(100),
  guarantor_phone VARCHAR(20),
  status TEXT CHECK(status IN ('pending','approved','rejected','active','completed')) DEFAULT 'pending',
  applied_date DATE,
  approved_date DATE,
  approved_by INTEGER REFERENCES users(id),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS loan_repayments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  loan_id INTEGER REFERENCES loans(id),
  month_number INTEGER NOT NULL,
  amount_paid DECIMAL(10,2) NOT NULL,
  principal DECIMAL(10,2),
  interest DECIMAL(10,2),
  balance DECIMAL(10,2),
  paid_date DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS investors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  investor_no VARCHAR(20) UNIQUE,
  full_name VARCHAR(100) NOT NULL,
  bi_electoral_no VARCHAR(50),
  phone VARCHAR(20),
  email VARCHAR(100),
  investor_type TEXT CHECK(investor_type IN ('member','non-member')) DEFAULT 'non-member',
  member_id INTEGER REFERENCES members(id),
  amount DECIMAL(10,2) NOT NULL,
  start_date DATE,
  end_date DATE,
  frequency TEXT CHECK(frequency IN ('one-time','two-installments')) DEFAULT 'one-time',
  status TEXT CHECK(status IN ('active','completed','pending')) DEFAULT 'pending',
  registration_fee DECIMAL(10,2) DEFAULT 5.00,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER REFERENCES members(id),
  type TEXT CHECK(type IN ('sms','email','system')) NOT NULL,
  message TEXT NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(100),
  status TEXT CHECK(status IN ('sent','failed','pending')) DEFAULT 'pending',
  sent_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
