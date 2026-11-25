<?php
/**
 * Crescent Moon Consulting Services - Secure Contact Form Handler
 */

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
    exit;
}

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/phpmailer_vendor/autoload.php';

// Load configuration: prioritizes uncommitted mail_config.local.php if present, else mail_config.php / env
$rawConfig = [];
if (file_exists(__DIR__ . '/mail_config.local.php')) {
    $rawConfig = require __DIR__ . '/mail_config.local.php';
} elseif (file_exists(__DIR__ . '/mail_config.php')) {
    $rawConfig = require __DIR__ . '/mail_config.php';
}

// Normalize configuration keys to seamlessly support both formats (e.g., 'smtp_pass' and 'password')
$config = [
    'host'        => $rawConfig['host'] ?? $rawConfig['smtp_host'] ?? getenv('SMTP_HOST') ?: 'crescentmoon.ai',
    'username'    => $rawConfig['username'] ?? $rawConfig['smtp_user'] ?? getenv('SMTP_USER') ?: 'crescentmoon',
    'password'    => $rawConfig['password'] ?? $rawConfig['smtp_pass'] ?? getenv('SMTP_PASS') ?: '',
    'port'        => (int)($rawConfig['port'] ?? $rawConfig['smtp_port'] ?? getenv('SMTP_PORT') ?: 465),
    'secure'      => $rawConfig['secure'] ?? $rawConfig['smtp_secure'] ?? getenv('SMTP_SECURE') ?: 'ssl',
    'from_email'  => $rawConfig['from_email'] ?? $rawConfig['smtp_from'] ?? getenv('SMTP_FROM') ?: 'ravindran.p@crescentmoon.ai',
    'from_name'   => $rawConfig['from_name'] ?? $rawConfig['smtp_from_name'] ?? getenv('SMTP_FROM_NAME') ?: 'Crescent Moon Inquiries',
    'recipient'   => $rawConfig['recipient'] ?? $rawConfig['smtp_to'] ?? getenv('SMTP_TO') ?: 'ravindran.p@crescentmoon.ai',
    'trust_proxy' => $rawConfig['trust_proxy'] ?? (getenv('TRUST_PROXY') === 'true' || getenv('TRUST_PROXY') === '1'),
];

// Support both FormData / urlencoded and application/json payloads
$input = $_POST;
if (empty($input)) {
    $raw = file_get_contents('php://input');
    if (!empty($raw)) {
        $json = json_decode($raw, true);
        if (is_array($json)) {
            $input = $json;
        }
    }
}

// 1. Anti-Spam: Honeypot check (hidden bot trap)
if (!empty($input['_hp_company'])) {
    echo json_encode(['success' => true, 'message' => 'Your message has been received.']);
    exit;
}

// 2. Anti-Spam: Form fill time check (bots submit instantaneously)
if (!empty($input['_form_ts'])) {
    $elapsed = time() - (int)$input['_form_ts'];
    if ($elapsed < 1) {
        echo json_encode(['success' => true, 'message' => 'Your message has been received.']);
        exit;
    }
}

// 3. Client IP Detection (Strict & Unforgeable by Default)
function get_client_ip($trustProxy = false) {
    $remoteAddr = filter_var($_SERVER['REMOTE_ADDR'] ?? '', FILTER_VALIDATE_IP) ? $_SERVER['REMOTE_ADDR'] : '127.0.0.1';
    
    // Only parse proxy headers if TRUST_PROXY is explicitly enabled by the server admin
    if ($trustProxy) {
        if (!empty($_SERVER['HTTP_CF_CONNECTING_IP']) && filter_var($_SERVER['HTTP_CF_CONNECTING_IP'], FILTER_VALIDATE_IP)) {
            return $_SERVER['HTTP_CF_CONNECTING_IP'];
        }
        if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $ips = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
            $client = trim($ips[0]);
            if (filter_var($client, FILTER_VALIDATE_IP)) {
                return $client;
            }
        }
        if (!empty($_SERVER['HTTP_X_REAL_IP']) && filter_var($_SERVER['HTTP_X_REAL_IP'], FILTER_VALIDATE_IP)) {
            return $_SERVER['HTTP_X_REAL_IP'];
        }
    }
    
    return $remoteAddr;
}

$clientIp = get_client_ip($config['trust_proxy']);

// 4. Server-Side Rate Limiting (Isolated project storage with atomic locking & cleanup)
$storageDir = __DIR__ . '/.rate_limit';
if (!is_dir($storageDir)) {
    @mkdir($storageDir, 0750, true);
    // Multi-version Apache protection
    $htaccessContent = "<IfModule mod_authz_core.c>\n  Require all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\n  Deny from all\n</IfModule>\nOptions -Indexes\n";
    @file_put_contents($storageDir . '/.htaccess', $htaccessContent);
}

// Garbage collection: clean up expired rate files (> 1 hour old) with 5% probability
if (is_dir($storageDir) && mt_rand(1, 20) === 1) {
    $files = @glob($storageDir . '/rl_*.json');
    if (!empty($files)) {
        $now = time();
        foreach ($files as $f) {
            if ($now - @filemtime($f) > 3600) {
                @unlink($f);
            }
        }
    }
}

$rateLimitFile = is_writable($storageDir)
    ? $storageDir . '/rl_' . md5($clientIp) . '.json'
    : sys_get_temp_dir() . '/cmcs_rl_' . md5($clientIp) . '.json';

$rateData = ['count' => 0, 'start' => time()];

