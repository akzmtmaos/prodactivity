# User Management Test Cases

## Test Case Template Structure
- **Test Scenario**: High-level description of what is being tested
- **Test Case**: Specific test case identifier and description
- **Prediction**: Expected outcome of the test
- **Test Steps**: Detailed steps to execute the test
- **Test Data**: Input data required for the test
- **Expected Result**: What should happen when the test passes
- **Post Condition**: State of the system after test execution
- **Actual Result**: To be filled during test execution

---

## 1. User Registration Test Cases

### Test Case 1.1: Successful User Registration
- **Test Scenario**: User Registration with valid data
- **Test Case**: TC_UR_001 - Valid user registration
- **Prediction**: User account should be created successfully with email verification sent
- **Test Steps**:
  1. Navigate to `/register` page
  2. Enter valid username (3-50 characters, alphanumeric + underscore only)
  3. Enter valid email address
  4. Enter strong password (8+ chars, 1 uppercase, 1 special char)
  5. Confirm password matches
  6. Check "I agree to Terms and Conditions"
  7. Click "Create Account" button
- **Test Data**:
  - Username: `testuser123`
  - Email: `test@example.com`
  - Password: `TestPass123!`
  - Confirm Password: `TestPass123!`
- **Expected Result**: 
  - Success message displayed
  - Redirected to verification page
  - Email verification sent to user's email
  - User account created but inactive until email verification
- **Post Condition**: User account exists in database, email verification pending

### Test Case 1.2: Registration with Invalid Username
- **Test Scenario**: User Registration with invalid username format
- **Test Case**: TC_UR_002 - Invalid username validation
- **Prediction**: Registration should fail with appropriate error message
- **Test Steps**:
  1. Navigate to `/register` page
  2. Enter invalid username (with special characters)
  3. Enter valid email and password
  4. Submit form
- **Test Data**:
  - Username: `test@user` (contains @ symbol)
  - Email: `test@example.com`
  - Password: `TestPass123!`
- **Expected Result**: Error message: "Username can only contain letters, numbers, and underscores"
- **Post Condition**: No user account created

### Test Case 1.3: Registration with Weak Password
- **Test Scenario**: User Registration with weak password
- **Test Case**: TC_UR_003 - Password strength validation
- **Prediction**: Registration should fail with password strength error
- **Test Steps**:
  1. Navigate to `/register` page
  2. Enter valid username and email
  3. Enter weak password (less than 8 characters)
  4. Submit form
- **Test Data**:
  - Username: `testuser`
  - Email: `test@example.com`
  - Password: `weak`
- **Expected Result**: Error message: "Password must be at least 8 characters long"
- **Post Condition**: No user account created

### Test Case 1.4: Registration with Non-matching Passwords
- **Test Scenario**: User Registration with mismatched password confirmation
- **Test Case**: TC_UR_004 - Password confirmation validation
- **Prediction**: Registration should fail with password mismatch error
- **Test Steps**:
  1. Navigate to `/register` page
  2. Enter valid username and email
  3. Enter password and different confirm password
  4. Submit form
- **Test Data**:
  - Username: `testuser`
  - Email: `test@example.com`
  - Password: `TestPass123!`
  - Confirm Password: `DifferentPass123!`
- **Expected Result**: Error message: "Passwords do not match"
- **Post Condition**: No user account created

### Test Case 1.5: Registration without Terms Agreement
- **Test Scenario**: User Registration without agreeing to terms
- **Test Case**: TC_UR_005 - Terms and conditions validation
- **Prediction**: Registration should fail with terms agreement error
- **Test Steps**:
  1. Navigate to `/register` page
  2. Enter valid username, email, and password
  3. Leave "I agree to Terms and Conditions" unchecked
  4. Submit form
- **Test Data**:
  - Username: `testuser`
  - Email: `test@example.com`
  - Password: `TestPass123!`
  - Terms Agreement: Unchecked
- **Expected Result**: Error message: "You must agree to the Terms and Conditions to register"
- **Post Condition**: No user account created

### Test Case 1.6: Registration with Existing Username
- **Test Scenario**: User Registration with already taken username
- **Test Case**: TC_UR_006 - Duplicate username validation
- **Prediction**: Registration should fail with username taken error
- **Test Steps**:
  1. Create a user account with username "testuser"
  2. Navigate to `/register` page
  3. Enter same username with different email
  4. Submit form
- **Test Data**:
  - Username: `testuser` (already exists)
  - Email: `different@example.com`
  - Password: `TestPass123!`
