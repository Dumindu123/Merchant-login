USE `merchant login`;

ALTER TABLE parcels
    ADD COLUMN merchant_id BIGINT UNSIGNED NULL AFTER tracking_id,
    ADD INDEX parcels_merchant_created_at_idx (merchant_id, created_at),
    ADD CONSTRAINT parcels_merchant_fk
        FOREIGN KEY (merchant_id) REFERENCES merchants (merchant_id)
        ON DELETE RESTRICT;

UPDATE parcels
SET merchant_id = (SELECT MIN(merchant_id) FROM merchants)
WHERE merchant_id IS NULL
  AND (SELECT COUNT(*) FROM merchants) = 1;