if (file_exists($rateLimitFile)) {
    $rawRate = @file_get_contents($rateLimitFile);
    if ($rawRate !== false) {
        $stored = json_decode($rawRate, true);
        if (is_array($stored) && isset($stored['start']) && isset($stored['count'])) {
            if (time() - $stored['start'] < 600) { // 10 minute sliding window
                $rateData = $stored;
            }
        }
    }
}

if ($rateData['count'] >= 5) {
    http_response_code(429);
    echo json_encode([
        'success' => false,
        'message' => 'Too many submissions from your connection. Please wait a few minutes before trying again.'
    ]);
    exit;
}

$rateData['count']++;
@file_put_contents($rateLimitFile, json_encode($rateData), LOCK_EX);

// Extract & Sanitize Inputs
$user_name = trim($input['user_name'] ?? '');
$user_email = trim($input['user_email'] ?? '');
$subject = trim($input['subject'] ?? 'General Technology Inquiry');
$message = trim($input['message'] ?? '');

// Header-injection prevention: strip CR and LF from all single-line header fields
$user_name = preg_replace('/[\r\n]+/', ' ', $user_name);
$subject = preg_replace('/[\r\n]+/', ' ', $subject);
$user_email = preg_replace('/[\r\n]+/', '', $user_email);

// Validation
if (empty($user_name)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Please provide your full name.']);
    exit;
}

if (empty($user_email) || !filter_var($user_email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Please provide a valid email address.']);
    exit;
}

if (empty($message)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Please provide your message requirements.']);
    exit;
}

if (strlen($message) > 5000) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Message exceeds maximum length (5,000 characters).']);
    exit;
}

try {
    $mail = new PHPMailer(true);
    $mail->CharSet = 'UTF-8';
    $mail->SMTPDebug = 0;
    $mail->isSMTP();
    $mail->Host       = $config['host'] ?? 'crescentmoon.ai';
    $mail->SMTPAuth   = true;
    $mail->Username   = $config['username'] ?? '';
    $mail->Password   = $config['password'] ?? '';
    $mail->SMTPSecure = ($config['secure'] === 'tls') ? PHPMailer::ENCRYPTION_STARTTLS : PHPMailer::ENCRYPTION_SMTPS;
    $mail->Port       = (int)($config['port'] ?? 465);

    $fromEmail = !empty($config['from_email']) ? $config['from_email'] : 'ravindran.p@crescentmoon.ai';
    $fromName  = !empty($config['from_name']) ? $config['from_name'] : 'Crescent Moon Contact';
    $mail->setFrom($fromEmail, $fromName);

    // Safely add reply-to as the visitor
    $mail->addReplyTo($user_email, $user_name);

    $recipient = !empty($config['recipient']) ? $config['recipient'] : 'ravindran.p@crescentmoon.ai';
    $mail->addAddress($recipient);

    $safeSubject = 'New Inquiry: ' . substr($subject, 0, 100) . ' (' . substr($user_name, 0, 50) . ')';
    $mail->Subject = $safeSubject;

    // Build responsive HTML Email Body
    $htmlBody = '
    <div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;">
      <div style="padding-bottom: 16px; border-bottom: 2px solid #C59A3F; margin-bottom: 20px;">
        <h2 style="margin: 0; color: #0F1C2D; font-size: 20px; font-weight: 700;">New Contact Form Submission</h2>
        <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px;">Crescent Moon Consulting Services Website</p>
      </div>
      <table cellpadding="8" cellspacing="0" border="0" style="width: 100%; border-collapse: collapse; font-size: 14px; color: #1e293b;">
        <tr>
          <td style="font-weight: 600; width: 120px; color: #475569; padding: 10px 0; border-bottom: 1px solid #e2e8f0;">Name:</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; font-weight: 500;">' . htmlspecialchars($user_name) . '</td>
        </tr>
        <tr>
          <td style="font-weight: 600; color: #475569; padding: 10px 0; border-bottom: 1px solid #e2e8f0;">Email:</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;"><a href="mailto:' . htmlspecialchars($user_email) . '" style="color: #C59A3F; text-decoration: none;">' . htmlspecialchars($user_email) . '</a></td>
        </tr>
        <tr>
          <td style="font-weight: 600; color: #475569; padding: 10px 0; border-bottom: 1px solid #e2e8f0;">Service Focus:</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">' . htmlspecialchars($subject) . '</td>
        </tr>
        <tr>
          <td style="font-weight: 600; color: #475569; padding: 10px 0; vertical-align: top;">Message:</td>
          <td style="padding: 10px 0; line-height: 1.6; white-space: pre-wrap;">' . nl2br(htmlspecialchars($message)) . '</td>
        </tr>
      </table>
      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">
        Sent securely via Crescent Moon Website Contact Form · ' . date('Y-m-d H:i:s T') . '
      </div>
    </div>';

    $mail->isHTML(true);
    $mail->Body = $htmlBody;
    $mail->AltBody = "New Inquiry from Crescent Moon Website\n\nName: $user_name\nEmail: $user_email\nSubject: $subject\n\nMessage:\n$message\n";

    $mail->send();

    echo json_encode([
        'success' => true,
        'message' => 'Thank you! Your message has been received. Our team will contact you shortly.'
    ]);
} catch (Exception $e) {
    // Log internal SMTP error safely without leaking credentials to client
    error_log('CMCS Mail Transport Error: ' . $e->getMessage());

    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Unable to send message via mail service right now. Please try again later or contact us directly at ravindran.p@crescentmoon.ai.'
    ]);
}
