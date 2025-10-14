// Professional Email template definitions optimized for deliverability and spam prevention
// Enhanced with simplified HTML structure and improved text-to-image ratio for better inbox placement

export const emailTemplates = {
  // Spam-optimized base template with maximum deliverability focus
  base: `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="format-detection" content="telephone=no">
    <meta name="format-detection" content="date=no">
    <meta name="format-detection" content="address=no">
    <meta name="format-detection" content="email=no">
    <meta name="x-apple-disable-message-reformatting">
    <title>{{title}}</title>

    <!--[if gte mso 9]>
    <xml>
        <o:OfficeDocumentSettings>
            <o:AllowPNG/>
            <o:PixelsPerInch>96</o:PixelsPerInch>
        </o:OfficeDocumentSettings>
    </xml>
    <![endif]-->
    <style type="text/css">
        /* Spam-optimized CSS with simplified selectors and improved deliverability */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body, table, td, p, a, li, blockquote {
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
        }

        table, td {
            mso-table-lspace: 0pt;
            mso-table-rspace: 0pt;
            border-collapse: collapse;
        }

        img {
            -ms-interpolation-mode: bicubic;
            border: 0;
            height: auto;
            line-height: 100%;
            outline: none;
            text-decoration: none;
            display: block;
            max-width: 100%;
        }

        /* Simplified client-specific fixes */
        .gmail-fix {
            display: none !important;
        }

        .outlook-group-fix {
            width: 100% !important;
        }

        body {
            font-family: Arial, Helvetica, sans-serif;
            line-height: 1.5;
            color: #2c2c2c;
            background-color: #f5f5f5;
            margin: 0;
            padding: 0;
            width: 100% !important;
            min-width: 100%;
        }

        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border: 1px solid #e0e0e0;
        }

        /* Simplified responsive styles */
        .container {
            width: 100%;
            max-width: 600px;
        }

        .mobile-padding {
            padding-left: 20px;
            padding-right: 20px;
        }

        .mobile-center {
            text-align: center;
        }

        .mobile-hide {
            display: table-cell;
        }

        .mobile-full-width {
            width: auto;
            height: auto;
        }

        /* Simplified header styles with better spam score */
        .email-header {
            background-color: #C79F12;
            padding: 30px 20px;
            text-align: center;
        }

        .brand-logo {
            display: inline-block;
            width: 50px;
            height: 50px;
            background: #ffffff;
            border-radius: 50%;
            line-height: 50px;
            text-align: center;
            margin-bottom: 15px;
        }

        .brand-logo span {
            font-size: 24px;
            font-weight: bold;
            color: #C79F12;
        }

        .header-title {
            font-size: 28px;
            font-weight: bold;
            color: #ffffff;
            margin: 0 0 5px 0;
        }

        .header-subtitle {
            font-size: 16px;
            color: #ffffff;
            margin: 0;
            font-weight: normal;
        }

        /* Simplified content styles */
        .email-content {
            padding: 30px 20px;
            background-color: #ffffff;
        }

        .content-title {
            font-size: 24px;
            font-weight: bold;
            color: #2c2c2c;
            margin: 0 0 20px 0;
            text-align: center;
            line-height: 1.3;
        }

        .content-text {
            font-size: 16px;
            color: #555555;
            line-height: 1.5;
            margin: 0 0 15px 0;
            text-align: left;
        }

        .content-card {
            background: #f9f9f9;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            border: 1px solid #e0e0e0;
        }

        /* Simplified OTP Code styles for better deliverability */
        .otp-container {
            background-color: #C79F12;
            border-radius: 8px;
            padding: 25px 20px;
            text-align: center;
            margin: 25px 0;
            border: 2px solid #B8900F;
        }

        .otp-label {
            font-size: 14px;
            color: #ffffff;
            margin-bottom: 15px;
            font-weight: bold;
        }

        .otp-code-wrapper {
            background-color: #ffffff;
            border-radius: 6px;
            padding: 15px;
            margin: 15px 0;
            border: 1px solid #e0e0e0;
        }

        .otp-code {
            font-size: 32px;
            font-weight: bold;
            color: #2c2c2c;
            letter-spacing: 8px;
            font-family: 'Courier New', monospace;
            margin: 0;
            line-height: 1.2;
        }

        .otp-expiry {
            font-size: 13px;
            color: #ffffff;
            font-weight: normal;
            margin: 10px 0 0 0;
        }

        /* Instructions styles */
        .instructions-container {
            background: #ffffff;
            border-radius: 16px;
            padding: 32px;
            margin: 32px 0;
            border-left: 6px solid #C79F12;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
        }

        .instructions-title {
            font-size: 20px;
            color: #2D2D2D;
            margin: 0 0 24px 0;
            font-weight: 700;
            text-align: center;
        }

        .instruction-step {
            display: flex;
            align-items: flex-start;
            margin-bottom: 16px;
            padding: 16px;
            background: #F8F9FA;
            border-radius: 12px;
        }

        .step-number {
            background: #C79F12;
            color: white;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            font-weight: 700;
            font-size: 14px;
            flex-shrink: 0;
            margin-right: 16px;
        }

        .step-text {
            color: #4A4A4A;
            font-size: 16px;
            line-height: 1.5;
            margin: 0;
        }

        /* Warning/Security Notice styles */
        .security-notice {
            background: linear-gradient(135deg, #FFF8E1 0%, #FFF3CD 100%);
            border: 2px solid #F0C674;
            border-radius: 16px;
            padding: 24px;
            margin: 32px 0;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
        }

        .security-icon {
            background: #F0C674;
            border-radius: 50%;
            width: 32px;
            height: 32px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 12px;
        }

        .security-title {
            font-size: 18px;
            color: #8B4513;
            margin: 0 0 12px 0;
            font-weight: 700;
        }

        .security-text {
            font-size: 15px;
            color: #8B4513;
            margin: 0;
            line-height: 1.6;
            font-weight: 500;
            text-align: left;
        }

        /* Benefits/Features section */
        .benefits-container {
            background: #ffffff;
            border-radius: 16px;
            padding: 32px;
            margin: 32px 0;
            text-align: center;
            border: 1px solid rgba(199, 159, 18, 0.1);
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
        }

        .benefits-title {
            font-size: 20px;
            color: #2D2D2D;
            margin: 0 0 16px 0;
            font-weight: 700;
        }

        .benefits-text {
            font-size: 16px;
            color: #4A4A4A;
            margin: 0 0 24px 0;
            line-height: 1.6;
        }

        /* Enhanced benefits grid for better email client compatibility */
        .benefits-grid {
            width: 100%;
            margin-top: 8px;
        }

        .benefit-item {
            text-align: center;
            min-width: 120px;
            padding: 20px 12px;
            vertical-align: top;
        }

        .benefit-icon {
            font-size: 36px;
            line-height: 1;
            margin: 0;
            display: inline-block;
        }

        .benefit-text {
            font-size: 14px;
            color: #2D2D2D;
            font-weight: 600;
            margin: 0;
            line-height: 1.3;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        /* Enhanced logo alignment styles */
        .logo-container {
            text-align: center;
            margin: 0 auto;
        }

        .logo-circle {
            display: inline-block;
            border-radius: 50%;
            text-align: center;
            vertical-align: middle;
            position: relative;
        }

        .logo-text {
            display: inline-block;
            vertical-align: middle;
            line-height: 1;
        }

        /* CTA Button */
        .cta-container {
            text-align: center;
            margin: 32px 0;
        }

        .cta-text {
            font-size: 16px;
            color: #666666;
            margin: 0 0 20px 0;
            line-height: 1.6;
        }

        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #C79F12 0%, #D17327 100%);
            color: #ffffff;
            text-decoration: none;
            padding: 14px 28px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            box-shadow: 0 4px 12px rgba(199, 159, 18, 0.3);
            transition: all 0.3s ease;
        }

        .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(199, 159, 18, 0.4);
        }

        /* Signature */
        .signature {
            text-align: center;
            margin: 40px 0 0 0;
            padding: 32px 0 0 0;
            border-top: 2px solid #F0F0F0;
        }

        .signature-regards {
            font-size: 18px;
            color: #2D2D2D;
            margin: 0 0 8px 0;
            font-weight: 600;
        }

        .signature-team {
            font-size: 20px;
            color: #C79F12;
            margin: 0 0 4px 0;
            font-weight: 700;
        }

        .signature-tagline {
            font-size: 16px;
            color: #666666;
            margin: 0;
            font-style: italic;
        }

        /* Footer styles */
        .email-footer {
            background: linear-gradient(135deg, #2D2D2D 0%, #1A1A1A 100%);
            color: #ffffff;
            text-align: center;
            padding: 40px 30px;
        }

        .footer-logo {
            display: inline-block;
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, #C79F12 0%, #D17327 100%);
            border-radius: 50%;
            line-height: 40px;
            text-align: center;
            margin-bottom: 12px;
        }

        .footer-logo span {
            font-size: 20px;
            font-weight: 700;
            color: #ffffff;
        }

        .footer-brand {
            font-size: 18px;
            font-weight: 700;
            color: #ffffff;
            margin: 0 0 24px 0;
        }

        .footer-links {
            margin-bottom: 24px;
        }

        .footer-link {
            color: #C79F12;
            text-decoration: none;
            margin: 0 12px;
            font-weight: 500;
            font-size: 14px;
        }

        .footer-link:hover {
            text-decoration: underline;
        }

        .footer-separator {
            color: #666666;
            margin: 0 4px;
        }

        .footer-copyright {
            border-top: 1px solid #404040;
            padding-top: 20px;
        }

        .copyright-text {
            font-size: 14px;
            color: #CCCCCC;
            margin: 0;
            line-height: 1.5;
        }

        .copyright-tagline {
            color: #999999;
            font-size: 12px;
        }

        /* Enhanced responsive styles for mobile devices */
        @media only screen and (max-width: 600px) {
            .container {
                width: 100% !important;
                max-width: 100% !important;
            }

            .mobile-padding {
                padding-left: 20px !important;
                padding-right: 20px !important;
            }

            .mobile-center {
                text-align: center !important;
            }

            .mobile-hide {
                display: none !important;
            }

            .mobile-full-width {
                width: 100% !important;
                height: auto !important;
            }

            .email-container {
                margin: 0 !important;
                box-shadow: none !important;
            }

            .email-header,
            .email-content,
            .email-footer {
                padding: 30px 20px !important;
            }

            .content-title {
                font-size: 24px !important;
            }

            .header-title {
                font-size: 28px !important;
            }

            .otp-code {
                font-size: 32px !important;
                letter-spacing: 8px !important;
            }

            .instruction-step {
                flex-direction: column !important;
                text-align: center !important;
            }

            .step-number {
                margin: 0 auto 8px auto !important;
            }

            /* Enhanced mobile benefits grid */
            .benefits-grid {
                width: 100% !important;
            }

            .benefit-item {
                width: 100% !important;
                display: block !important;
                padding: 16px 8px !important;
                margin-bottom: 16px !important;
            }

            .benefit-icon {
                font-size: 28px !important;
                margin-bottom: 8px !important;
            }

            .benefit-text {
                font-size: 13px !important;
            }

            /* Enhanced mobile logo styles */
            .logo-circle {
                width: 50px !important;
                height: 50px !important;
            }

            .logo-text {
                font-size: 24px !important;
            }

            .footer-links {
                flex-direction: column !important;
                gap: 8px !important;
            }

            .footer-link {
                display: block !important;
                margin: 4px 0 !important;
            }

            .footer-separator {
                display: none !important;
            }
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
            .content-card {
                background: #1f2937 !important;
                color: #ffffff !important;
            }

            .content-text {
                color: #d1d5db !important;
            }

            .step-text {
                color: #d1d5db !important;
            }

            .instruction-step {
                background: #374151 !important;
            }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">

    <!-- Preheader text (hidden but shows in email preview) -->
    <div style="display: none; font-size: 1px; color: #f8fafc; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
        {{preheader}}
    </div>

    <!-- Main container table for maximum email client compatibility -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0; padding: 0; background-color: #f8fafc;">
        <tr>
            <td align="center" style="padding: 20px 0;">
                <!-- Email wrapper with enhanced compatibility -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="container" style="margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); overflow: hidden;">
                    {{content}}

                    <!-- Spacer for mobile -->
                    <tr>
                        <td style="height: 20px; line-height: 20px;">&nbsp;</td>
                    </tr>
                </table>

                <!-- Additional spacer for mobile -->
                <div style="height: 40px; line-height: 40px;">&nbsp;</div>
            </td>
        </tr>
    </table>
</body>
</html>
  `,

  // Spam-optimized OTP Verification template with simplified inline styles
  otpVerification: `
<tr>
    <td style="padding: 0; margin: 0;">
        <!-- Header Section - Enhanced logo alignment -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #C79F12;">
            <tr>
                <td style="padding: 40px 20px; text-align: center; vertical-align: middle;">
                    <!-- Brand Logo Container -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                        <tr>
                            <td style="text-align: center;">
                                <!-- Brand Logo -->
                                <div style="display: inline-block; width: 60px; height: 60px; background: #ffffff; border-radius: 50%; margin: 0 auto 20px auto; position: relative;">
                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="60" height="60" style="border-radius: 50%;">
                                        <tr>
                                            <td style="text-align: center; vertical-align: middle; line-height: 60px;">
                                                <span style="font-size: 28px; font-weight: bold; color: #C79F12; font-family: Arial, Helvetica, sans-serif; display: inline-block; vertical-align: middle; line-height: 1;">H</span>
                                            </td>
                                        </tr>
                                    </table>
                                </div>

                                <!-- Header Title -->
                                <h1 style="font-size: 32px; font-weight: bold; color: #ffffff; margin: 0 0 8px 0; font-family: Arial, Helvetica, sans-serif; line-height: 1.2; text-align: center;">Hamsoya</h1>

                                <!-- Header Subtitle -->
                                <p style="font-size: 16px; color: #ffffff; margin: 0; font-weight: normal; font-family: Arial, Helvetica, sans-serif; line-height: 1.4; text-align: center; opacity: 0.95;">Your trusted organic marketplace</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </td>
</tr>
<tr>
    <td style="padding: 30px 20px; background-color: #ffffff;">
        <!-- Main Content -->
        <h2 style="font-size: 24px; font-weight: bold; color: #2c2c2c; margin: 0 0 20px 0; text-align: center; line-height: 1.3; font-family: Arial, Helvetica, sans-serif;">Verify Your Email Address</h2>

        <!-- Welcome Message -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #f9f9f9; border-radius: 8px; margin: 20px 0; border: 1px solid #e0e0e0;">
            <tr>
                <td style="padding: 20px;">
                    <p style="font-size: 16px; color: #555555; line-height: 1.5; margin: 0; text-align: left; font-family: Arial, Helvetica, sans-serif;">
                        Hi <strong style="color: #2c2c2c; font-weight: bold;">{{name}}</strong>,<br><br>
                        Welcome to Hamsoya! To complete your account setup and start exploring our organic marketplace, please verify your email address using the verification code below.
                    </p>
                </td>
            </tr>
        </table>

        <!-- OTP Code Section -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #C79F12; border-radius: 8px; margin: 25px 0; border: 2px solid #B8900F; text-align: center;">
            <tr>
                <td style="padding: 25px 20px; text-align: center;">
                    <div style="color: #ffffff; font-size: 14px; font-weight: bold; margin-bottom: 15px; font-family: Arial, Helvetica, sans-serif;">Your Verification Code</div>
                    <div style="background-color: #ffffff; border-radius: 6px; padding: 15px; margin: 15px 0; border: 1px solid #e0e0e0;">
                        <div style="font-size: 32px; font-weight: bold; color: #2c2c2c; letter-spacing: 8px; font-family: 'Courier New', monospace; line-height: 1.2;">{{otp}}</div>
                    </div>
                    <div style="color: #ffffff; font-size: 13px; font-weight: normal; font-family: Arial, Helvetica, sans-serif;">
                        This code expires in 5 minutes
                    </div>
                </td>
            </tr>
        </table>

        <!-- Instructions Section -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #f9f9f9; border-radius: 8px; margin: 20px 0; border: 1px solid #e0e0e0;">
            <tr>
                <td style="padding: 20px;">
                    <h3 style="font-size: 18px; font-weight: bold; color: #2c2c2c; margin: 0 0 15px 0; font-family: Arial, Helvetica, sans-serif;">
                        How to verify your account:
                    </h3>

                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                            <td style="padding: 8px 0; vertical-align: top;">
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                    <tr>
                                        <td style="width: 35px; vertical-align: top;">
                                            <div style="width: 25px; height: 25px; background-color: #C79F12; border-radius: 50%; color: #ffffff; font-weight: bold; font-size: 14px; line-height: 25px; text-align: center; font-family: Arial, Helvetica, sans-serif;">1</div>
                                        </td>
                                        <td style="padding-left: 12px; vertical-align: top;">
                                            <p style="font-size: 15px; color: #555555; line-height: 1.4; margin: 0; font-family: Arial, Helvetica, sans-serif;">Copy the verification code from the box above</p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; vertical-align: top;">
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                    <tr>
                                        <td style="width: 35px; vertical-align: top;">
                                            <div style="width: 25px; height: 25px; background-color: #C79F12; border-radius: 50%; color: #ffffff; font-weight: bold; font-size: 14px; line-height: 25px; text-align: center; font-family: Arial, Helvetica, sans-serif;">2</div>
                                        </td>
                                        <td style="padding-left: 12px; vertical-align: top;">
                                            <p style="font-size: 15px; color: #555555; line-height: 1.4; margin: 0; font-family: Arial, Helvetica, sans-serif;">Return to the Hamsoya verification page in your browser</p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; vertical-align: top;">
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                    <tr>
                                        <td style="width: 35px; vertical-align: top;">
                                            <div style="width: 25px; height: 25px; background-color: #C79F12; border-radius: 50%; color: #ffffff; font-weight: bold; font-size: 14px; line-height: 25px; text-align: center; font-family: Arial, Helvetica, sans-serif;">3</div>
                                        </td>
                                        <td style="padding-left: 12px; vertical-align: top;">
                                            <p style="font-size: 15px; color: #555555; line-height: 1.4; margin: 0; font-family: Arial, Helvetica, sans-serif;">Enter the 6-digit code in the verification field</p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0 0 0; vertical-align: top;">
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                    <tr>
                                        <td style="width: 35px; vertical-align: top;">
                                            <div style="width: 25px; height: 25px; background-color: #C79F12; border-radius: 50%; color: #ffffff; font-weight: bold; font-size: 14px; line-height: 25px; text-align: center; font-family: Arial, Helvetica, sans-serif;">4</div>
                                        </td>
                                        <td style="padding-left: 12px; vertical-align: top;">
                                            <p style="font-size: 15px; color: #555555; line-height: 1.4; margin: 0; font-family: Arial, Helvetica, sans-serif;">Click "Verify & Continue" to complete your registration</p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>

        <!-- Security Notice -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #FFF8DC; border-radius: 8px; margin: 20px 0; border: 1px solid #F0C674;">
            <tr>
                <td style="padding: 20px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                            <td style="width: 50px; vertical-align: top;">
                                <div style="width: 35px; height: 35px; background-color: #F0C674; border-radius: 50%; line-height: 35px; text-align: center;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                ">
                                    <span style="font-size: 16px;">🔒</span>
                                </div>
                            </td>
                            <td style="padding-left: 12px; vertical-align: top;">
                                <h4 style="font-size: 16px; font-weight: bold; color: #8B4513; margin: 0 0 5px 0; font-family: Arial, Helvetica, sans-serif;

                                ">Security Notice</h4>
                                <p style="font-size: 14px; color: #8B4513; line-height: 1.4; margin: 0; font-family: Arial, Helvetica, sans-serif;">
                                    This verification code is valid for 5 minutes only. If you didn't request this verification, please ignore this email or contact our support team.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>

        <!-- Benefits Section -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #ffffff; border-radius: 16px; margin: 24px 0; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08); border: 1px solid rgba(199, 159, 18, 0.1);">
            <tr>
                <td style="padding: 32px;">
                    <h4 style="font-size: 20px; font-weight: 700; color: #2D2D2D; margin: 0 0 16px 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">What's Next?</h4>
                    <p style="font-size: 16px; color: #4A4A4A; line-height: 1.6; margin: 0 0 24px 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                        Once verified, you'll have full access to browse our organic food marketplace, place orders, and manage your account preferences.
                    </p>

                    <!-- Benefits Grid - Fixed alignment and added missing third column -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 8px;">
                        <tr>
                            <!-- Fresh Organic -->
                            <td style="width: 33.33%; text-align: center; padding: 20px 12px; vertical-align: top;">
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                    <tr>
                                        <td style="text-align: center; padding-bottom: 12px;">
                                            <div style="font-size: 36px; line-height: 1; margin: 0; display: inline-block;">🥬</div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="text-align: center;">
                                            <div style="font-size: 14px; font-weight: 600; color: #2D2D2D; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.3; margin: 0;">Fresh Organic</div>
                                        </td>
                                    </tr>
                                </table>
                            </td>

                            <!-- Fast Delivery -->
                            <td style="width: 33.33%; text-align: center; padding: 20px 12px; vertical-align: top;">
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                    <tr>
                                        <td style="text-align: center; padding-bottom: 12px;">
                                            <div style="font-size: 36px; line-height: 1; margin: 0; display: inline-block;">🚚</div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="text-align: center;">
                                            <div style="font-size: 14px; font-weight: 600; color: #2D2D2D; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.3; margin: 0;">Fast Delivery</div>
                                        </td>
                                    </tr>
                                </table>
                            </td>

                            <!-- Eco-Friendly -->
                            <td style="width: 33.33%; text-align: center; padding: 20px 12px; vertical-align: top;">
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                    <tr>
                                        <td style="text-align: center; padding-bottom: 12px;">
                                            <div style="font-size: 36px; line-height: 1; margin: 0; display: inline-block;">💚</div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="text-align: center;">
                                            <div style="font-size: 14px; font-weight: 600; color: #2D2D2D; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.3; margin: 0;">Eco-Friendly</div>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>

        <!-- Contact Support -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0;">
            <tr>
                <td style="text-align: center; padding: 24px;">
                    <p style="font-size: 16px; color: #4A4A4A; margin: 0 0 20px 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">Need help? We're here for you!</p>
                    <a href="mailto:support@hamsoya.com" style="display: inline-block; background: linear-gradient(135deg, #C79F12 0%, #D17327 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 16px rgba(199, 159, 18, 0.3); font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">Contact Support</a>
                </td>
            </tr>
        </table>

        <!-- Signature -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 32px 0 0 0;">
            <tr>
                <td style="text-align: center; padding: 24px 0;">
                    <p style="font-size: 16px; color: #4A4A4A; margin: 0 0 4px 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">Best regards,</p>
                    <p style="font-size: 18px; font-weight: 700; color: #C79F12; margin: 0 0 4px 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">The Hamsoya Team</p>
                    <p style="font-size: 14px; color: #6B7280; margin: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">Your trusted organic food marketplace</p>
                </td>
            </tr>
        </table>
    </td>
</tr>
<tr>
    <td style="padding: 0; margin: 0;">
        <!-- Footer Section - Enhanced logo alignment -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #2c2c2c;">
            <tr>
                <td style="padding: 40px 20px; text-align: center; vertical-align: middle;">
                    <!-- Footer Logo Container -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                        <tr>
                            <td style="text-align: center;">
                                <!-- Footer Logo -->
                                <div style="display: inline-block; width: 50px; height: 50px; background-color: #C79F12; border-radius: 50%; margin: 0 auto 16px auto; position: relative;">
                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="50" height="50" style="border-radius: 50%;">
                                        <tr>
                                            <td style="text-align: center; vertical-align: middle; line-height: 50px;">
                                                <span style="font-size: 24px; font-weight: bold; color: #ffffff; font-family: Arial, Helvetica, sans-serif; display: inline-block; vertical-align: middle; line-height: 1;">H</span>
                                            </td>
                                        </tr>
                                    </table>
                                </div>

                                <!-- Footer Brand -->
                                <div style="font-size: 22px; font-weight: bold; color: #ffffff; margin-bottom: 20px; font-family: Arial, Helvetica, sans-serif; text-align: center; line-height: 1.2;">Hamsoya</div>

                    <!-- Footer Links -->
                    <div style="margin-bottom: 15px;">
                        <a href="https://hamsoya.com" style="color: #cccccc; text-decoration: none; font-size: 13px; font-family: Arial, Helvetica, sans-serif;">Website</a>
                        <span style="color: #888888; margin: 0 6px; font-family: Arial, Helvetica, sans-serif;">•</span>
                        <a href="https://hamsoya.com/privacy" style="color: #cccccc; text-decoration: none; font-size: 13px; font-family: Arial, Helvetica, sans-serif;">Privacy</a>
                        <span style="color: #888888; margin: 0 6px; font-family: Arial, Helvetica, sans-serif;">•</span>
                        <a href="https://hamsoya.com/terms" style="color: #cccccc; text-decoration: none; font-size: 13px; font-family: Arial, Helvetica, sans-serif;">Terms</a>
                        <span style="color: #888888; margin: 0 6px; font-family: Arial, Helvetica, sans-serif;">•</span>
                        <a href="mailto:support@hamsoya.com" style="color: #cccccc; text-decoration: none; font-size: 13px; font-family: Arial, Helvetica, sans-serif;">Support</a>
                    </div>

                    <!-- Footer Copyright -->
                    <div>
                        <p style="font-size: 12px; color: #999999; margin: 0; line-height: 1.4; font-family: Arial, Helvetica, sans-serif;">
                            &copy; ${new Date().getFullYear()} Hamsoya. All rights reserved.<br>
                            <span style="color: #777777;">Your trusted organic food marketplace</span>
                        </p>
                    </div>
                </td>
            </tr>
        </table>
    </td>
</tr>
  `,

  // Enhanced Password Reset template
  passwordReset: `
<tr>
    <td>
        <!-- Header Section -->
        <div class="email-header" style="background: linear-gradient(135deg, #DC2626 0%, #EF4444 100%);">
            <div class="brand-logo">
                <span style="color: #DC2626;">H</span>
            </div>
            <h1 class="header-title">Hamsoya</h1>
            <p class="header-subtitle">Password Reset Request</p>
        </div>
    </td>
</tr>
<tr>
    <td class="email-content">
        <!-- Main Content -->
    <h2 class="content-title">Reset Your Password</h2>

    <!-- Welcome Message -->
    <div class="content-card">
        <p class="content-text">
            Hello <strong style="color: #2D2D2D; font-weight: 600;">{{name}}</strong>,<br><br>
            We received a request to reset your password for your Hamsoya account. If you made this request, please use the verification code below to proceed:
        </p>
    </div>

    <!-- OTP Code Section -->
    <div class="otp-container" style="background: linear-gradient(135deg, #DC2626 0%, #EF4444 100%);">
        <div class="otp-label">Reset Code</div>
        <div class="otp-code-wrapper">
            <div class="otp-code">{{otp}}</div>
        </div>
        <div class="otp-expiry">
            ⏰ This code expires in 10 minutes
        </div>
    </div>

    <!-- Security Guidelines -->
    <div class="instructions-container">
        <h3 class="instructions-title">
            🔐 For your security:
        </h3>

        <div class="instruction-step">
            <div class="step-number" style="background: #DC2626;">1</div>
            <div class="step-text">Never share this code with anyone</div>
        </div>

        <div class="instruction-step">
            <div class="step-number" style="background: #DC2626;">2</div>
            <div class="step-text">Our team will never ask for this code</div>
        </div>

        <div class="instruction-step">
            <div class="step-number" style="background: #DC2626;">3</div>
            <div class="step-text">Use a strong, unique password</div>
        </div>

        <div class="instruction-step" style="margin-bottom: 0;">
            <div class="step-number" style="background: #DC2626;">4</div>
            <div class="step-text">Enable two-factor authentication if available</div>
        </div>
    </div>

    <!-- Enhanced Security Notice -->
    <div class="security-notice" style="background: linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%); border-color: #F87171;">
        <div class="security-icon" style="background: #F87171;">
            <span style="font-size: 20px;">⚠️</span>
        </div>
        <h4 class="security-title" style="color: #991B1B;">Important Security Notice</h4>
        <p class="security-text" style="color: #991B1B;">
            This reset code will expire in <strong>10 minutes</strong>. If you didn't request a password reset, please ignore this email and consider changing your password as a precaution.
        </p>
    </div>

    <!-- Contact Support -->
    <div class="cta-container">
        <p class="cta-text">If you continue to have issues accessing your account, please contact our support team immediately.</p>
        <a href="https://hamsoya.com/security" class="cta-button" style="background: linear-gradient(135deg, #DC2626 0%, #EF4444 100%);">Security Center</a>
    </div>

    <!-- Signature -->
    <div class="signature">
        <p class="signature-regards">Best regards,</p>
        <p class="signature-team" style="color: #DC2626;">The Hamsoya Security Team</p>
        <p class="signature-tagline">Protecting your account 24/7</p>
        </div>
    </td>
</tr>
<tr>
    <td>
        <!-- Footer Section -->
        <div class="email-footer">
            <div class="footer-logo">
                <span>H</span>
            </div>
            <div class="footer-brand">Hamsoya</div>

            <div class="footer-links">
                <a href="https://hamsoya.com" class="footer-link">Website</a>
                <span class="footer-separator">•</span>
                <a href="https://hamsoya.com/contact" class="footer-link">Contact Support</a>
                <span class="footer-separator">•</span>
                <a href="https://hamsoya.com/security" class="footer-link">Security Center</a>
            </div>

            <div class="footer-copyright">
                <p class="copyright-text">
                    &copy; ${new Date().getFullYear()} Hamsoya. All rights reserved.<br>
                    <span class="copyright-tagline">Your trusted organic food marketplace</span>
                </p>
            </div>
        </div>
    </td>
</tr>
  `,

  // Enhanced Welcome email template
  welcome: `
<tr>
    <td>
        <!-- Header Section -->
        <div class="email-header" style="background: linear-gradient(135deg, #059669 0%, #10B981 100%);">
            <div class="brand-logo">
                <span style="color: #059669;">H</span>
            </div>
            <h1 class="header-title">Welcome to Hamsoya!</h1>
            <p class="header-subtitle">Your journey starts here</p>
        </div>
    </td>
</tr>
<tr>
    <td class="email-content">
        <!-- Main Content -->
    <h2 class="content-title">Welcome aboard, {{name}}! 🎉</h2>

    <!-- Welcome Message -->
    <div class="content-card">
        <p class="content-text">
            Congratulations! Your email has been successfully verified and your Hamsoya account is now active. We're thrilled to have you join our organic food community!
        </p>
    </div>

    <!-- Next Steps -->
    <div class="instructions-container">
        <h3 class="instructions-title">
            🚀 What's next?
        </h3>

        <div class="instruction-step">
            <div class="step-number" style="background: #059669;">1</div>
            <div class="step-text">Complete your profile setup</div>
        </div>

        <div class="instruction-step">
            <div class="step-number" style="background: #059669;">2</div>
            <div class="step-text">Explore our product catalog</div>
        </div>

        <div class="instruction-step">
            <div class="step-number" style="background: #059669;">3</div>
            <div class="step-text">Set up your preferences</div>
        </div>

        <div class="instruction-step" style="margin-bottom: 0;">
            <div class="step-number" style="background: #059669;">4</div>
            <div class="step-text">Join our community</div>
        </div>
    </div>

    <!-- Special Welcome Offer -->
    <div class="security-notice" style="background: linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%); border-color: #10B981;">
        <div class="security-icon" style="background: #10B981;">
            <span style="font-size: 20px;">🎁</span>
        </div>
        <h4 class="security-title" style="color: #065F46;">Welcome Gift!</h4>
        <p class="security-text" style="color: #065F46;">
            As a welcome gift, enjoy <strong>15% off</strong> your first order! Use code <strong>WELCOME15</strong> at checkout.
        </p>
    </div>

    <!-- Ready to Start CTA -->
    <div class="benefits-container" style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-color: #0369a1;">
        <h4 class="benefits-title" style="color: #0369a1;">Ready to get started?</h4>
        <p class="benefits-text">
            Your organic food journey begins now. Discover fresh, healthy, and sustainable products delivered right to your door.
        </p>
        <a href="https://hamsoya.com/dashboard" class="cta-button" style="background: linear-gradient(135deg, #059669 0%, #10B981 100%);">Go to Dashboard</a>
    </div>

    <!-- Community Features -->
    <div class="benefits-container">
        <h4 class="benefits-title">Join Our Community</h4>
        <p class="benefits-text">
            Connect with fellow organic food enthusiasts and discover new recipes, tips, and sustainable living practices.
        </p>
        <!-- Benefits Grid - Table-based for better alignment -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 8px;">
            <tr>
                <!-- Community -->
                <td style="width: 33.33%; text-align: center; padding: 20px 12px; vertical-align: top;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                            <td style="text-align: center; padding-bottom: 12px;">
                                <div style="font-size: 36px; line-height: 1; margin: 0; display: inline-block;">👥</div>
                            </td>
                        </tr>
                        <tr>
                            <td style="text-align: center;">
                                <div style="font-size: 14px; font-weight: 600; color: #2D2D2D; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.3; margin: 0;">Community</div>
                            </td>
                        </tr>
                    </table>
                </td>

                <!-- Recipes -->
                <td style="width: 33.33%; text-align: center; padding: 20px 12px; vertical-align: top;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                            <td style="text-align: center; padding-bottom: 12px;">
                                <div style="font-size: 36px; line-height: 1; margin: 0; display: inline-block;">📚</div>
                            </td>
                        </tr>
                        <tr>
                            <td style="text-align: center;">
                                <div style="font-size: 14px; font-weight: 600; color: #2D2D2D; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.3; margin: 0;">Recipes</div>
                            </td>
                        </tr>
                    </table>
                </td>

                <!-- Tips & Guides -->
                <td style="width: 33.33%; text-align: center; padding: 20px 12px; vertical-align: top;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                            <td style="text-align: center; padding-bottom: 12px;">
                                <div style="font-size: 36px; line-height: 1; margin: 0; display: inline-block;">💡</div>
                            </td>
                        </tr>
                        <tr>
                            <td style="text-align: center;">
                                <div style="font-size: 14px; font-weight: 600; color: #2D2D2D; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.3; margin: 0;">Tips & Guides</div>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </div>

    <!-- Contact Support -->
    <div class="cta-container">
        <p class="cta-text">If you have any questions or need help getting started, our support team is here to help!</p>
        <a href="https://hamsoya.com/help" class="cta-button" style="background: linear-gradient(135deg, #059669 0%, #10B981 100%);">Help Center</a>
    </div>

    <!-- Signature -->
    <div class="signature">
        <p class="signature-regards">Welcome to the Hamsoya family!</p>
        <p class="signature-team" style="color: #059669;">The Hamsoya Team</p>
        <p class="signature-tagline">Your trusted organic food marketplace</p>
        </div>
    </td>
</tr>
<tr>
    <td>
        <!-- Footer Section -->
        <div class="email-footer">
            <div class="footer-logo">
                <span>H</span>
            </div>
            <div class="footer-brand">Hamsoya</div>

            <div class="footer-links">
                <a href="https://hamsoya.com" class="footer-link">Website</a>
                <span class="footer-separator">•</span>
                <a href="https://hamsoya.com/help" class="footer-link">Help Center</a>
                <span class="footer-separator">•</span>
                <a href="https://hamsoya.com/community" class="footer-link">Community</a>
            </div>

            <div class="footer-copyright">
                <p class="copyright-text">
                    &copy; ${new Date().getFullYear()} Hamsoya. All rights reserved.<br>
                    <span class="copyright-tagline">Your trusted organic food marketplace</span>
                </p>
            </div>
        </div>
    </td>
</tr>
  `,
};

