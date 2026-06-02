import nodemailer from 'nodemailer';

/**
 * Creates a configured Nodemailer transporter.
 * If SMTP credentials are provided in the environment variables, it uses those.
 * Otherwise, it creates a test account using Ethereal (for local development).
 */
const createTransporter = async () => {
    if (process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS) {
        return nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }

    // Fallback to Ethereal for local testing
    console.log('⚠️ No SMTP credentials found. Creating an Ethereal test account...');
    const testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: testAccount.user, // generated ethereal user
            pass: testAccount.pass, // generated ethereal password
        },
    });
};

/**
 * Sends an email using the configured transporter.
 * @param {Object} options Email options
 * @param {String} options.to Recipient email
 * @param {String} options.subject Email subject
 * @param {String} options.html HTML body content
 */
export const sendEmail = async ({ to, subject, html }) => {
    try {
        const transporter = await createTransporter();
        const info = await transporter.sendMail({
            from: '"Intellipath" <noreply@intellipath.com>', // sender address
            to,
            subject,
            html,
        });

        console.log(`✉️ Email sent to ${to}: ${info.messageId}`);
        
        // Preview only available when sending through an Ethereal account
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
            console.log(`Preview URL: ${previewUrl}`);
        }

        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
};

/**
 * Generates the HTML body for the verification email.
 * @param {String} name User's name
 * @param {String} verificationUrl The verification URL containing the token
 * @returns {String} HTML body
 */
export const getVerificationEmailHtml = (name, verificationUrl) => {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #4c1d95;">Welcome to Intellipath, ${name}!</h2>
            <p style="color: #334155; font-size: 16px; line-height: 1.5;">
                We're excited to have you on board. To get started and access all our courses and live batches, please verify your email address by clicking the button below.
            </p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                    Verify Email Address
                </a>
            </div>
            <p style="color: #64748b; font-size: 14px;">
                If the button above doesn't work, copy and paste the following link into your browser:<br>
                <a href="${verificationUrl}" style="color: #3b82f6;">${verificationUrl}</a>
            </p>
            <p style="color: #94a3b8; font-size: 12px; margin-top: 40px; border-top: 1px solid #e2e8f0; pt-4;">
                This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
            </p>
        </div>
    `;
};

/**
 * Generates the HTML body for the suspension email.
 * @param {String} name User's name
 * @param {String} reason Reason for suspension
 * @returns {String} HTML body
 */
export const getSuspensionEmailHtml = (name, reason) => {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #fecaca; border-radius: 8px; background-color: #fef2f2;">
            <h2 style="color: #dc2626;">Account Suspended</h2>
            <p style="color: #334155; font-size: 16px; line-height: 1.5;">
                Hello ${name},
            </p>
            <p style="color: #334155; font-size: 16px; line-height: 1.5;">
                Your Intellipath account has been suspended by an administrator. You will no longer be able to log in or access your courses.
            </p>
            ${reason ? `
            <div style="background-color: #fee2e2; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #ef4444;">
                <p style="margin: 0; color: #991b1b; font-weight: bold;">Reason for suspension:</p>
                <p style="margin: 10px 0 0 0; color: #7f1d1d;">${reason}</p>
            </div>
            ` : ''}
            <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
                If you believe this is an error, please contact support.
            </p>
        </div>
    `;
};

// Newsletter subscription template
export const getNewsletterEmailHtml = (email) => {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 10px;">
            <h2 style="color: #4c1d95;">You're Subscribed! 🎉</h2>
            <p style="font-size: 16px; color: #333;">Hi there,</p>
            <p style="font-size: 16px; color: #333;">
                Thank you for subscribing to the Intellipath Newsletter with <strong>${email}</strong>!
            </p>
            <p style="font-size: 16px; color: #333;">
                You'll now receive our weekly learning resources, platform updates, and exclusive course recommendations straight to your inbox.
            </p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 14px; color: #777; text-align: center;">Intellipath v5 Learning Platform</p>
        </div>
    `;
};

// Batch join template
export const getBatchJoinEmailHtml = (userName, batchTitle) => {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 10px;">
            <h2 style="color: #4c1d95;">Welcome to ${batchTitle}! 🎓</h2>
            <p style="font-size: 16px; color: #333;">Hi ${userName},</p>
            <p style="font-size: 16px; color: #333;">You have successfully enrolled in the batch <strong>${batchTitle}</strong>.</p>
            <p style="font-size: 16px; color: #333;">Get ready to start learning, interacting with your peers, and exploring the course materials. Head over to your dashboard to view the curriculum.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 14px; color: #777; text-align: center;">Intellipath v5 Learning Platform</p>
        </div>
    `;
};

