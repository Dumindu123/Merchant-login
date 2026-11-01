<?php

header('Content-Type: application/json; charset=utf-8');
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

function respond_with_error(int $status, string $message, array $errors = []): void
{
    http_response_code($status);
    echo json_encode(['error' => $message, 'errors' => $errors], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    respond_with_error(405, 'Method not allowed.');
}

if (empty($_SESSION['merchant_id'])) {
    respond_with_error(401, 'Sign in to update your merchant profile.');
}

$csrfToken = (string) ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
if (empty($_SESSION['profile_csrf_token']) || !hash_equals($_SESSION['profile_csrf_token'], $csrfToken)) {
    respond_with_error(403, 'Your session expired. Refresh the page and try again.');
}

$profile = json_decode((string) file_get_contents('php://input'), true);
if (!is_array($profile)) {
    respond_with_error(400, 'Could not read the profile details.');
}

$fieldLimits = [
    'businessName' => 150,
    'businessType' => 60,
    'ownerName' => 150,
    'contactNumber' => 20,
    'email' => 150,
    'whatsappNumber' => 20,
    'streetAddress' => 150,
    'city' => 150,
    'district' => 150,
    'bank' => 100,
    'branch' => 100,
];
$values = [];
$errors = [];

foreach ($fieldLimits as $field => $maxLength) {
    $value = $profile[$field] ?? null;
    if (!is_string($value)) {
        $errors[$field] = 'This field is required.';
        continue;
    }

    $value = trim($value);
    if ($value === '') {
        $errors[$field] = 'This field is required.';
    } elseif (strlen($value) > $maxLength) {
        $errors[$field] = 'Please keep this entry under ' . $maxLength . ' characters.';
    } else {
        $values[$field] = $value;
    }
}

$businessTypes = [
    'Clothing & Fashion',
    'Beauty & Personal Care',
    'Electronics',
    'Food & Grocery',
    'Home & Living',
    'Health & Wellness',
    'Books & Stationery',
    'Other',
];
$banks = [
    'Amana Bank PLC',
    'Bank of Ceylon',
    'Bank of China Ltd',
    'Cargills Bank PLC',
    'Citibank N.A.',
    'Commercial Bank of Ceylon PLC',
    'Deutsche Bank AG',
    'DFCC Bank PLC',
    'Habib Bank Ltd',
    'Hatton National Bank PLC',
    'Indian Bank',
    'Indian Overseas Bank',
    'MCB Bank Ltd',
    'National Development Bank PLC',
    'Nations Trust Bank PLC',
    'Pan Asia Banking Corporation PLC',
    "People's Bank",
    'Public Bank Berhad',
    'Sampath Bank PLC',
    'Seylan Bank PLC',
    'Standard Chartered Bank',
    'State Bank of India',
    'The Hongkong and Shanghai Banking Corporation Limited',
    'Union Bank of Colombo PLC',
    'HDFC Bank',
    'National Savings Bank',
    'Pradeshiya Sanwardhana Bank',
    'Sanasa Development Bank PLC',
    'Sri Lanka Savings Bank Ltd',
    'State Mortgage & Investment Bank',
];

if (isset($values['businessType']) && !in_array($values['businessType'], $businessTypes, true)) {
    $errors['businessType'] = 'Choose a business type from the list.';
}
if (isset($values['bank']) && !in_array($values['bank'], $banks, true)) {
    $errors['bank'] = 'Choose a bank from the list.';
}
foreach (['contactNumber', 'whatsappNumber'] as $phoneField) {
    if (isset($values[$phoneField]) && !preg_match('/^[+0-9()\\-\\s]{7,20}$/', $values[$phoneField])) {
        $errors[$phoneField] = 'Enter a valid phone number.';
    }
}
if (isset($values['email']) && !filter_var($values['email'], FILTER_VALIDATE_EMAIL)) {
    $errors['email'] = 'Enter a valid email address.';
}

$accountNumber = $profile['accountNumber'] ?? '';
if (!is_string($accountNumber)) {
    $errors['accountNumber'] = 'Enter a valid account number.';
} else {
    $accountNumber = trim($accountNumber);
    if ($accountNumber !== '' && !preg_match('/^\d{6,20}$/', $accountNumber)) {
        $errors['accountNumber'] = 'Enter an account number containing 6 to 20 digits.';
    }
}

if ($errors !== []) {
    respond_with_error(422, 'Please correct the highlighted profile details.', $errors);
}

$databaseFields = [
    'businessName' => 'shop_name',
    'businessType' => 'business_type',
    'ownerName' => 'owner_name',
    'contactNumber' => 'mobile_number',
    'email' => 'email',
    'whatsappNumber' => 'whatsapp_number',
    'streetAddress' => 'address',
    'city' => 'city',
    'district' => 'district',
    'bank' => 'bank_name',
    'branch' => 'bank_branch',
];
$setClauses = [];
$parameters = ['merchant_id' => (int) $_SESSION['merchant_id']];
foreach ($databaseFields as $field => $column) {
    $placeholder = 'profile_' . $field;
    $setClauses[] = $column . ' = :' . $placeholder;
    $parameters[$placeholder] = $values[$field];
}
$parameters['profile_email'] = strtolower($values['email']);

try {
    if ($accountNumber !== '') {
        require_once __DIR__ . '/bank-encryption.php';
        $setClauses[] = 'bank_account_encrypted = :bank_account_encrypted';
        $parameters['bank_account_encrypted'] = encrypt_bank_account($accountNumber);
    }

    require_once __DIR__ . '/db.php';
    $database = database_connection();
    $updateProfile = $database->prepare(
        'UPDATE merchants SET ' . implode(', ', $setClauses) . '
         WHERE merchant_id = :merchant_id'
    );
    $updateProfile->execute($parameters);

    $_SESSION['merchant_shop_name'] = $values['businessName'];
    $_SESSION['merchant_owner_name'] = $values['ownerName'];

    echo json_encode(['message' => 'Profile changes saved.'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
} catch (PDOException $error) {
    error_log('Merchant profile update database request failed: ' . $error->getMessage());
    if ($error->getCode() === '23000') {
        respond_with_error(409, 'An account with this email address already exists.', [
            'email' => 'An account with this email address already exists.',
        ]);
    }

    respond_with_error(500, 'Could not save your profile. Please try again.');
} catch (RuntimeException $error) {
    error_log('Merchant bank account encryption failed: ' . $error->getMessage());
    respond_with_error(500, 'Could not securely save the bank account number. Please try again.');
}
