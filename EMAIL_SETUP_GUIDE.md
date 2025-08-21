# Email Verification Setup Guide

This guide will help you set up Gmail SMTP for email verification and password reset functionality in your Prodactivity application.

## Prerequisites

1. A Gmail account
2. Access to your Gmail account settings
3. The ability to generate App Passwords

## Step 1: Enable 2-Factor Authentication

1. Go to your Google Account settings: https://myaccount.google.com/
2. Navigate to "Security"
3. Enable "2-Step Verification" if not already enabled

## Step 2: Generate an App Password

1. In your Google Account settings, go to "Security"
2. Find "2-Step Verification" and click on it
3. Scroll down to "App passwords"
4. Click "Generate" to create a new app password
5. Select "Mail" as the app type
6. Copy the generated 16-character password (it will look like: `abcd efgh ijkl mnop`)

## Step 3: Configure Environment Variables

Create a `.env` file in the `backend` directory with the following variables:

```env
# Django Settings
DJANGO_SECRET_KEY=your-secret-key-here
DEBUG=True

# Database Settings
DB_NAME=prodactivity_db
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_HOST=localhost
DB_PORT=5432

# Hugging Face API Key
HUGGINGFACE_API_KEY=your-huggingface-api-key

# Email Configuration (Gmail SMTP)
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-16-character-app-password

# Email Verification Settings
EMAIL_VERIFICATION_REQUIRED=True
EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS=24
PASSWORD_RESET_TOKEN_EXPIRE_HOURS=1

# Site Settings
SITE_NAME=Prodactivity
FRONTEND_URL=http://localhost:3000
DEFAULT_FROM_EMAIL=your-email@gmail.com
```

## Step 4: Update Database Schema

Run the following commands to apply the new email verification fields:

```bash
cd backend
venv\Scripts\Activate
python manage.py makemigrations accounts
python manage.py migrate
```

## Step 5: Test Email Configuration

First, test your email configuration:

```bash
cd backend
venv\Scripts\Activate
python test_email.py
```

This will help you verify that your Gmail SMTP setup is working correctly before testing the full application.

## Step 6: Update Database Schema

Run the following commands to apply the new email verification fields:

```bash
cd backend
venv\Scripts\Activate
python manage.py makemigrations accounts
python manage.py migrate
```

## Step 7: Test the Complete Setup

1. Start your backend server:
   ```bash
   cd backend
   venv\Scripts\Activate
   python manage.py runserver
   ```

2. Start your frontend:
   ```bash
   cd frontend
   npm start
   ```

3. **Test Registration Flow:**
   - Go to `/register` and create a new account
   - You should see a beautiful verification success modal
   - Check your email for the verification link
   - Click the verification link to activate your account
   - Try logging in with your new account

4. **Test Password Reset:**
   - Go to `/login` and click "Forgot your password?"
   - Enter your email address
   - Check your email for the password reset link
   - Use the link to reset your password

## Features Implemented

### Backend Features
- ✅ Gmail SMTP integration
- ✅ Email verification for new user registration
- ✅ Password reset via email
- ✅ Secure token generation and validation
- ✅ HTML email templates with responsive design
- ✅ Token expiration handling
- ✅ Rate limiting for email requests

### Frontend Features
- ✅ Email verification page
- ✅ **Registration success modal** with clear verification instructions
- ✅ Resend verification email modal
- ✅ Enhanced login with email verification status
- ✅ Password reset page
- ✅ Beautiful UI with animations and smooth transitions

### Email Templates
- ✅ Professional HTML email templates
- ✅ Mobile-responsive design
- ✅ Branded with your app's colors
- ✅ Clear call-to-action buttons
- ✅ Security notices and warnings

## Security Features

1. **Token Security**: 32-character random tokens with expiration
2. **Rate Limiting**: Prevents email spam (5/hour for password reset, 10/minute for login)
3. **Token Expiration**: Verification tokens expire in 24 hours, password reset in 1 hour
4. **Single Use**: Tokens are deleted after use
5. **No Information Leakage**: Responses don't reveal whether an email exists

## Troubleshooting

### Common Issues

1. **"Authentication failed" error**
   - Make sure you're using an App Password, not your regular Gmail password
   - Ensure 2-Factor Authentication is enabled

2. **"Connection refused" error**
   - Check that your firewall isn't blocking port 587
   - Verify your internet connection

3. **Emails not sending**
   - Check the Django logs for detailed error messages
   - Verify all environment variables are set correctly
   - Ensure the Gmail account has "Less secure app access" disabled (use App Passwords instead)

4. **Emails going to spam**
   - Add your Gmail address to the recipient's contacts
   - Check spam folder
   - Consider using a dedicated email service like SendGrid for production

### Testing Email Configuration

You can test your email setup by running:

```bash
cd backend
venv\Scripts\Activate
python manage.py shell
```

Then in the shell:

```python
from django.core.mail import send_mail
from django.conf import settings

send_mail(
    'Test Email',
    'This is a test email from your Django app.',
    settings.DEFAULT_FROM_EMAIL,
    ['your-test-email@example.com'],
    fail_silently=False,
)
```

## Production Considerations

For production deployment:

1. **Use a dedicated email service** like SendGrid, Mailgun, or AWS SES
2. **Set up proper DNS records** (SPF, DKIM, DMARC)
3. **Monitor email delivery rates**
4. **Implement email queue system** for better performance
5. **Use environment-specific settings**

## Support

If you encounter any issues:

1. Check the Django logs for error messages
2. Verify all environment variables are correctly set
3. Test with a simple email first
4. Ensure your Gmail account settings are properly configured

The email verification system is now fully integrated and ready to use!
