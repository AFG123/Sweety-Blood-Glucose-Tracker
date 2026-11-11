-- 001_init_schema.sql
-- Database schema for Sweety Blood Glucose Tracker

-- 1. Create reading_slot ENUM
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reading_slot') THEN
        CREATE TYPE reading_slot AS ENUM (
            'MORNING_FASTING',
            'AFTER_BREAKFAST',
            'AFTER_LUNCH',
            'AFTER_DINNER'
        );
    END IF;
END $$;

-- 2. Create users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create glucose_readings table
CREATE TABLE IF NOT EXISTS glucose_readings (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reading_date DATE NOT NULL,
    slot reading_slot NOT NULL,
    value INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_reading_slot UNIQUE (user_id, reading_date, slot),
    CONSTRAINT chk_glucose_value CHECK (value BETWEEN 40 AND 600)
);

-- Indexes for performance on glucose_readings
CREATE INDEX IF NOT EXISTS idx_glucose_readings_user_date 
    ON glucose_readings(user_id, reading_date);

-- 4. Create refresh_tokens table (for token rotation and reuse detection)
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    family_id UUID NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ NULL,
    revoked_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast token lookup and rotation queries
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash 
    ON refresh_tokens(token_hash);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family_id 
    ON refresh_tokens(family_id);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id 
    ON refresh_tokens(user_id);