// Template types
export type EmailTemplateType = keyof typeof emailTemplates;

// Template data interfaces
export interface OTPTemplateData {
  name: string;
  otp: string;
}

export interface PasswordResetTemplateData {
  name: string;
  otp: string;
}

export interface WelcomeTemplateData {
  name: string;
}

// Template data union type
export type TemplateData = OTPTemplateData | PasswordResetTemplateData | WelcomeTemplateData;

// Enhanced template data interface for compatibility
export interface EnhancedTemplateData {
  title?: string;
  preheader?: string;
  name?: string;
  otp?: string;
  [key: string]: any;
}

// Enhanced template type for compatibility
export type EnhancedTemplateType = EmailTemplateType;

// Enhanced template renderer with better error handling and validation
export function renderTemplate(template: string, data: Record<string, any>): string {
  // Validate required data
  if (!template || typeof template !== 'string') {
    throw new Error('Template must be a non-empty string');
  }

  if (!data || typeof data !== 'object') {
    throw new Error('Data must be an object');
  }

  // Define which keys should NOT be HTML escaped (for HTML content)
  const htmlContentKeys = ['content', 'html', 'body'];

  // Replace template variables with actual values
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = data[key];

    // Handle undefined values
    if (value === undefined || value === null) {
      console.warn(`Template variable '${key}' is undefined or null`);
      return match; // Return the original placeholder
    }

    const stringValue = String(value);

    // Don't escape HTML for content keys (like {{content}} in base template)
    if (htmlContentKeys.includes(key.toLowerCase())) {
      return stringValue;
    }

    // Escape HTML entities for security for user data (name, otp, etc.)
    return stringValue
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  });
}

