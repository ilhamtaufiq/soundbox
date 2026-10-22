CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    amount BIGINT UNSIGNED NOT NULL,
    qris TEXT NOT NULL,
    status ENUM('pending', 'paid', 'expired') NOT NULL DEFAULT 'pending',
    created_at DATETIME(3) NOT NULL,
    expires_at DATETIME(3) NOT NULL,
    paid_at DATETIME(3) NULL,
    INDEX idx_payments_status_created (status, created_at)
);

CREATE TABLE IF NOT EXISTS transactions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    payment_id VARCHAR(64) NULL,
    amount BIGINT UNSIGNED NOT NULL,
    tx_id VARCHAR(128) NOT NULL UNIQUE,
    paid_at DATETIME(3) NOT NULL,
    CONSTRAINT fk_transactions_payment FOREIGN KEY (payment_id) REFERENCES payments (id) ON DELETE SET NULL
);
