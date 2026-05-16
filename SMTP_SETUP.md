# SMTP Email Configuration for Password Reset

## Add these to your .env.local file:

# SMTP Server Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Email From Details
SMTP_FROM_NAME=ProjectHub
SMTP_FROM_EMAIL=noreply@projecthub.com

## Gmail Setup Instructions:

1. Go to your Google Account settings
2. Enable 2-Step Verification
3. Go to Security > 2-Step Verification > App passwords
4. Generate an app password for "Mail"
5. Use that app password in SMTP_PASS

## Other SMTP Providers:

### SendGrid:
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key

### AWS SES:
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-smtp-username
SMTP_PASS=your-ses-smtp-password

### Mailgun:
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@your-domain.mailgun.org
SMTP_PASS=your-mailgun-password

### Outlook/Office365:
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password

## Testing:

After configuration, the system will:
1. Show a loader while sending email
2. Send a beautifully formatted HTML email with reset link
3. Log success/failure in console
4. If email fails, still show success (security) but log link to console
