ALTER TABLE waitlist ADD COLUMN status VARCHAR(20) DEFAULT 'pending';
CREATE INDEX idx_waitlist_status ON waitlist(status);
