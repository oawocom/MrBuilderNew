-- 018: contractor money, schedule, account preferences, devices, account deletion

ALTER TABLE user_settings
    ADD COLUMN notify_new_jobs BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN notify_payouts BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN notify_messages BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN notify_updates BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN auto_update BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN auto_payout BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN min_payout_amount DECIMAL(10,2),          -- NULL = platform default
    ADD COLUMN units VARCHAR(10) NOT NULL DEFAULT 'imperial'; -- imperial | metric

ALTER TABLE users
    ADD COLUMN deletion_requested_at TIMESTAMPTZ,
    ADD COLUMN deleted_at TIMESTAMPTZ;

ALTER TABLE payout_requests
    ADD COLUMN method_label VARCHAR(100),
    ADD COLUMN notes TEXT,
    ADD COLUMN rejected_reason TEXT,
    ADD COLUMN is_auto BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE payment_methods
    ADD COLUMN label VARCHAR(100),
    ADD COLUMN bank_last_four VARCHAR(4),
    ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX idx_transactions_user_created ON transactions(user_id, created_at DESC);
CREATE INDEX idx_jobs_contractor_schedule ON jobs(contractor_id, scheduled_start) WHERE contractor_id IS NOT NULL;
