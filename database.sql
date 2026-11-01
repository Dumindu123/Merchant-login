CREATE DATABASE IF NOT EXISTS `merchant login`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE `merchant login`;

CREATE TABLE merchants (
    merchant_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    shop_name VARCHAR(150) NOT NULL,
    business_type VARCHAR(60) NOT NULL,
    owner_name VARCHAR(150) NOT NULL,
    mobile_number VARCHAR(20) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    whatsapp_number VARCHAR(20) NOT NULL,
    address VARCHAR(150) NOT NULL,
    city VARCHAR(150) NOT NULL,
    district VARCHAR(150) NOT NULL,
    bank_name VARCHAR(100) NOT NULL,
    bank_branch VARCHAR(100) NOT NULL,
    bank_account_encrypted TEXT NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Active',
    terms_accepted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX merchants_status_idx (status)
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE TABLE  parcels (
    tracking_id VARCHAR(20) NOT NULL PRIMARY KEY,
    merchant_id BIGINT UNSIGNED NULL,
    recipient VARCHAR(100) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    address VARCHAR(180) NOT NULL,
    city VARCHAR(60) NOT NULL,
    district VARCHAR(60) NOT NULL,
    instructions VARCHAR(180) NULL,
    description VARCHAR(120) NOT NULL,
    weight DECIMAL(5, 2) NOT NULL,
    cod DECIMAL(10, 2) NOT NULL,
    delivery_fee DECIMAL(10, 2) NOT NULL,
    insurance DECIMAL(10, 2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX parcels_created_at_idx (created_at),
    INDEX parcels_merchant_created_at_idx (merchant_id, created_at),
    CONSTRAINT parcels_merchant_fk
        FOREIGN KEY (merchant_id) REFERENCES merchants (merchant_id)
        ON DELETE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE TABLE  parcel_id_sequences (
    date_key CHAR(6) NOT NULL PRIMARY KEY,
    next_value BIGINT UNSIGNED NOT NULL
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE TABLE settlements (
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
