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
$config = [];
if (file_exists(__DIR__ . '/mail_config.local.php')) {
    $config = require __DIR__ . '/mail_config.local.php';
} elseif (file_exists(__DIR__ . '/mail_config.php')) {
    $config = require __DIR__ . '/mail_config.php';
}

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

// 3. Robust Client IP Detection (Supports Cloudflare, AWS ALB, Nginx & Apache reverse proxies)
function get_client_ip() {
    if (!empty($_SERVER['HTTP_CF_CONNECTING_IP'])) {
        return filter_var($_SERVER['HTTP_CF_CONNECTING_IP'], FILTER_VALIDATE_IP) ? $_SERVER['HTTP_CF_CONNECTING_IP'] : 'invalid_cf_ip';
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
    return filter_var($_SERVER['REMOTE_ADDR'] ?? '', FILTER_VALIDATE_IP) ? $_SERVER['REMOTE_ADDR'] : '127.0.0.1';
}

$clientIp = get_client_ip();

// 4. Server-Side Rate Limiting (Isolated project storage with fallback)
$storageDir = __DIR__ . '/.rate_limit';
if (!is_dir($storageDir)) {
    @mkdir($storageDir, 0750, true);
    // Protect rate limit directory from web access
    @file_put_contents($storageDir . '/.htaccess', "Require all denied\nDeny from all\n");
}

$rateLimitFile = is_writable($storageDir)
    ? $storageDir . '/rl_' . md5($clientIp) . '.json'
    : sys_get_temp_dir() . '/cmcs_rl_' . md5($clientIp) . '.json';

$rateData = ['count' => 0, 'start' => time()];

if (file_exists($rateLimitFile)) {
    $stored = json_decode(@file_get_contents($rateLimitFile), true);
    if (is_array($stored) && isset($stored['start']) && isset($stored['count'])) {
        if (time() - $stored['start'] < 600) { // 10 minute window
            $rateData = $stored;
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
@file_put_contents($rateLimitFile, json_encode($rateData));

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
