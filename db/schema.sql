-- StellarCommerce PostgreSQL Schema
-- Tracks orders, shipping, and merchant ratings off-chain.
-- On-chain truth lives in the Soroban contract; this mirrors it for dashboards/APIs.

-- ── Extensions ───────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "citext";     -- case-insensitive text for addresses

-- ── Merchants ────────────────────────────────────────────────────────────────

CREATE TABLE merchants (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    stellar_address CITEXT      NOT NULL UNIQUE,
    contract_id     CITEXT      NOT NULL UNIQUE,  -- deployed escrow contract
    name            TEXT        NOT NULL,
    category        TEXT        NOT NULL CHECK (category IN ('grocery','retail','digital','other')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE
);

-- ── Orders ───────────────────────────────────────────────────────────────────

CREATE TYPE order_status AS ENUM ('pending','released','refunded','disputed');

CREATE TABLE orders (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    on_chain_id     BIGINT        NOT NULL,                    -- matches contract order_id
    merchant_id     UUID          NOT NULL REFERENCES merchants(id),
    buyer_address   CITEXT        NOT NULL,
    token_address   CITEXT        NOT NULL,                    -- USDC contract address
    amount_stroops  NUMERIC(20,0) NOT NULL CHECK (amount_stroops > 0),
    status          order_status  NOT NULL DEFAULT 'pending',
    timeout_at      TIMESTAMPTZ   NOT NULL,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    tx_hash_pay     TEXT,                                      -- pay_escrow tx hash
    tx_hash_settle  TEXT,                                      -- release or refund tx hash
    notes           TEXT,

    UNIQUE (merchant_id, on_chain_id)
);

CREATE INDEX idx_orders_merchant   ON orders(merchant_id);
CREATE INDEX idx_orders_buyer      ON orders(buyer_address);
CREATE INDEX idx_orders_status     ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Shipping ─────────────────────────────────────────────────────────────────

CREATE TYPE shipping_status AS ENUM (
    'not_shipped','processing','shipped','in_transit','delivered','returned'
);

CREATE TABLE shipments (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        UUID            NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    carrier         TEXT,
    tracking_number TEXT,
    status          shipping_status NOT NULL DEFAULT 'not_shipped',
    estimated_at    TIMESTAMPTZ,
    delivered_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shipments_order ON shipments(order_id);

CREATE TRIGGER trg_shipments_updated_at
    BEFORE UPDATE ON shipments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Merchant Ratings ─────────────────────────────────────────────────────────

CREATE TABLE ratings (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id    UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE UNIQUE,
    merchant_id UUID        NOT NULL REFERENCES merchants(id),
    buyer_address CITEXT    NOT NULL,
    score       SMALLINT    NOT NULL CHECK (score BETWEEN 1 AND 5),
    comment     TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ratings_merchant ON ratings(merchant_id);

-- Materialized view for fast merchant score lookups
CREATE MATERIALIZED VIEW merchant_scores AS
SELECT
    merchant_id,
    COUNT(*)                          AS total_ratings,
    ROUND(AVG(score)::NUMERIC, 2)     AS avg_score,
    COUNT(*) FILTER (WHERE score = 5) AS five_star
FROM ratings
GROUP BY merchant_id;

CREATE UNIQUE INDEX ON merchant_scores(merchant_id);

-- Refresh with: REFRESH MATERIALIZED VIEW CONCURRENTLY merchant_scores;

-- ── Dispute Log ──────────────────────────────────────────────────────────────

CREATE TYPE dispute_resolution AS ENUM ('pending','buyer_wins','merchant_wins','split');

CREATE TABLE disputes (
    id          UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id    UUID               NOT NULL REFERENCES orders(id) ON DELETE CASCADE UNIQUE,
    opened_by   CITEXT             NOT NULL,   -- buyer or merchant address
    reason      TEXT               NOT NULL,
    resolution  dispute_resolution NOT NULL DEFAULT 'pending',
    resolved_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);