- **Expected Result**: Error message: "Username is already taken"
- **Post Condition**: No new user account created

### Test Case 1.7: Registration with Existing Email
- **Test Scenario**: User Registration with already registered email
- **Test Case**: TC_UR_007 - Duplicate email validation
- **Prediction**: Registration should fail with email taken error
- **Test Steps**:
  1. Create a user account with email "test@example.com"
  2. Navigate to `/register` page
  3. Enter same email with different username
  4. Submit form
- **Test Data**:
  - Username: `differentuser`
  - Email: `test@example.com` (already exists)
  - Password: `TestPass123!`
- **Expected Result**: Error message: "Email is already registered"
- **Post Condition**: No new user account created

---

## 2. User Login Test Cases

### Test Case 2.1: Successful Login with Verified Email
- **Test Scenario**: User login with verified email account
- **Test Case**: TC_UL_001 - Valid login with verified account
- **Prediction**: User should be logged in and redirected to home page
- **Test Steps**:
  1. Ensure user account exists and email is verified
  2. Navigate to `/login` page
  3. Enter valid email and password
  4. Click "Sign In" button
- **Test Data**:
  - Email: `verified@example.com`
  - Password: `TestPass123!`
- **Expected Result**: 
  - Success message: "Welcome back, [username]!"
  - Redirected to home page
  - Access token stored in localStorage
  - User authenticated
- **Post Condition**: User is logged in and can access protected routes

### Test Case 2.2: Login with Unverified Email
- **Test Scenario**: User login attempt with unverified email
- **Test Case**: TC_UL_002 - Login with unverified account
- **Prediction**: Login should fail with email verification required message
- **Test Steps**:
  1. Create user account but don't verify email
  2. Navigate to `/login` page
  3. Enter email and password
  4. Submit form
- **Test Data**:
  - Email: `unverified@example.com`
  - Password: `TestPass123!`
- **Expected Result**: 
  - Error message: "Please verify your email address before logging in"
  - "Resend verification email" link appears
- **Post Condition**: User remains on login page, not authenticated

### Test Case 2.3: Login with Invalid Credentials
- **Test Scenario**: User login with incorrect email or password
- **Test Case**: TC_UL_003 - Invalid credentials login
- **Prediction**: Login should fail with invalid credentials message
- **Test Steps**:
  1. Navigate to `/login` page
  2. Enter invalid email or password
  3. Submit form
- **Test Data**:
  - Email: `nonexistent@example.com`
  - Password: `WrongPassword123!`
- **Expected Result**: Error message: "Invalid credentials. Try again!"
- **Post Condition**: User remains on login page, not authenticated

### Test Case 2.4: Login with Empty Fields
- **Test Scenario**: User login attempt with empty fields
- **Test Case**: TC_UL_004 - Empty fields validation
- **Prediction**: Form should not submit and show validation errors
- **Test Steps**:
  1. Navigate to `/login` page
  2. Leave email field empty
  3. Leave password field empty
  4. Try to submit form
- **Test Data**:
  - Email: (empty)
  - Password: (empty)
- **Expected Result**: Browser validation prevents form submission
- **Post Condition**: User remains on login page

### Test Case 2.5: Login with Invalid Email Format
- **Test Scenario**: User login with malformed email address
- **Test Case**: TC_UL_005 - Invalid email format validation
- **Prediction**: Form should not submit due to invalid email format
- **Test Steps**:
  1. Navigate to `/login` page
  2. Enter invalid email format
  3. Enter password
  4. Try to submit form
- **Test Data**:
  - Email: `invalid-email-format`
  - Password: `TestPass123!`
- **Expected Result**: Browser validation prevents form submission
- **Post Condition**: User remains on login page

### Test Case 2.6: Password Visibility Toggle
- **Test Scenario**: Password visibility toggle functionality
- **Test Case**: TC_UL_006 - Password show/hide toggle
- **Prediction**: Password should toggle between visible and hidden
- **Test Steps**:
  1. Navigate to `/login` page
  2. Enter password in password field
  3. Click eye icon to toggle password visibility
  4. Verify password text visibility changes
- **Test Data**:
  - Password: `TestPass123!`
- **Expected Result**: 
  - Password initially hidden (dots)
  - Clicking eye icon shows password text
  - Clicking again hides password text
- **Post Condition**: Password field state toggled

---

## 3. Password Reset Test Cases

### Test Case 3.1: Successful Password Reset Request
- **Test Scenario**: User requests password reset for existing account
- **Test Case**: TC_PWR_001 - Valid password reset request
- **Prediction**: Password reset email should be sent
- **Test Steps**:
  1. Navigate to `/login` page
  2. Click "Forgot your password?" link
  3. Enter valid email address
  4. Click "Send link" button