// Lecture upload template
export const getLectureUploadEmailHtml = (batchTitle, lectureTitle) => {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 10px;">
            <h2 style="color: #4c1d95;">New Lecture Uploaded 📹</h2>
            <p style="font-size: 16px; color: #333;">Hi Student,</p>
            <p style="font-size: 16px; color: #333;">A new lecture titled <strong>${lectureTitle}</strong> has just been uploaded to your batch: <strong>${batchTitle}</strong>.</p>
            <p style="font-size: 16px; color: #333;">Log in now to catch up on the latest material!</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 14px; color: #777; text-align: center;">Intellipath v5 Learning Platform</p>
        </div>
    `;
};

// Assignment created template
export const getAssignmentCreatedEmailHtml = (batchTitle, assignmentTitle) => {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 10px;">
            <h2 style="color: #4c1d95;">New Assignment Posted 📝</h2>
            <p style="font-size: 16px; color: #333;">Hi Student,</p>
            <p style="font-size: 16px; color: #333;">A new assignment titled <strong>${assignmentTitle}</strong> has been added to your batch: <strong>${batchTitle}</strong>.</p>
            <p style="font-size: 16px; color: #333;">Be sure to check your dashboard for the deadline and instructions!</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 14px; color: #777; text-align: center;">Intellipath v5 Learning Platform</p>
        </div>
    `;
};

// Assignment graded template
export const getAssignmentGradedEmailHtml = (userName, assignmentTitle, score) => {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 10px;">
            <h2 style="color: #4c1d95;">Assignment Graded ✅</h2>
            <p style="font-size: 16px; color: #333;">Hi ${userName},</p>
            <p style="font-size: 16px; color: #333;">Your submission for <strong>${assignmentTitle}</strong> has been reviewed and graded.</p>
            <p style="font-size: 16px; color: #333;">Your Score: <strong>${score}</strong></p>
            <p style="font-size: 16px; color: #333;">Log in to view detailed feedback from your instructor.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 14px; color: #777; text-align: center;">Intellipath v5 Learning Platform</p>
        </div>
    `;
};

// Quiz created template
export const getQuizCreatedEmailHtml = (batchTitle, quizTitle) => {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 10px;">
            <h2 style="color: #4c1d95;">New Quiz Available 🧠</h2>
            <p style="font-size: 16px; color: #333;">Hi Student,</p>
            <p style="font-size: 16px; color: #333;">A new quiz titled <strong>${quizTitle}</strong> is now available in your batch: <strong>${batchTitle}</strong>.</p>
            <p style="font-size: 16px; color: #333;">Good luck testing your knowledge!</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 14px; color: #777; text-align: center;">Intellipath v5 Learning Platform</p>
        </div>
    `;
};

// Query created template (for Instructor)
export const getQueryCreatedEmailHtml = (instructorName, studentName, queryTitle) => {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 10px;">
            <h2 style="color: #4c1d95;">New Student Query ❓</h2>
            <p style="font-size: 16px; color: #333;">Hi ${instructorName},</p>
            <p style="font-size: 16px; color: #333;">A student (${studentName}) has raised a new query: <strong>${queryTitle}</strong>.</p>
            <p style="font-size: 16px; color: #333;">Please log in to your dashboard to review and reply.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 14px; color: #777; text-align: center;">Intellipath v5 Learning Platform</p>
        </div>
    `;
};

// Query replied template
export const getQueryRepliedEmailHtml = (userName, queryTitle) => {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 10px;">
            <h2 style="color: #4c1d95;">New Reply to Your Query 💬</h2>
            <p style="font-size: 16px; color: #333;">Hi ${userName},</p>
            <p style="font-size: 16px; color: #333;">There is a new reply on the query thread: <strong>${queryTitle}</strong>.</p>
            <p style="font-size: 16px; color: #333;">Log in to the platform to read the response.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 14px; color: #777; text-align: center;">Intellipath v5 Learning Platform</p>
        </div>
    `;
};