// Utility function to get template with base wrapper
export function getFullTemplate(templateType: EmailTemplateType, data: TemplateData): string {
  const baseTemplate = emailTemplates.base;
  const contentTemplate = emailTemplates[templateType];

  if (!contentTemplate) {
    throw new Error(`Template '${templateType}' not found`);
  }

  // First render the content template with data
  const renderedContent = renderTemplate(contentTemplate, data);

  // Then render the base template with the rendered content and title
  const title = getTemplateTitle(templateType);
  const preheader = getTemplatePreheader(templateType, data);
  return renderTemplate(baseTemplate, {
    title,
    preheader,
    content: renderedContent,
  });
}

// Helper function to get appropriate title for each template
function getTemplateTitle(templateType: EmailTemplateType): string {
  const titles: Record<EmailTemplateType, string> = {
    base: 'Hamsoya',
    otpVerification: 'Verify Your Email - Hamsoya',
    passwordReset: 'Password Reset - Hamsoya',
    welcome: 'Welcome to Hamsoya!',
  };

  return titles[templateType] || 'Hamsoya';
}

// Email validation utility
export function validateEmailData(templateType: EmailTemplateType, data: any): boolean {
  const requiredFields: Record<EmailTemplateType, string[]> = {
    base: [],
    otpVerification: ['name', 'otp'],
    passwordReset: ['name', 'otp'],
    welcome: ['name'],
  };

  const required = requiredFields[templateType] || [];

  for (const field of required) {
    if (!data[field] || typeof data[field] !== 'string' || data[field].trim() === '') {
      console.error(`Missing or invalid required field: ${field}`);
      return false;
    }
  }

  // Validate OTP format if present
  if (data.otp && !/^\d{6}$/.test(data.otp)) {
    console.error('OTP must be exactly 6 digits');
    return false;
  }

  return true;
}

