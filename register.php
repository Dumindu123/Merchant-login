<?php
session_start();
require_once __DIR__ . '/bank-encryption.php';

function escape_html(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
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
    'Licensed Commercial Banks' => [
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
    ],
    'Licensed Specialized Banks' => [
        'HDFC Bank',
        'National Savings Bank',
        'Pradeshiya Sanwardhana Bank',
        'Sanasa Development Bank PLC',
        'Sri Lanka Savings Bank Ltd',
        'State Mortgage & Investment Bank',
    ],
];

$bankNames = array_merge(...array_values($banks));

$fieldNames = [
    'shop_name',
    'business_type',
    'owner_name',
    'mobile_number',
    'email',
    'whatsapp_number',
    'address',
    'city',
    'district',
    'bank_name',
    'bank_branch',
    'bank_account_number',
];

$values = array_fill_keys($fieldNames, '');
$errors = [];
$message = '';

if (empty($_SESSION['registration_csrf'])) {
    $_SESSION['registration_csrf'] = bin2hex(random_bytes(32));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    foreach ($fieldNames as $fieldName) {
        $values[$fieldName] = trim((string) ($_POST[$fieldName] ?? ''));
    }

    $password = (string) ($_POST['password'] ?? '');
    $confirmPassword = (string) ($_POST['confirm_password'] ?? '');
    $csrfToken = (string) ($_POST['csrf_token'] ?? '');

    if (!hash_equals($_SESSION['registration_csrf'], $csrfToken)) {
        $message = 'Your form session expired. Refresh the page and try again.';
    } else {
        foreach ($fieldNames as $fieldName) {
            if ($values[$fieldName] === '') {
                $errors[$fieldName] = 'This field is required.';
            } elseif (strlen($values[$fieldName]) > 150) {
                $errors[$fieldName] = 'Please keep this entry under 150 characters.';
            }
        }

        if ($values['email'] !== '' && !filter_var($values['email'], FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'Enter a valid email address.';
        }

        foreach (['mobile_number', 'whatsapp_number'] as $phoneField) {
            if ($values[$phoneField] !== '' && !preg_match('/^[+0-9()\\-\\s]{7,20}$/', $values[$phoneField])) {
                $errors[$phoneField] = 'Enter a valid phone number.';
            }
        }

        if ($values['business_type'] !== '' && !in_array($values['business_type'], $businessTypes, true)) {
            $errors['business_type'] = 'Choose a business type from the list.';
        }

        if (!in_array($values['bank_name'], $bankNames, true)) {
            $errors['bank_name'] = 'Choose a bank from the list.';
        }

        if ($values['bank_branch'] === '') {
            $errors['bank_branch'] = 'This field is required.';
        } elseif (strlen($values['bank_branch']) > 100) {
            $errors['bank_branch'] = 'Please keep this entry under 100 characters.';
        }

        if (!preg_match('/^\d{6,20}$/', $values['bank_account_number'])) {
            $errors['bank_account_number'] = 'Enter an account number containing 6 to 20 digits.';
        }

        if (strlen($password) < 8) {
            $errors['password'] = 'Use at least 8 characters.';
        }

        if ($confirmPassword === '' || $password !== $confirmPassword) {
            $errors['confirm_password'] = 'Passwords must match.';
        }

        if (!isset($_POST['terms'])) {
            $errors['terms'] = 'You must agree to the terms and privacy policy.';
        }

        if ($errors === []) {
            try {
                require_once __DIR__ . '/db.php';
                $database = database_connection();
                $passwordHash = password_hash($password, PASSWORD_DEFAULT);
                $encryptedBankAccount = encrypt_bank_account($values['bank_account_number']);

                $createMerchant = $database->prepare(
                    'INSERT INTO merchants (
                        shop_name, business_type, owner_name, mobile_number, email,
                        whatsapp_number, address, city, district, bank_name, bank_branch,
                        bank_account_encrypted, password_hash, status
                    ) VALUES (
                        :shop_name, :business_type, :owner_name, :mobile_number, :email,
                        :whatsapp_number, :address, :city, :district, :bank_name, :bank_branch,
                        :bank_account_encrypted, :password_hash, :status
                    )'
                );
                $createMerchant->execute([
                    'shop_name' => $values['shop_name'],
                    'business_type' => $values['business_type'],
                    'owner_name' => $values['owner_name'],
                    'mobile_number' => $values['mobile_number'],
                    'email' => strtolower($values['email']),
                    'whatsapp_number' => $values['whatsapp_number'],
                    'address' => $values['address'],
                    'city' => $values['city'],
                    'district' => $values['district'],
                    'bank_name' => $values['bank_name'],
                    'bank_branch' => $values['bank_branch'],
                    'bank_account_encrypted' => $encryptedBankAccount,
                    'password_hash' => $passwordHash,
                    'status' => 'Active',
                ]);

                $merchantId = (int) $database->lastInsertId();
                session_regenerate_id(true);
                $_SESSION['merchant_id'] = $merchantId;
                $_SESSION['merchant_shop_name'] = $values['shop_name'];
                $_SESSION['merchant_owner_name'] = $values['owner_name'];

                header('Location: store-profile.html?registered=1');
                exit;
            } catch (PDOException $error) {
                error_log('Merchant registration database request failed: ' . $error->getMessage());

                if ($error->getCode() === '23000') {
                    $errors['email'] = 'An account with this email address already exists.';
                } else {
                    $message = 'Could not create your account. Check the database connection and try again.';
                }
            } catch (RuntimeException $error) {
                error_log('Merchant bank account encryption failed: ' . $error->getMessage());
                $message = $error->getMessage();
            }
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#f5f8f6">
    <title>Create a merchant account | SpeedX</title>
    <link rel="stylesheet" href="register.css">
    <script src="register.js" defer></script>
</head>
<body>
    <main class="registration-page">
        <header class="registration-header">
            <a class="registration-brand" href="index.html" aria-label="SpeedX Merchant Portal home">
                <span class="registration-brand-mark" aria-hidden="true">S</span>
                <span class="registration-brand-copy">
                    <strong>SPEEDX</strong>
                    <small>MERCHANT PORTAL</small>
                </span>
            </a>
        </header>

        <section class="registration-intro">
            <h1>Create your merchant account</h1>
            <p>Register your store and start sending parcels with SpeedX.</p>
        </section>

        <form class="registration-card" method="post" action="register.php">
            <input type="hidden" name="csrf_token" value="<?= escape_html($_SESSION['registration_csrf']) ?>">

            <?php if ($message !== ''): ?>
                <p class="registration-message" role="status">
                    <?= escape_html($message) ?>
                </p>
            <?php endif; ?>

            <section class="registration-section" aria-labelledby="business-heading">
                <div class="section-heading">
                    <h2 id="business-heading">Business details</h2>
                    <p>Tell us about your online store.</p>
                </div>
                <div class="registration-grid">
                    <div class="registration-field">
                        <label for="shop_name">Shop / Business Name</label>
                        <input id="shop_name" name="shop_name" type="text" autocomplete="organization" placeholder="Enter your business name" value="<?= escape_html($values['shop_name']) ?>" maxlength="150" required aria-invalid="<?= isset($errors['shop_name']) ? 'true' : 'false' ?>">
                        <?php if (isset($errors['shop_name'])): ?><span class="field-error"><?= escape_html($errors['shop_name']) ?></span><?php endif; ?>
                    </div>
                    <div class="registration-field">
                        <label for="business_type">Business Type</label>
                        <select id="business_type" name="business_type" required aria-invalid="<?= isset($errors['business_type']) ? 'true' : 'false' ?>">
                            <option value="">Select a business type</option>
                            <?php foreach ($businessTypes as $businessType): ?>
                                <option value="<?= escape_html($businessType) ?>"<?= $values['business_type'] === $businessType ? ' selected' : '' ?>><?= escape_html($businessType) ?></option>
                            <?php endforeach; ?>
                        </select>
                        <?php if (isset($errors['business_type'])): ?><span class="field-error"><?= escape_html($errors['business_type']) ?></span><?php endif; ?>
                    </div>
                    <div class="registration-field">
                        <label for="owner_name">Owner Full Name</label>
                        <input id="owner_name" name="owner_name" type="text" autocomplete="name" placeholder="Enter your full name" value="<?= escape_html($values['owner_name']) ?>" maxlength="150" required aria-invalid="<?= isset($errors['owner_name']) ? 'true' : 'false' ?>">
                        <?php if (isset($errors['owner_name'])): ?><span class="field-error"><?= escape_html($errors['owner_name']) ?></span><?php endif; ?>
                    </div>
                    <div class="registration-field">
                        <label for="mobile_number">Mobile Number</label>
                        <input id="mobile_number" name="mobile_number" type="tel" autocomplete="tel" placeholder="Enter your mobile number" value="<?= escape_html($values['mobile_number']) ?>" maxlength="20" required aria-invalid="<?= isset($errors['mobile_number']) ? 'true' : 'false' ?>">
                        <?php if (isset($errors['mobile_number'])): ?><span class="field-error"><?= escape_html($errors['mobile_number']) ?></span><?php endif; ?>
                    </div>
                    <div class="registration-field">
                        <label for="email">Email Address</label>
                        <input id="email" name="email" type="email" autocomplete="email" placeholder="Enter your email address" value="<?= escape_html($values['email']) ?>" maxlength="150" required aria-invalid="<?= isset($errors['email']) ? 'true' : 'false' ?>">
                        <?php if (isset($errors['email'])): ?><span class="field-error"><?= escape_html($errors['email']) ?></span><?php endif; ?>
                    </div>
                    <div class="registration-field">
                        <label for="whatsapp_number">WhatsApp Number</label>
                        <input id="whatsapp_number" name="whatsapp_number" type="tel" autocomplete="tel" placeholder="Enter your WhatsApp number" value="<?= escape_html($values['whatsapp_number']) ?>" maxlength="20" required aria-invalid="<?= isset($errors['whatsapp_number']) ? 'true' : 'false' ?>">
                        <?php if (isset($errors['whatsapp_number'])): ?><span class="field-error"><?= escape_html($errors['whatsapp_number']) ?></span><?php endif; ?>
                    </div>
                </div>
            </section>

            <section class="registration-section" aria-labelledby="pickup-heading">
                <div class="section-heading">
                    <h2 id="pickup-heading">Pickup address</h2>
                </div>
                <div class="registration-grid">
                    <div class="registration-field">
                        <label for="address">Address</label>
                        <input id="address" name="address" type="text" autocomplete="street-address" placeholder="Enter your street address" value="<?= escape_html($values['address']) ?>" maxlength="150" required aria-invalid="<?= isset($errors['address']) ? 'true' : 'false' ?>">
                        <?php if (isset($errors['address'])): ?><span class="field-error"><?= escape_html($errors['address']) ?></span><?php endif; ?>
                    </div>
                    <div class="registration-field">
                        <label for="city">City / Town</label>
                        <input id="city" name="city" type="text" autocomplete="address-level2" placeholder="Enter your city or town" value="<?= escape_html($values['city']) ?>" maxlength="150" required aria-invalid="<?= isset($errors['city']) ? 'true' : 'false' ?>">
                        <?php if (isset($errors['city'])): ?><span class="field-error"><?= escape_html($errors['city']) ?></span><?php endif; ?>
                    </div>
                    <div class="registration-field">
                        <label for="district">District</label>
                        <input id="district" name="district" type="text" autocomplete="address-level1" placeholder="Enter your district" value="<?= escape_html($values['district']) ?>" maxlength="150" required aria-invalid="<?= isset($errors['district']) ? 'true' : 'false' ?>">
                        <?php if (isset($errors['district'])): ?><span class="field-error"><?= escape_html($errors['district']) ?></span><?php endif; ?>
                    </div>
                </div>
            </section>

            <section class="registration-section" aria-labelledby="payout-heading">
                <div class="section-heading">
                    <h2 id="payout-heading">Bank payout details</h2>
                    <p>Bank account used for your COD settlements.</p>
                </div>
                <div class="registration-grid">
                    <div class="registration-field">
                        <label for="bank_name">Bank</label>
                        <select id="bank_name" name="bank_name" required aria-invalid="<?= isset($errors['bank_name']) ? 'true' : 'false' ?>">
                            <option value="">Select a bank</option>
                            <?php foreach ($banks as $bankCategory => $categoryBanks): ?>
                                <optgroup label="<?= escape_html($bankCategory) ?>">
                                    <?php foreach ($categoryBanks as $bank): ?>
                                        <option value="<?= escape_html($bank) ?>"<?= $values['bank_name'] === $bank ? ' selected' : '' ?>><?= escape_html($bank) ?></option>
                                    <?php endforeach; ?>
                                </optgroup>
                            <?php endforeach; ?>
                        </select>
                        <?php if (isset($errors['bank_name'])): ?><span class="field-error"><?= escape_html($errors['bank_name']) ?></span><?php endif; ?>
                    </div>
                    <div class="registration-field">
                        <label for="bank_branch">Branch</label>
                        <input id="bank_branch" name="bank_branch" type="text" placeholder="Enter your bank branch" value="<?= escape_html($values['bank_branch']) ?>" maxlength="100" required aria-invalid="<?= isset($errors['bank_branch']) ? 'true' : 'false' ?>">
                        <?php if (isset($errors['bank_branch'])): ?><span class="field-error"><?= escape_html($errors['bank_branch']) ?></span><?php endif; ?>
                    </div>
                    <div class="registration-field">
                        <label for="bank_account_number">Account number</label>
                        <input id="bank_account_number" name="bank_account_number" type="password" inputmode="numeric" autocomplete="off" placeholder="Enter bank account number" minlength="6" maxlength="20" pattern="[0-9]{6,20}" required aria-invalid="<?= isset($errors['bank_account_number']) ? 'true' : 'false' ?>">
                        <?php if (isset($errors['bank_account_number'])): ?><span class="field-error"><?= escape_html($errors['bank_account_number']) ?></span><?php endif; ?>
                    </div>
                </div>
            </section>

            <section class="registration-section security-section" aria-labelledby="security-heading">
                <div class="section-heading">
                    <h2 id="security-heading">Account security</h2>
                </div>
                <div class="registration-grid">
                    <div class="registration-field">
                        <label for="password">Create Password</label>
                        <input id="password" name="password" type="password" autocomplete="new-password" placeholder="At least 8 characters" minlength="8" required aria-invalid="<?= isset($errors['password']) ? 'true' : 'false' ?>">
                        <?php if (isset($errors['password'])): ?><span class="field-error"><?= escape_html($errors['password']) ?></span><?php endif; ?>
                    </div>
                    <div class="registration-field">
                        <label for="confirm_password">Confirm Password</label>
                        <input id="confirm_password" name="confirm_password" type="password" autocomplete="new-password" placeholder="Re-enter password" required aria-invalid="<?= isset($errors['confirm_password']) ? 'true' : 'false' ?>">
                        <span class="field-error password-match-error" aria-live="polite"><?= isset($errors['confirm_password']) ? escape_html($errors['confirm_password']) : '' ?></span>
                    </div>
                </div>
            </section>

            <div class="registration-actions">
                <label class="terms-option">
                    <input type="checkbox" name="terms" value="accepted" required<?= isset($_POST['terms']) ? ' checked' : '' ?>>
                    <span>I agree to the SpeedX Merchant <a href="#" data-policy-link>Terms &amp; Conditions</a> and <a href="#" data-policy-link>Privacy Policy</a>.</span>
                </label>
                <?php if (isset($errors['terms'])): ?><span class="field-error terms-error"><?= escape_html($errors['terms']) ?></span><?php endif; ?>
                <div class="registration-submit-row">
                    <button class="create-account-button" type="submit">Create Merchant Account</button>
                    <a class="sign-in-link" href="index.html">Already registered? <strong>Sign in</strong></a>
                </div>
            </div>
        </form>

        <footer class="registration-footer">Your account is ready to use after registration.</footer>
    </main>
</body>
</html>
