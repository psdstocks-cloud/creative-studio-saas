# 📧 Supabase Email Templates Setup

Beautiful HTML email templates for your Creative Studio SaaS app!

---

## 🎯 Where to Add These Templates

1. Go to: https://supabase.com/dashboard/project/gvipnadjxnjznjzvxqvg/auth/templates
2. You'll see tabs for different email types
3. Copy and paste the HTML below into each template

---

## 📨 1. Confirm Signup Email

**Tab**: "Confirm signup"

### Subject Line:
```
Welcome to Creative Studio! Confirm your email
```

### HTML Template:
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirm Your Email</title>
</head>
<body style="margin: 0; padding: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <!-- Main Container -->
                <table role="presentation" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); overflow: hidden;">
                    <!-- Header with Gradient -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 40px 60px; text-align: center;">
                            <h1 style="color: #ffffff; font-size: 32px; font-weight: bold; margin: 0 0 10px;">✨ Welcome!</h1>
                            <p style="color: rgba(255, 255, 255, 0.9); font-size: 16px; margin: 0;">You're almost ready to start creating</p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                                Hi there! 👋
                            </p>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                                Thank you for signing up for <strong>Creative Studio SaaS</strong>! We're excited to have you on board.
                            </p>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 32px;">
                                To complete your registration and start using our platform, please confirm your email address by clicking the button below:
                            </p>
                            
                            <!-- CTA Button -->
                            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td align="center">
                                        <a href="{{ .ConfirmationURL }}" 
                                           style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                                            ✅ Confirm Email Address
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 32px 0 0; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                                Or copy and paste this link into your browser:<br>
                                <a href="{{ .ConfirmationURL }}" style="color: #667eea; word-break: break-all;">{{ .ConfirmationURL }}</a>
                            </p>
                            
                            <p style="color: #9ca3af; font-size: 12px; line-height: 1.5; margin: 24px 0 0;">
                                ⏰ This link will expire in 24 hours.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 30px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 10px;">
                                <strong>Creative Studio SaaS</strong><br>
                                Your AI-powered creative toolkit
                            </p>
                            <p style="color: #9ca3af; font-size: 12px; line-height: 1.5; margin: 0;">
                                If you didn't create an account, you can safely ignore this email.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
```

---

## 🔑 2. Reset Password Email

**Tab**: "Reset password"

### Subject Line:
```
Reset your Creative Studio password
```

### HTML Template:
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <!-- Main Container -->
                <table role="presentation" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); overflow: hidden;">
                    <!-- Header with Icon -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 40px 60px; text-align: center;">
                            <div style="background-color: rgba(255, 255, 255, 0.2); width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                                <span style="font-size: 40px;">🔐</span>
                            </div>
                            <h1 style="color: #ffffff; font-size: 32px; font-weight: bold; margin: 0 0 10px;">Password Reset</h1>
                            <p style="color: rgba(255, 255, 255, 0.9); font-size: 16px; margin: 0;">Let's get you back into your account</p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                                Hi there! 👋
                            </p>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                                We received a request to reset the password for your <strong>Creative Studio SaaS</strong> account.
                            </p>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 32px;">
                                Click the button below to create a new password:
                            </p>
                            
                            <!-- CTA Button -->
                            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td align="center">
                                        <a href="{{ .ConfirmationURL }}" 
                                           style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                                            🔑 Reset Password
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 32px 0 0; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                                Or copy and paste this link into your browser:<br>
                                <a href="{{ .ConfirmationURL }}" style="color: #667eea; word-break: break-all;">{{ .ConfirmationURL }}</a>
                            </p>
                            
                            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0 0; border-radius: 4px;">
                                <p style="color: #92400e; font-size: 14px; line-height: 1.5; margin: 0;">
                                    <strong>⚠️ Security Note:</strong><br>
                                    This link will expire in 1 hour for your security.
                                </p>
                            </div>
                            
                            <p style="color: #ef4444; font-size: 14px; line-height: 1.6; margin: 24px 0 0; padding: 16px; background-color: #fef2f2; border-radius: 8px; border-left: 4px solid #ef4444;">
                                <strong>❗ Didn't request this?</strong><br>
                                If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 30px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 10px;">
                                <strong>Creative Studio SaaS</strong><br>
                                Your AI-powered creative toolkit
                            </p>
                            <p style="color: #9ca3af; font-size: 12px; line-height: 1.5; margin: 0;">
                                🔒 This is a secure password reset request
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
```

---

## 🎨 3. Magic Link Email (Optional)

**Tab**: "Magic Link"

### Subject Line:
```
Your Creative Studio login link
```

### HTML Template:
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Login Link</title>
</head>
<body style="margin: 0; padding: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); overflow: hidden;">
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
                            <h1 style="color: #ffffff; font-size: 32px; font-weight: bold; margin: 0 0 10px;">✨ Your Login Link</h1>
                            <p style="color: rgba(255, 255, 255, 0.9); font-size: 16px; margin: 0;">Quick access to your account</p>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="padding: 40px;">
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                                Click the button below to sign in to your Creative Studio SaaS account:
                            </p>
                            
                            <table role="presentation" style="width: 100%;">
                                <tr>
                                    <td align="center">
                                        <a href="{{ .ConfirmationURL }}" 
                                           style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                                            🚀 Sign In Now
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="color: #9ca3af; font-size: 12px; margin: 24px 0 0;">
                                ⏰ This link expires in 1 hour.
                            </p>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="background-color: #f9fafb; padding: 30px 40px; text-align: center;">
                            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                                Creative Studio SaaS • Your AI-powered creative toolkit
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
```

---

## ✅ How to Apply Templates

### Step 1: Go to Supabase Templates Page
https://supabase.com/dashboard/project/gvipnadjxnjznjzvxqvg/auth/templates

### Step 2: For Each Email Type
1. Click on the tab (Confirm signup, Reset password, etc.)
2. **Delete** the default template
3. **Paste** the HTML template from above
4. Update the **Subject line**
5. Click **"Save"**

### Step 3: Test Your Emails
1. Go to your website: https://creative-studio-saas.pages.dev/
2. Try signing up with a test email
3. Check your inbox for the beautiful email!
4. Try "Forgot Password" to test the reset email

---

## 🎨 Features of These Templates

✅ **Beautiful gradient design** matching your app  
✅ **Mobile responsive** - looks great on all devices  
✅ **Professional styling** with modern UI  
✅ **Clear call-to-action buttons**  
✅ **Security notes** and expiration warnings  
✅ **Branded** with your app name  
✅ **Emoji icons** for visual appeal  
✅ **Fallback plain text** for email clients  

---

## 🔧 Customization

Want to customize? You can change:
- **Colors**: Change `#667eea` and `#764ba2` to match your brand
- **Fonts**: Update the `font-family` in the style tags
- **Emojis**: Replace or remove the emoji icons
- **Wording**: Edit the text to match your brand voice
- **Company name**: Replace "Creative Studio SaaS" with your name

---

## 📱 Preview in Your Email

After setting up, test by:
1. Sign up with a new email
2. Request a password reset
3. Check how the email looks in:
   - Gmail
   - Outlook
   - Apple Mail
   - Mobile email apps

---

## 🎉 You're Done!

Your users will now receive beautiful, professional emails that match your app's design! ✨

