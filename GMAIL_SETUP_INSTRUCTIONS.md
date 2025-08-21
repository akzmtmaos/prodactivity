# Gmail SMTP Setup Instructions

## Why emails aren't being sent:

The email verification system is set up but you need to configure your Gmail SMTP settings. Currently, the system is trying to use Gmail SMTP but doesn't have your credentials.

## Step 1: Enable 2-Factor Authentication on Gmail

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

## Step 3: Create .env file

Create a file named `.env` in the `backend` directory with the following content:

```env
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

**Replace:**
- `your-email@gmail.com` with your actual Gmail address
- `your-16-character-app-password` with the App Password you generated

## Step 4: Run Database Migrations

```bash
cd backend
venv\Scripts\Activate
python manage.py migrate
```

## Step 5: Test Email Configuration

```bash
cd backend
venv\Scripts\Activate
python test_email.py
```

This will test if your Gmail SMTP setup is working correctly.

## Step 6: Test Registration

1. Start your backend server: `python manage.py runserver`
2. Start your frontend: `npm start`
3. Try registering a new account
4. Check your Gmail inbox (and spam folder) for the verification email

## Troubleshooting

### Common Issues:

1. **"Authentication failed" error**
   - Make sure you're using an App Password, not your regular Gmail password
   - Ensure 2-Factor Authentication is enabled

2. **"Connection refused" error**
   - Check that your firewall isn't blocking port 587
   - Verify your internet connection

3. **Emails not sending**
   - Check the Django logs for detailed error messages
   - Verify all environment variables are set correctly in `.env`

4. **Emails going to spam**
   - Add your Gmail address to the recipient's contacts
   - Check spam folder
   - Consider using a dedicated email service like SendGrid for production

## Alternative: Use Console Backend for Testing

If you want to test without Gmail setup, you can temporarily change the email backend to console:

In `backend/core/settings.py`, change:
```python
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
```

This will print emails to the console instead of sending them, which is useful for development/testing.
