<?php

function database_connection(): PDO
{
    $host = getenv('SPEEDX_DB_HOST') ?: '127.0.0.1';
    $database = getenv('SPEEDX_DB_NAME') ?: 'merchant login';
    $username = getenv('SPEEDX_DB_USER') ?: 'root';
    $password = getenv('SPEEDX_DB_PASSWORD');

    if ($password === false) {
        $password = '';
    }

    $dsn = sprintf(
        'mysql:host=%s;dbname=%s;charset=utf8mb4',
        $host,
        $database
    );

    return new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
}
?>