- **Test Data**:
  - Email: `existing@example.com`
- **Expected Result**: 
  - Success message: "If an account exists for that email, a reset link has been sent"
  - Password reset email sent to user
- **Post Condition**: Password reset token generated and stored

### Test Case 3.2: Password Reset Request for Non-existent Email
- **Test Scenario**: User requests password reset for non-existent email
- **Test Case**: TC_PWR_002 - Non-existent email password reset
- **Prediction**: Same success message should be shown (security measure)
- **Test Steps**:
  1. Navigate to `/login` page
  2. Click "Forgot your password?" link
  3. Enter non-existent email address
  4. Click "Send link" button
- **Test Data**:
  - Email: `nonexistent@example.com`
- **Expected Result**: Same success message: "If an account exists for that email, a reset link has been sent"
- **Post Condition**: No email sent, no token generated

### Test Case 3.3: Password Reset with Invalid Email Format
- **Test Scenario**: User enters invalid email format for password reset
- **Test Case**: TC_PWR_003 - Invalid email format for password reset
- **Prediction**: Form should not submit due to invalid email format
- **Test Steps**:
  1. Navigate to `/login` page
  2. Click "Forgot your password?" link
  3. Enter invalid email format
  4. Try to submit form
- **Test Data**:
  - Email: `invalid-email`
- **Expected Result**: Browser validation prevents form submission
- **Post Condition**: User remains on password reset form

### Test Case 3.4: Password Reset Rate Limiting
- **Test Scenario**: User attempts multiple password reset requests
- **Test Case**: TC_PWR_004 - Rate limiting for password reset
- **Prediction**: Multiple requests should be rate limited
- **Test Steps**:
  1. Navigate to `/login` page
  2. Click "Forgot your password?" link
  3. Submit password reset request multiple times quickly
  4. Observe rate limiting behavior
- **Test Data**:
  - Email: `test@example.com`
  - Multiple rapid requests
- **Expected Result**: Rate limiting applied after 5 requests per hour
- **Post Condition**: Subsequent requests blocked temporarily

---

## 4. Email Verification Test Cases

### Test Case 4.1: Successful Email Verification
- **Test Scenario**: User verifies email using valid verification link
- **Test Case**: TC_EV_001 - Valid email verification
- **Prediction**: Email should be verified and user account activated
- **Test Steps**:
  1. Register new user account
  2. Check email for verification link
  3. Click verification link or copy URL to browser
  4. Verify email verification process
- **Test Data**:
  - Verification token: (from email)
  - User account: newly created
- **Expected Result**: 
  - Email verification successful
  - User account activated
  - Can now login successfully
- **Post Condition**: User account verified and active

### Test Case 4.2: Email Verification with Expired Token
- **Test Scenario**: User attempts to verify email with expired token
- **Test Case**: TC_EV_002 - Expired verification token
- **Prediction**: Verification should fail with expired token message
- **Test Steps**:
  1. Register new user account
  2. Wait for verification token to expire (24 hours)
  3. Try to use expired verification link
- **Test Data**:
  - Expired verification token
- **Expected Result**: Error message: "Invalid or expired verification token"
- **Post Condition**: User account remains unverified

### Test Case 4.3: Resend Verification Email
- **Test Scenario**: User requests new verification email
- **Test Case**: TC_EV_003 - Resend verification email
- **Prediction**: New verification email should be sent
- **Test Steps**:
  1. Register new user account
  2. On login page, click "Resend verification email"
  3. Enter email address
  4. Submit request
- **Test Data**:
  - Email: `unverified@example.com`
- **Expected Result**: 
  - Success message: "Verification email sent successfully"
  - New verification email sent
- **Post Condition**: New verification token generated

### Test Case 4.4: Email Verification with Invalid Token
- **Test Scenario**: User attempts to verify email with invalid token
- **Test Case**: TC_EV_004 - Invalid verification token
- **Prediction**: Verification should fail with invalid token message
- **Test Steps**:
  1. Register new user account
  2. Modify verification token in URL
  3. Try to use modified verification link
- **Test Data**:
  - Invalid verification token: `invalid_token_123`
- **Expected Result**: Error message: "Invalid or expired verification token"
- **Post Condition**: User account remains unverified

---

## 5. Account Management Test Cases