// Enhanced template rendering utility for compatibility
export function renderEnhancedTemplate(template: string, data: EnhancedTemplateData): string {
  return renderTemplate(template, data);
}

// Enhanced full template function for compatibility
export function getEnhancedFullTemplate(
  templateType: EnhancedTemplateType,
  data: EnhancedTemplateData
): string {
  const baseTemplate = emailTemplates.base;
  const contentTemplate = emailTemplates[templateType];

  if (!contentTemplate) {
    throw new Error(`Enhanced template '${templateType}' not found`);
  }

  // Set default values with enhanced data structure
  const templateData = {
    title: data.title || getTemplateTitle(templateType),
    preheader: data.preheader || getTemplatePreheader(templateType, data),
    ...data,
  };

  // First render the content template
  const renderedContent = renderTemplate(contentTemplate, templateData);

  // Then render the base template with the content
  return renderTemplate(baseTemplate, {
    ...templateData,
    content: renderedContent,
  });
}

// Helper function to get appropriate preheader for each template
function getTemplatePreheader(templateType: EmailTemplateType, data: any): string {
  const preheaders: Record<EmailTemplateType, string> = {
    base: 'Hamsoya - Your trusted organic food marketplace',
    otpVerification: data?.otp
      ? `Your verification code is ${data.otp}. Complete your Hamsoya account setup.`
      : 'Verify your email to complete your Hamsoya account setup',
    passwordReset: data?.otp
      ? `Your password reset code is ${data.otp}. Reset your Hamsoya account password.`
      : 'Reset your Hamsoya account password securely',
    welcome: 'Your Hamsoya account is now active. Start exploring organic products!',
  };

  return preheaders[templateType] || 'Hamsoya - Your trusted organic food marketplace';
}

// Test email generation (for development)
export function generateTestEmail(templateType: EmailTemplateType): string {
  const testData: Record<EmailTemplateType, any> = {
    base: {},
    otpVerification: { name: 'John Doe', otp: '123456' },
    passwordReset: { name: 'Jane Smith', otp: '654321' },
    welcome: { name: 'Alex Johnson' },
  };

  const data = testData[templateType];

  if (!validateEmailData(templateType, data)) {
    throw new Error(`Invalid test data for template: ${templateType}`);
  }

  return getFullTemplate(templateType, data);
}
