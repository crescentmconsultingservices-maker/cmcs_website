# Crescent Moon Consulting Services (CMCS)

Official website for Crescent Moon Consulting Services — enterprise technology advisory, zero-trust cybersecurity, multi-cloud resilience, and software engineering.

## Architecture

```text
CMCS/
├── index.html              # Main homepage (monumental design, hero video, contact form)
├── our-story.html          # Who we are (company history, leadership, principles)
├── capabilities.html       # What we can do (6 practice areas showcase)
├── careers.html            # Work with us (culture, open engineering roles)
├── privacy-policy.html     # Data protection & privacy policy
│
├── assets/
│   ├── img/                # Production images, logos, and mountain hero assets
│   └── video/              # Hero background video (background-video.mp4)
│
├── downloads/              # Client collateral (brochure.pdf, services.pdf)
├── docs/                   # DESIGN.md (design system and tokens)
├── send_mail.php           # Secure contact form handler (PHPMailer, honeypot, rate limiting)
├── mail_config.php         # SMTP mailer configuration (reads environment variables)
├── .env.example            # Example environment configuration for SMTP
└── server.js               # Local development server with range streaming & contact POST
```

## Running Locally

### With Node.js (Recommended)
```bash
node server.js
```
Open [http://localhost:3000](http://localhost:3000) in your browser. The local server handles contact form submissions live at `/send_mail.php`.

### With PHP (for live email delivery)
```bash
php -S localhost:8080
```

## Building Static CSS (Production)

The site uses static, precompiled Tailwind CSS (no slow dev CDN runtime). To recompile the styles:
```bash
npx tailwindcss@3 -i src/input.css -o assets/css/style.css --minify
```

## Configuration

SMTP credentials can be provided via environment variables (recommended for production):
```env
SMTP_HOST=crescentmoon.ai
SMTP_USER=crescentmoon
SMTP_PASS=your_secure_password
SMTP_PORT=465
SMTP_SECURE=ssl
SMTP_FROM=ravindran.p@crescentmoon.ai
SMTP_TO=ravindran.p@crescentmoon.ai
```
Or by creating a local uncommitted `mail_config.local.php` file based on `mail_config.php` (already ignored by `.gitignore`).

## Production Deployment Guide

### 1. Uploading Files
- Deploy the files to your web root (`public_html/` on cPanel/CyberPanel, or `/var/www/html/` on Nginx/Apache).
- Ensure `.rate_limit/` directory is writable by the web server process (e.g. `chmod 755 .rate_limit`). An automated `.htaccess` file inside protects this folder from direct browser access.

### 2. SMTP Credentials Setup
In production, never commit your real SMTP password to version control. Use either of these methods:
- **Option A (Environment Variables):** Set the variables (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_FROM`, `SMTP_TO`) in your hosting panel (e.g., cPanel Application Manager, systemd, or Apache `SetEnv`).
- **Option B (`mail_config.local.php`):** Create a file named `mail_config.local.php` in the site root returning an associative array with your credentials. Both standard keys (`password`, `username`, `host`) and prefixed keys (`smtp_pass`, `smtp_user`, `smtp_host`) are supported:
  ```php
  <?php
  return [
      'host'        => 'crescentmoon.ai',
      'username'    => 'crescentmoon',
      'password'    => 'YOUR_SECURE_PASSWORD',
      'port'        => 465,
      'secure'      => 'ssl',
      'from_email'  => 'ravindran.p@crescentmoon.ai',
      'from_name'   => 'Crescent Moon Contact',
      'recipient'   => 'ravindran.p@crescentmoon.ai',
      'trust_proxy' => false, // Set to true only if behind Cloudflare or reverse proxy
  ];
  ```

### 3. Cloudflare & Reverse Proxy Notes
By default, `send_mail.php` relies strictly on unforgeable `REMOTE_ADDR` from the OS TCP stack so attackers cannot spoof IP rate limits using forged request headers. If you deploy behind Cloudflare or an enterprise reverse proxy, set `'trust_proxy' => true` (or `TRUST_PROXY=true` in env) to enable parsing of `CF-Connecting-IP`, `X-Forwarded-For`, and `X-Real-IP`.

### 4. Large Media & Git LFS
If adding additional high-resolution video files or raw assets in the future, initialize Git LFS (`git lfs track "*.mp4"`) to maintain optimal repository cloning speeds.

## License & Copyright

© 2026 Crescent Moon Consulting Services. All rights reserved.
