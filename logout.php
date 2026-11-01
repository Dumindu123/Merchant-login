<?php

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    http_response_code(405);
    exit('Method not allowed.');
}

$csrfToken = (string) ($_POST['csrf_token'] ?? '');
if (
    empty($_SESSION['profile_csrf_token']) ||
    !hash_equals($_SESSION['profile_csrf_token'], $csrfToken)
) {
    http_response_code(403);
    exit('Your session expired. Refresh the page and try again.');
}

$_SESSION = [];

if (ini_get('session.use_cookies')) {
    $cookieParameters = session_get_cookie_params();
    setcookie(
        session_name(),
        '',
        time() - 42000,
        $cookieParameters['path'],
        $cookieParameters['domain'],
        $cookieParameters['secure'],
        $cookieParameters['httponly']
    );
}

session_destroy();
header('Location: index.html?logout=1');
exit;
