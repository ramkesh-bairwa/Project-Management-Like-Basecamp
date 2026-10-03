# Password Reset Feature

## Overview
Complete password reset functionality for both ChatMe and Projects platforms.

## Database Migration
Run the migration to add reset token columns:
```bash
psql -U your_user -d your_database -f database/migrations/add_password_reset_tokens.sql
```

## Flow
1. User clicks "Forgot?" link on login page
2. User enters email on forgot password page
3. System generates reset token and stores in database
4. Reset link is logged to console (in production, send via email)
5. User clicks reset link with token
6. User enters new password
7. Password is updated and user is redirected to login

## Pages
- `/forgot-password/chatme` - ChatMe forgot password (purple branding)
- `/forgot-password/projects` - Projects forgot password (red branding)
- `/reset-password?token=xxx` - Reset password page (universal, located in (auth) folder)

## API Routes
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token

## Email Integration (TODO)
Currently, reset links are logged to console. To enable email:
1. Install email service (SendGrid, AWS SES, Nodemailer, etc.)
2. Update `/api/auth/forgot-password/route.ts` to send email
3. Uncomment and implement the sendEmail function

## Security Features
- Tokens expire after 1 hour
- Tokens are single-use (cleared after reset)
- Email existence is not revealed (security best practice)
- Passwords must be minimum 6 characters
- Passwords are hashed with bcrypt

## Note
The old generic `/forgot-password` page in the (auth) folder was removed to avoid conflicts.
Now we have separate branded pages for ChatMe and Projects.
