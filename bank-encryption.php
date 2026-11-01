<?php

function encrypt_bank_account(string $accountNumber): string
{
    $encodedKey = getenv('SPEEDX_BANK_ENCRYPTION_KEY');
    if ($encodedKey !== false && $encodedKey !== '') {
        $key = base64_decode($encodedKey, true);
    } else {
        $keyPath = getenv('SPEEDX_BANK_ENCRYPTION_KEY_FILE')
            ?: dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'private' . DIRECTORY_SEPARATOR . 'speedx-bank.key';

        if (!is_file($keyPath)) {
            $keyDirectory = dirname($keyPath);
            if (!is_dir($keyDirectory) && !mkdir($keyDirectory, 0700, true) && !is_dir($keyDirectory)) {
                throw new RuntimeException('Could not create the private bank-encryption key directory.');
            }

            $keyFile = @fopen($keyPath, 'x+b');
            if ($keyFile !== false) {
                $newKey = random_bytes(32);
                $bytesWritten = fwrite($keyFile, $newKey);
                fclose($keyFile);

                if ($bytesWritten !== strlen($newKey)) {
                    throw new RuntimeException('Could not save the private bank-encryption key.');
                }
            }
        }

        $key = @file_get_contents($keyPath);
    }

    if ($key === false || strlen($key) !== 32) {
        throw new RuntimeException('Bank account encryption key is unavailable or invalid. Check the SPEEDX bank-encryption key configuration.');
    }

    $nonce = random_bytes(12);
    $tag = '';
    $ciphertext = openssl_encrypt(
        $accountNumber,
        'aes-256-gcm',
        $key,
        OPENSSL_RAW_DATA,
        $nonce,
        $tag
    );

    if ($ciphertext === false) {
        throw new RuntimeException('Could not protect the bank account number.');
    }

    return base64_encode($nonce . $tag . $ciphertext);
}