### Test Case 5.1: User Logout
- **Test Scenario**: Logged-in user logs out of the application
- **Test Case**: TC_AM_001 - User logout functionality
- **Prediction**: User should be logged out and redirected to landing page
- **Test Steps**:
  1. Login to application
  2. Navigate to any protected page
  3. Click logout button/link
  4. Verify logout process
- **Test Data**:
  - Logged-in user session
- **Expected Result**: 
  - User logged out
  - Redirected to landing page
  - Access tokens cleared from localStorage
  - Cannot access protected routes
- **Post Condition**: User session terminated

### Test Case 5.2: Session Persistence
- **Test Scenario**: User session persists across browser refresh
- **Test Case**: TC_AM_002 - Session persistence validation
- **Prediction**: User should remain logged in after browser refresh
- **Test Steps**:
  1. Login to application
  2. Navigate to protected page
  3. Refresh browser page
  4. Verify user still logged in
- **Test Data**:
  - Valid access token in localStorage
- **Expected Result**: User remains logged in after refresh
- **Post Condition**: User session maintained

### Test Case 5.3: Access Token Expiration
- **Test Scenario**: User access token expires during session
- **Test Case**: TC_AM_003 - Token expiration handling
- **Prediction**: User should be logged out when token expires
- **Test Steps**:
  1. Login to application
  2. Wait for access token to expire
  3. Try to access protected route
  4. Observe token expiration handling
- **Test Data**:
  - Expired access token
- **Expected Result**: 
  - User automatically logged out
  - Redirected to login page
  - Clear expired tokens
- **Post Condition**: User session terminated due to expired token

### Test Case 5.4: Protected Route Access
- **Test Scenario**: Unauthenticated user tries to access protected routes
- **Test Case**: TC_AM_004 - Protected route access control
- **Prediction**: User should be redirected to login page
- **Test Steps**:
  1. Ensure user is not logged in
  2. Try to access protected route directly via URL
  3. Observe access control behavior
- **Test Data**:
  - No authentication tokens
- **Expected Result**: 
  - Redirected to login page
  - Cannot access protected content
- **Post Condition**: User remains unauthenticated

---

## 6. UI/UX Test Cases

### Test Case 6.1: Responsive Design
- **Test Scenario**: Application UI adapts to different screen sizes
- **Test Case**: TC_UI_001 - Responsive design validation
- **Prediction**: UI should be usable on desktop, tablet, and mobile
- **Test Steps**:
  1. Open application on desktop browser
  2. Resize browser window to tablet size
  3. Resize browser window to mobile size
  4. Test on actual mobile device
- **Test Data**:
  - Different screen sizes and resolutions
- **Expected Result**: 
  - UI adapts appropriately to screen size
  - All functionality remains accessible
  - No horizontal scrolling on mobile
- **Post Condition**: Application usable across all device types

### Test Case 6.2: Loading States
- **Test Scenario**: Loading indicators during async operations
- **Test Case**: TC_UI_002 - Loading state validation
- **Prediction**: Loading indicators should show during operations
- **Test Steps**:
  1. Navigate to login page
  2. Enter credentials and submit
  3. Observe loading state
  4. Test registration loading state
- **Test Data**:
  - Valid login/registration data
- **Expected Result**: 
  - Loading spinner shows during submission
  - Button text changes to "Signing in..." or "Creating Account..."
  - Form disabled during loading
- **Post Condition**: Loading state properly managed

### Test Case 6.3: Error Message Display
- **Test Scenario**: Error messages display correctly
- **Test Case**: TC_UI_003 - Error message validation
- **Prediction**: Error messages should be clear and user-friendly
- **Test Steps**:
  1. Attempt login with invalid credentials
  2. Attempt registration with invalid data
  3. Observe error message display
- **Test Data**:
  - Invalid credentials and data
- **Expected Result**: 
  - Error messages appear in red styling
  - Messages are clear and actionable
  - Messages disappear when user starts typing
- **Post Condition**: Error handling works correctly

### Test Case 6.4: Form Validation Feedback
- **Test Scenario**: Real-time form validation feedback
- **Test Case**: TC_UI_004 - Form validation feedback
- **Prediction**: Users should get immediate feedback on input validation
- **Test Steps**:
  1. Navigate to registration page
  2. Enter invalid username (with special characters)
  3. Enter weak password
  4. Observe real-time validation
- **Test Data**:
  - Invalid input data
- **Expected Result**: 
  - Real-time validation errors appear
  - Password strength indicator updates
  - Form submission prevented with invalid data
- **Post Condition**: Validation feedback works correctly

---

## 7. Security Test Cases

