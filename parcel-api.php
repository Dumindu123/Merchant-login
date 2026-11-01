<?php

header('Content-Type: application/json; charset=utf-8');
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

function respond(int $status, array $data): void
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function required_text(array $input, string $key, int $maxLength): string
{
    $value = $input[$key] ?? null;

    if (!is_string($value)) {
        throw new InvalidArgumentException("Enter a valid {$key}.");
    }

    $value = trim($value);

    if ($value === '' || mb_strlen($value) > $maxLength) {
        throw new InvalidArgumentException("Enter a valid {$key}.");
    }

    return $value;
}

function numeric_value(array $input, string $key, float $minimum = 0, float $maximum = 99999999.99): float
{
    $value = $input[$key] ?? null;

    if (
        !is_numeric($value) ||
        !is_finite((float) $value) ||
        (float) $value < $minimum ||
        (float) $value > $maximum
    ) {
        throw new InvalidArgumentException("Enter a valid {$key}.");
    }

    return (float) $value;
}

try {
    require_once __DIR__ . '/db.php';
    $database = database_connection();

    if (empty($_SESSION['merchant_id'])) {
        respond(401, ['error' => 'Sign in to manage your parcels.']);
    }

    $merchantId = (int) $_SESSION['merchant_id'];

    if ($_SERVER['REQUEST_METHOD'] === 'GET' && ($_GET['action'] ?? '') === 'list') {
        $parcelQuery = $database->prepare(
            'SELECT tracking_id, recipient, city, cod, status, created_at
             FROM parcels
             WHERE merchant_id = :merchant_id
             ORDER BY created_at DESC'
        );
        $parcelQuery->execute(['merchant_id' => $merchantId]);
        $parcels = array_map(static function (array $parcel): array {
            return [
                'trackingId' => $parcel['tracking_id'],
                'recipient' => $parcel['recipient'],
                'city' => $parcel['city'],
                'cod' => (float) $parcel['cod'],
                'status' => $parcel['status'],
                'createdAt' => $parcel['created_at'],
            ];
        }, $parcelQuery->fetchAll());

        respond(200, ['parcels' => $parcels]);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'GET' && ($_GET['action'] ?? '') === 'wallet') {
        $summaryQuery = $database->prepare(
            'SELECT
                COALESCE(SUM(CASE WHEN status = \'Delivered\'
                    THEN GREATEST(cod - delivery_fee - insurance, 0) ELSE 0 END), 0) AS delivered_net,
                COALESCE(SUM(CASE WHEN status = \'In Transit\' THEN cod ELSE 0 END), 0) AS in_transit_cod,
                COALESCE(SUM(CASE WHEN status = \'Pending\' THEN cod ELSE 0 END), 0) AS pending_cod,
                COALESCE(SUM(cod), 0) AS total_cod
             FROM parcels
             WHERE merchant_id = :merchant_id'
        );
        $summaryQuery->execute(['merchant_id' => $merchantId]);
        $summary = $summaryQuery->fetch();

        $transactionsQuery = $database->prepare(
            'SELECT tracking_id, status, cod, created_at
             FROM parcels
             WHERE merchant_id = :merchant_id
             ORDER BY created_at DESC
             LIMIT 20'
        );
        $transactionsQuery->execute(['merchant_id' => $merchantId]);
        $transactions = array_map(static function (array $parcel): array {
            return [
                'trackingId' => $parcel['tracking_id'],
                'status' => $parcel['status'],
                'amount' => (float) $parcel['cod'],
                'createdAt' => $parcel['created_at'],
            ];
        }, $transactionsQuery->fetchAll());

        respond(200, [
            'summary' => [
                'deliveredNet' => (float) $summary['delivered_net'],
                'inTransitCod' => (float) $summary['in_transit_cod'],
                'pendingCod' => (float) $summary['pending_cod'],
                'totalCod' => (float) $summary['total_cod'],
                'paidThisMonth' => null,
                'pendingReconciliation' => null,
            ],
            'transactions' => $transactions,
        ]);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'GET' && ($_GET['action'] ?? '') === 'settlements') {
        $summaryQuery = $database->prepare(
            'SELECT
                COALESCE(SUM(CASE WHEN status = \'Paid\' THEN net_paid ELSE 0 END), 0) AS total_settled,
                COALESCE(SUM(CASE WHEN status IN (\'Pending\', \'Processing\') THEN net_paid ELSE 0 END), 0) AS pending_amount,
                MAX(CASE WHEN status = \'Paid\' THEN paid_at ELSE NULL END) AS last_paid_at
             FROM settlements
             WHERE merchant_id = :merchant_id'
        );
        $summaryQuery->execute(['merchant_id' => $merchantId]);
        $summary = $summaryQuery->fetch();

        $settlementsQuery = $database->prepare(
            'SELECT reference_code, parcel_count, gross_cod, deductions, net_paid,
                    status, created_at, paid_at
             FROM settlements
             WHERE merchant_id = :merchant_id
             ORDER BY created_at DESC, settlement_id DESC'
        );
        $settlementsQuery->execute(['merchant_id' => $merchantId]);
        $settlements = array_map(static function (array $settlement): array {
            return [
                'reference' => $settlement['reference_code'],
                'parcelCount' => (int) $settlement['parcel_count'],
                'grossCod' => (float) $settlement['gross_cod'],
                'deductions' => (float) $settlement['deductions'],
                'netPaid' => (float) $settlement['net_paid'],
                'status' => $settlement['status'],
                'createdAt' => $settlement['created_at'],
                'paidAt' => $settlement['paid_at'],
            ];
        }, $settlementsQuery->fetchAll());

        $bankQuery = $database->prepare(
            'SELECT bank_name, bank_branch
             FROM merchants
             WHERE merchant_id = :merchant_id
             LIMIT 1'
        );
        $bankQuery->execute(['merchant_id' => $merchantId]);
        $bank = $bankQuery->fetch();

        respond(200, [
            'summary' => [
                'totalSettled' => (float) $summary['total_settled'],
                'pendingAmount' => (float) $summary['pending_amount'],
                'lastPaidAt' => $summary['last_paid_at'],
            ],
            'bank' => [
                'name' => $bank['bank_name'],
                'branch' => $bank['bank_branch'],
            ],
            'settlements' => $settlements,
        ]);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'GET' && ($_GET['action'] ?? '') === 'tracking') {
        $trackingId = strtoupper(trim((string) ($_GET['trackingId'] ?? '')));
        if ($trackingId === '') {
            respond(422, ['error' => 'Enter a tracking number to continue.']);
        }

        $parcelQuery = $database->prepare(
            'SELECT tracking_id, recipient, mobile, address, city, district,
                    cod, status, created_at
             FROM parcels
             WHERE merchant_id = :merchant_id AND tracking_id = :tracking_id
             LIMIT 1'
        );
        $parcelQuery->execute([
            'merchant_id' => $merchantId,
            'tracking_id' => $trackingId,
        ]);
        $parcel = $parcelQuery->fetch();
        if (!$parcel) {
            respond(404, ['error' => 'We could not find that tracking number. Check it and try again.']);
        }

        respond(200, [
            'trackingId' => $parcel['tracking_id'],
            'recipient' => $parcel['recipient'],
            'phone' => $parcel['mobile'],
            'address' => $parcel['address'],
            'destination' => $parcel['city'],
            'district' => $parcel['district'],
            'cod' => (float) $parcel['cod'],
            'status' => $parcel['status'],
            'bookedAt' => $parcel['created_at'],
        ]);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'GET' && ($_GET['action'] ?? '') === 'next-id') {
        $dateKey = date('ymd');
        $database->beginTransaction();

        $sequenceUpdate = $database->prepare(
            'INSERT INTO parcel_id_sequences (date_key, next_value)
             VALUES (:date_key, 1)
             ON DUPLICATE KEY UPDATE next_value = next_value + 1'
        );
        $sequenceUpdate->execute(['date_key' => $dateKey]);

        $sequenceQuery = $database->prepare(
            'SELECT next_value FROM parcel_id_sequences WHERE date_key = :date_key'
        );
        $sequenceQuery->execute(['date_key' => $dateKey]);
        $sequence = (int) $sequenceQuery->fetchColumn();
        $database->commit();

        respond(200, ['trackingId' => sprintf('SPX-%s%03d', $dateKey, $sequence)]);
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        header('Allow: GET, POST');
        respond(405, ['error' => 'Method not allowed.']);
    }

    $csrfToken = (string) ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    if (
        empty($_SESSION['profile_csrf_token']) ||
        !hash_equals($_SESSION['profile_csrf_token'], $csrfToken)
    ) {
        respond(403, ['error' => 'Your session expired. Refresh the page and try again.']);
    }

    try {
        $input = json_decode(file_get_contents('php://input'), true, 512, JSON_THROW_ON_ERROR);
    } catch (JsonException $error) {
        respond(400, ['error' => 'The parcel details were not valid JSON.']);
    }

    if (!is_array($input)) {
        respond(400, ['error' => 'The parcel details were invalid.']);
    }

    $trackingId = required_text($input, 'trackingId', 20);
    if (!preg_match('/^SPX-\d{9,}$/', $trackingId)) {
        throw new InvalidArgumentException('The parcel ID is invalid. Refresh the page and try again.');
    }

    $recipient = required_text($input, 'recipient', 100);
    $mobile = required_text($input, 'mobile', 20);
    if (!preg_match('/^[+0-9()\\s-]{7,20}$/', $mobile)) {
        throw new InvalidArgumentException('Enter a valid mobile number.');
    }

    $address = required_text($input, 'address', 180);
    $city = required_text($input, 'city', 60);
    $district = required_text($input, 'district', 60);
    $instructions = $input['instructions'] ?? '';
    if (!is_string($instructions)) {
        throw new InvalidArgumentException('Enter valid delivery instructions.');
    }

    $instructions = trim($instructions);
    if (mb_strlen($instructions) > 180) {
        throw new InvalidArgumentException('Delivery instructions must be 180 characters or fewer.');
    }

    $description = required_text($input, 'description', 120);
    $weight = numeric_value($input, 'weight');
    if (!in_array($weight, [0.5, 1.0, 2.0, 5.0, 10.0], true)) {
        throw new InvalidArgumentException('Choose a valid parcel weight.');
    }

    $cod = numeric_value($input, 'cod');
    $deliveryFee = numeric_value($input, 'delivery_fee');
    $insurance = numeric_value($input, 'insurance');
    if (!in_array($insurance, [0.0, 150.0, 300.0], true)) {
        throw new InvalidArgumentException('Choose a valid insurance option.');
    }

    $insertParcel = $database->prepare(
        'INSERT INTO parcels (
            tracking_id, merchant_id, recipient, mobile, address, city, district,
            instructions, description, weight, cod, delivery_fee, insurance
        ) VALUES (
            :tracking_id, :merchant_id, :recipient, :mobile, :address, :city, :district,
            :instructions, :description, :weight, :cod, :delivery_fee, :insurance
        )'
    );
    $insertParcel->execute([
        'tracking_id' => $trackingId,
        'merchant_id' => $merchantId,
        'recipient' => $recipient,
        'mobile' => $mobile,
        'address' => $address,
        'city' => $city,
        'district' => $district,
        'instructions' => $instructions === '' ? null : $instructions,
        'description' => $description,
        'weight' => $weight,
        'cod' => $cod,
        'delivery_fee' => $deliveryFee,
        'insurance' => $insurance,
    ]);

    respond(201, [
        'trackingId' => $trackingId,
        'createdAt' => date(DATE_ATOM),
        'message' => 'Parcel saved successfully.',
    ]);
} catch (InvalidArgumentException $error) {
    respond(422, ['error' => $error->getMessage()]);
} catch (PDOException $error) {
    if (isset($database) && $database->inTransaction()) {
        $database->rollBack();
    }

    error_log('Parcel database request failed: ' . $error->getMessage());

    if ($error->getCode() === '23000') {
        respond(409, ['error' => 'This parcel ID has already been used. Refresh the page to get a new ID.']);
    }

    respond(500, ['error' => 'Could not save the parcel. Check the database connection and try again.']);
} catch (Throwable $error) {
    if (isset($database) && $database instanceof PDO && $database->inTransaction()) {
        $database->rollBack();
    }

    error_log('Parcel API request failed: ' . $error->getMessage());
    respond(500, ['error' => 'Could not process the parcel request. Please try again.']);
}
