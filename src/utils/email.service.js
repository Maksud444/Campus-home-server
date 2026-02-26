import nodemailer from 'nodemailer'

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  })
}

// Send post approved email
export const sendPostApprovedEmail = async ({ to, userName, postTitle, postId, adminNote }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return

  const frontendUrl = process.env.FRONTEND_URL || 'https://baytino.com'

  const transporter = createTransporter()
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'Baytino <noreply@baytino.com>',
    to,
    subject: '✅ Your post has been approved - Baytino',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;padding:20px;border-radius:8px;">
        <div style="background:#10b981;padding:20px;border-radius:8px 8px 0 0;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:24px;">✅ Post Approved!</h1>
        </div>
        <div style="background:#fff;padding:30px;border-radius:0 0 8px 8px;">
          <p style="color:#374151;font-size:16px;">Hello <strong>${userName}</strong>,</p>
          <p style="color:#374151;font-size:16px;">Your post <strong>"${postTitle}"</strong> has been <span style="color:#10b981;font-weight:bold;">approved</span> and is now live on Baytino.</p>
          ${adminNote ? `<div style="background:#f0fdf4;border-left:4px solid #10b981;padding:12px;margin:16px 0;border-radius:4px;"><p style="margin:0;color:#374151;"><strong>Admin Note:</strong> ${adminNote}</p></div>` : ''}
          <div style="text-align:center;margin:24px 0;">
            <a href="${frontendUrl}/posts/${postId}" style="background:#10b981;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:16px;">View Your Post</a>
          </div>
          <p style="color:#6b7280;font-size:14px;margin-top:24px;">Thank you for using Baytino. Your post is now visible to all users.</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
          <p style="color:#9ca3af;font-size:12px;text-align:center;">Baytino - Student Housing &amp; Services</p>
        </div>
      </div>
    `,
  })
}

// Send post rejected email
export const sendPostRejectedEmail = async ({ to, userName, postTitle, adminNote }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return

  const transporter = createTransporter()
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'Baytino <noreply@baytino.com>',
    to,
    subject: '❌ Your post was not approved - Baytino',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;padding:20px;border-radius:8px;">
        <div style="background:#ef4444;padding:20px;border-radius:8px 8px 0 0;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:24px;">Post Not Approved</h1>
        </div>
        <div style="background:#fff;padding:30px;border-radius:0 0 8px 8px;">
          <p style="color:#374151;font-size:16px;">Hello <strong>${userName}</strong>,</p>
          <p style="color:#374151;font-size:16px;">Unfortunately, your post <strong>"${postTitle}"</strong> was <span style="color:#ef4444;font-weight:bold;">not approved</span>.</p>
          ${adminNote ? `<div style="background:#fef2f2;border-left:4px solid #ef4444;padding:12px;margin:16px 0;border-radius:4px;"><p style="margin:0;color:#374151;"><strong>Reason:</strong> ${adminNote}</p></div>` : ''}
          <p style="color:#374151;font-size:16px;">You can edit your post and resubmit it for review. Please make sure it follows our community guidelines.</p>
          <p style="color:#6b7280;font-size:14px;margin-top:24px;">If you have any questions, please contact our support team.</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
          <p style="color:#9ca3af;font-size:12px;text-align:center;">Baytino - Student Housing &amp; Services</p>
        </div>
      </div>
    `,
  })
}
