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
├── terms.html              # Terms of engagement & standard commercial terms
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
Or by creating a local uncommitted `mail_config.local.php` file based on `mail_config.php`.

## License & Copyright

© 2026 Crescent Moon Consulting Services. All rights reserved.