### Test Case 7.1: SQL Injection Prevention
- **Test Scenario**: Attempt SQL injection in login/registration forms
- **Test Case**: TC_SEC_001 - SQL injection prevention
- **Prediction**: SQL injection attempts should be safely handled
- **Test Steps**:
  1. Navigate to login page
  2. Enter SQL injection payload in email field
  3. Submit form
  4. Test registration form similarly
- **Test Data**:
  - Email: `' OR '1'='1`
  - Username: `'; DROP TABLE users; --`
- **Expected Result**: 
  - No SQL errors exposed
  - Form validation prevents malicious input
  - Application continues to function normally
- **Post Condition**: Application secure against SQL injection

### Test Case 7.2: XSS Prevention
- **Test Scenario**: Attempt cross-site scripting in user inputs
- **Test Case**: TC_SEC_002 - XSS prevention
- **Prediction**: XSS attempts should be safely escaped
- **Test Steps**:
  1. Navigate to registration page
  2. Enter XSS payload in username field
  3. Submit form
  4. Check if script executes
- **Test Data**:
  - Username: `<script>alert('XSS')</script>`
- **Expected Result**: 
  - Script tags are escaped or filtered
  - No JavaScript execution
  - Application continues to function normally
- **Post Condition**: Application secure against XSS

### Test Case 7.3: CSRF Protection
- **Test Scenario**: Attempt cross-site request forgery
- **Test Case**: TC_SEC_003 - CSRF protection
- **Prediction**: CSRF attacks should be prevented
- **Test Steps**:
  1. Create malicious form that submits to login endpoint
  2. Try to submit form from different domain
  3. Observe CSRF protection behavior
- **Test Data**:
  - Malicious form with login credentials
- **Expected Result**: 
  - CSRF token validation prevents unauthorized requests
  - Form submission fails without proper token
- **Post Condition**: Application secure against CSRF

### Test Case 7.4: Password Security
- **Test Scenario**: Verify password security measures
- **Test Case**: TC_SEC_004 - Password security validation
- **Prediction**: Passwords should be properly hashed and secured
- **Test Steps**:
  1. Register new user account
  2. Check database for password storage
  3. Verify password hashing
- **Test Data**:
  - Password: `TestPass123!`
- **Expected Result**: 
  - Password stored as hash, not plain text
  - Uses secure hashing algorithm (bcrypt, Argon2, etc.)
  - Salt is used for password hashing
- **Post Condition**: Passwords securely stored

---

## 8. Performance Test Cases

### Test Case 8.1: Login Response Time
- **Test Scenario**: Measure login response time
- **Test Case**: TC_PERF_001 - Login performance
- **Prediction**: Login should complete within acceptable time
- **Test Steps**:
  1. Navigate to login page
  2. Enter valid credentials
  3. Measure time from submit to redirect
  4. Repeat multiple times
- **Test Data**:
  - Valid user credentials
  - Multiple test iterations
- **Expected Result**: 
  - Login completes within 2 seconds
  - Consistent response times
- **Post Condition**: Performance meets requirements

### Test Case 8.2: Registration Response Time
- **Test Scenario**: Measure registration response time
- **Test Case**: TC_PERF_002 - Registration performance
- **Prediction**: Registration should complete within acceptable time
- **Test Steps**:
  1. Navigate to registration page
  2. Enter valid registration data
  3. Measure time from submit to success message
  4. Repeat multiple times
- **Test Data**:
  - Valid registration data
  - Multiple test iterations
- **Expected Result**: 
  - Registration completes within 3 seconds
  - Email sending doesn't block UI
- **Post Condition**: Performance meets requirements

---

## Test Execution Notes

### Prerequisites
1. Backend server running on `http://localhost:8000`
2. Frontend application running on `http://localhost:3000`
3. Database properly configured and migrated
4. Email service configured (Gmail SMTP)
5. Test environment isolated from production

### Test Data Management
- Use unique email addresses for each test case
- Clean up test data after test execution
- Use test-specific usernames to avoid conflicts
- Reset database state between test runs if needed

### Browser Compatibility
- Test on Chrome, Firefox, Safari, and Edge
- Test on mobile browsers (iOS Safari, Chrome Mobile)
- Test responsive design on different screen sizes

### Security Considerations
- Never use real user data in tests
- Use test-specific email addresses
- Ensure test environment is isolated
- Validate all security measures are working

### Reporting
- Document actual results for each test case
- Note any deviations from expected behavior
- Include screenshots for UI-related issues
- Track performance metrics
- Report security vulnerabilities immediately
