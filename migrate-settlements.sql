USE `merchant login`;

CREATE TABLE IF NOT EXISTS settlements (
    settlement_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    merchant_id BIGINT UNSIGNED NOT NULL,
    reference_code VARCHAR(60) NOT NULL,
    parcel_count INT UNSIGNED NOT NULL DEFAULT 0,
    gross_cod DECIMAL(10, 2) NOT NULL,
    deductions DECIMAL(10, 2) NOT NULL DEFAULT 0,
    net_paid DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP NULL DEFAULT NULL,
    UNIQUE KEY settlements_reference_code_unique (reference_code),
    INDEX settlements_merchant_created_at_idx (merchant_id, created_at),
    INDEX settlements_merchant_status_idx (merchant_id, status),
    CONSTRAINT settlements_merchant_fk
        FOREIGN KEY (merchant_id) REFERENCES merchants (merchant_id)
        ON DELETE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
