<?php
/**
 * Crescent Moon Consulting Services
 * Main SMTP Mailer Configuration
 *
 * NOTE: For production deployments, define these values using environment variables
 * (e.g., in your CyberPanel / Apache / Docker / systemd environment)
 * or provide them in mail_config.local.php (which is strictly ignored by git).
 *
 * DO NOT hardcode sensitive passwords into this repository file.
 */

return [
    'host'      => getenv('SMTP_HOST') ?: 'crescentmoon.ai',
    'username'  => getenv('SMTP_USER') ?: 'crescentmoon',
    'password'  => getenv('SMTP_PASS') ?: '', // Empty by default; loaded from mail_config.local.php or env
    'port'      => (int)(getenv('SMTP_PORT') ?: 465),
    'secure'    => getenv('SMTP_SECURE') ?: 'ssl',
    'from_email'=> getenv('SMTP_FROM') ?: 'ravindran.p@crescentmoon.ai',
    'from_name' => getenv('SMTP_FROM_NAME') ?: 'Crescent Moon Inquiries',
    'recipient' => getenv('SMTP_TO') ?: 'ravindran.p@crescentmoon.ai',
];
