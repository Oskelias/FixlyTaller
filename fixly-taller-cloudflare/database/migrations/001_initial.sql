-- Fixly Taller SaaS - Database Schema for Cloudflare D1
-- SQLite compatible schema

-- Tabla de usuarios/talleres
CREATE TABLE IF NOT EXISTS workshops (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    address TEXT,
    city TEXT,
    province TEXT DEFAULT 'Buenos Aires',
    country TEXT DEFAULT 'Argentina',
    password_hash TEXT NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    plan_type TEXT DEFAULT 'starter' CHECK (plan_type IN ('starter', 'pro', 'enterprise')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    email_verified BOOLEAN DEFAULT FALSE,
    verification_token TEXT,
    reset_token TEXT,
    reset_expires DATETIME
);

-- Tabla de suscripciones
CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    workshop_id TEXT NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
    plan_type TEXT NOT NULL CHECK (plan_type IN ('starter', 'pro', 'enterprise')),
    status TEXT DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'expired', 'cancelled')),
    amount DECIMAL(10,2) DEFAULT 0,
    currency TEXT DEFAULT 'ARS',
    billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
    trial_ends_at DATETIME,
    expires_at DATETIME,
    activated_at DATETIME,
    cancelled_at DATETIME,
    payment_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de pagos (MercadoPago)
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    workshop_id TEXT NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
    subscription_id TEXT REFERENCES subscriptions(id),
    mercadopago_id TEXT,
    preference_id TEXT,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'ARS',
    plan_type TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'refunded')),
    payment_method TEXT,
    installments INTEGER DEFAULT 1,
    transaction_fee DECIMAL(10,2),
    net_amount DECIMAL(10,2),
    payer_email TEXT,
    external_reference TEXT,
    webhook_data TEXT, -- JSON con datos del webhook
    processed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de descargas demo
CREATE TABLE IF NOT EXISTS downloads (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    workshop_id TEXT REFERENCES workshops(id),
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    company_name TEXT,
    download_token TEXT UNIQUE NOT NULL,
    file_path TEXT NOT NULL,
    download_count INTEGER DEFAULT 0,
    max_downloads INTEGER DEFAULT 3,
    expires_at DATETIME NOT NULL,
    downloaded_at DATETIME,
    converted_to_paid BOOLEAN DEFAULT FALSE,
    conversion_date DATETIME,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_workshops_email ON workshops(email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_workshop ON subscriptions(workshop_id);
CREATE INDEX IF NOT EXISTS idx_payments_workshop ON payments(workshop_id);
CREATE INDEX IF NOT EXISTS idx_downloads_token ON downloads(download_token);
