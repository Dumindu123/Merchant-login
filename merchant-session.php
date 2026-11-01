<?php

header('Content-Type: application/json; charset=utf-8');
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

if (empty($_SESSION['merchant_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Sign in to view your merchant account.']);
    exit;
}

if (empty($_SESSION['profile_csrf_token'])) {
    $_SESSION['profile_csrf_token'] = bin2hex(random_bytes(32));
}

try {
    require_once __DIR__ . '/db.php';
    $database = database_connection();
    $merchantQuery = $database->prepare(
        'SELECT merchant_id, shop_name, business_type, owner_name, mobile_number,
               email, whatsapp_number, address, city, district, bank_name, bank_branch
         FROM merchants
         WHERE merchant_id = :merchant_id
         LIMIT 1'
    );
    $merchantQuery->execute(['merchant_id' => $_SESSION['merchant_id']]);
    $merchant = $merchantQuery->fetch();

    if (!$merchant) {
        session_unset();
        session_destroy();
        http_response_code(401);
        echo json_encode(['error' => 'Merchant account not found. Please sign in again.']);
        exit;
    }

    $bankNameAliases = [
        'Commercial Bank' => 'Commercial Bank of Ceylon PLC',
    ];

    echo json_encode([
        'merchantId' => 'MRC-' . str_pad((string) $merchant['merchant_id'], 5, '0', STR_PAD_LEFT),
        'shopName' => $merchant['shop_name'],
        'businessType' => $merchant['business_type'],
        'ownerName' => $merchant['owner_name'],
        'mobileNumber' => $merchant['mobile_number'],
        'email' => $merchant['email'],
        'whatsappNumber' => $merchant['whatsapp_number'],
        'address' => $merchant['address'],
        'city' => $merchant['city'],
        'district' => $merchant['district'],
        'bankName' => $bankNameAliases[$merchant['bank_name']] ?? $merchant['bank_name'],
        'bankBranch' => $merchant['bank_branch'],
        'csrfToken' => $_SESSION['profile_csrf_token'],
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
} catch (PDOException $error) {
    error_log('Merchant session database request failed: ' . $error->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Could not load merchant details. Please try again.']);
}
