<?php

session_start();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    http_response_code(405);
    exit('Method not allowed.');
}

$email = trim((string) ($_POST['email'] ?? ''));
$password = (string) ($_POST['password'] ?? '');

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $password === '') {
    header('Location: index.html?login=invalid');
    exit;
}

try {
    require_once __DIR__ . '/db.php';
    $database = database_connection();
    $merchantQuery = $database->prepare(
        'SELECT merchant_id, shop_name, owner_name, password_hash
         FROM merchants
         WHERE email = :email
         LIMIT 1'
    );
    $merchantQuery->execute(['email' => strtolower($email)]);
    $merchant = $merchantQuery->fetch();

    if (!$merchant || !password_verify($password, $merchant['password_hash'])) {
        header('Location: index.html?login=invalid');
        exit;
    }

    session_regenerate_id(true);
    $_SESSION['merchant_id'] = (int) $merchant['merchant_id'];
    $_SESSION['merchant_shop_name'] = $merchant['shop_name'];
    $_SESSION['merchant_owner_name'] = $merchant['owner_name'];

    header('Location: dashboard.html');
    exit;
} catch (PDOException $error) {
    error_log('Merchant login database request failed: ' . $error->getMessage());
    header('Location: index.html?login=unavailable');
    exit;
}
