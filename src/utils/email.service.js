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

const isEmailConfigured = () => !!(process.env.EMAIL_USER && process.env.EMAIL_PASS && !process.env.EMAIL_PASS.includes('your-gmail'))

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://baytino.com'
const FROM = process.env.EMAIL_FROM || 'Baytino <baytino24@gmail.com>'

// ─── Shared HTML wrapper ─────────────────────────────────────
const wrapEmail = (headerColor, headerContent, bodyContent) => `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f3f4f6;padding:20px;border-radius:12px;">
  <div style="background:${headerColor};padding:24px 30px;border-radius:12px 12px 0 0;text-align:center;">
    ${headerContent}
  </div>
  <div style="background:#ffffff;padding:30px;border-radius:0 0 12px 12px;">
    ${bodyContent}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
    <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;">
      © 2025 Baytino — Student Housing &amp; Services in Egypt<br>
      <a href="${FRONTEND_URL}" style="color:#6b7280;text-decoration:none;">${FRONTEND_URL}</a>
    </p>
  </div>
</div>`

// ─── 1. Post Approved Email ──────────────────────────────────
export const sendPostApprovedEmail = async ({ to, userName, postTitle, postId, adminNote }) => {
  if (!isEmailConfigured()) return

  const transporter = createTransporter()
  await transporter.sendMail({
    from: FROM,
    to,
    subject: '✅ Your post has been approved — Baytino',
    html: wrapEmail(
      '#10b981',
      `<h1 style="color:#fff;margin:0;font-size:22px;">✅ Post Approved!</h1>`,
      `<p style="color:#374151;font-size:16px;">Hello <strong>${userName}</strong>,</p>
       <p style="color:#374151;font-size:15px;">Great news! Your post <strong>"${postTitle}"</strong> has been <span style="color:#10b981;font-weight:bold;">approved</span> and is now live on Baytino.</p>
       ${adminNote ? `<div style="background:#f0fdf4;border-left:4px solid #10b981;padding:12px 16px;margin:16px 0;border-radius:4px;"><strong style="color:#374151;">Admin Note:</strong><p style="margin:4px 0 0;color:#374151;">${adminNote}</p></div>` : ''}
       <div style="text-align:center;margin:28px 0;">
         <a href="${FRONTEND_URL}/posts/${postId}" style="background:#10b981;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">View Your Post →</a>
       </div>
       <p style="color:#6b7280;font-size:14px;">Users can now find and contact you through your post. Good luck!</p>`
    ),
  })
}

// ─── 2. Post Rejected Email ──────────────────────────────────
export const sendPostRejectedEmail = async ({ to, userName, postTitle, adminNote }) => {
  if (!isEmailConfigured()) return

  const transporter = createTransporter()
  await transporter.sendMail({
    from: FROM,
    to,
    subject: '❌ Your post was not approved — Baytino',
    html: wrapEmail(
      '#ef4444',
      `<h1 style="color:#fff;margin:0;font-size:22px;">Post Not Approved</h1>`,
      `<p style="color:#374151;font-size:16px;">Hello <strong>${userName}</strong>,</p>
       <p style="color:#374151;font-size:15px;">Unfortunately, your post <strong>"${postTitle}"</strong> was <span style="color:#ef4444;font-weight:bold;">not approved</span> at this time.</p>
       ${adminNote ? `<div style="background:#fef2f2;border-left:4px solid #ef4444;padding:12px 16px;margin:16px 0;border-radius:4px;"><strong style="color:#374151;">Reason:</strong><p style="margin:4px 0 0;color:#374151;">${adminNote}</p></div>` : ''}
       <p style="color:#374151;font-size:15px;">You can edit your post to fix any issues and resubmit it for review.</p>
       <div style="text-align:center;margin:28px 0;">
         <a href="${FRONTEND_URL}/dashboard" style="background:#3b82f6;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">Go to Dashboard →</a>
       </div>`
    ),
  })
}

// ─── 3. New Listing Notification ─────────────────────────────
export const sendNewListingEmail = async ({ to, userName, post }) => {
  if (!isEmailConfigured()) return

  const typeLabel = post.type === 'roommate' ? 'Roommate' : post.type === 'room' ? 'Room' : 'Property'
  const priceText = post.price ? `${post.price.toLocaleString()} EGP/month` : 'Price not specified'

  const transporter = createTransporter()
  await transporter.sendMail({
    from: FROM,
    to,
    subject: `🏠 New ${typeLabel} listing in ${post.city || post.location || 'your area'} — Baytino`,
    html: wrapEmail(
      '#3b82f6',
      `<h1 style="color:#fff;margin:0;font-size:22px;">🏠 New Listing Alert</h1>
       <p style="color:#bfdbfe;margin:6px 0 0;font-size:14px;">A new listing matches your preferences</p>`,
      `<p style="color:#374151;font-size:16px;">Hello <strong>${userName}</strong>,</p>
       <p style="color:#374151;font-size:15px;">A new listing has been posted that matches your search preferences:</p>
       <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px 20px;margin:16px 0;">
         <h3 style="margin:0 0 8px;color:#1e40af;font-size:16px;">${post.title}</h3>
         <table style="width:100%;font-size:14px;color:#374151;">
           <tr><td style="padding:4px 0;"><strong>Type:</strong></td><td>${typeLabel}</td></tr>
           <tr><td style="padding:4px 0;"><strong>Location:</strong></td><td>${post.city || post.location || '—'}</td></tr>
           <tr><td style="padding:4px 0;"><strong>Price:</strong></td><td style="color:#10b981;font-weight:bold;">${priceText}</td></tr>
           ${post.bedrooms ? `<tr><td style="padding:4px 0;"><strong>Bedrooms:</strong></td><td>${post.bedrooms}</td></tr>` : ''}
         </table>
         ${post.description ? `<p style="color:#6b7280;font-size:13px;margin:10px 0 0;border-top:1px solid #dbeafe;padding-top:10px;">${post.description.substring(0, 150)}${post.description.length > 150 ? '...' : ''}</p>` : ''}
       </div>
       <div style="text-align:center;margin:28px 0;">
         <a href="${FRONTEND_URL}/posts/${post._id}" style="background:#3b82f6;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">View Listing →</a>
       </div>
       <p style="color:#9ca3af;font-size:13px;">
         You're receiving this because you subscribed to new listing alerts.<br>
         <a href="${FRONTEND_URL}/dashboard/settings" style="color:#6b7280;">Manage notification preferences</a>
       </p>`
    ),
  })
}

// ─── 4. Email Marketing (bulk) ───────────────────────────────
export const sendMarketingEmail = async ({ to, userName, subject, title, body, ctaText, ctaUrl }) => {
  if (!isEmailConfigured()) return

  const transporter = createTransporter()
  await transporter.sendMail({
    from: FROM,
    to,
    subject,
    html: wrapEmail(
      '#6366f1',
      `<h1 style="color:#fff;margin:0;font-size:22px;">${title}</h1>`,
      `<p style="color:#374151;font-size:16px;">Hello${userName ? ` <strong>${userName}</strong>` : ''},</p>
       <div style="color:#374151;font-size:15px;line-height:1.7;">${body.replace(/\n/g, '<br>')}</div>
       ${ctaText && ctaUrl ? `<div style="text-align:center;margin:28px 0;">
         <a href="${ctaUrl}" style="background:#6366f1;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">${ctaText}</a>
       </div>` : ''}
       <p style="color:#9ca3af;font-size:13px;margin-top:20px;">
         You are receiving this email as a registered Baytino user.
       </p>`
    ),
  })
}

// ─── 5. Password Reset Email ─────────────────────────────────
export const sendPasswordResetEmail = async ({ to, userName, resetLink }) => {
  if (!isEmailConfigured()) {
    console.log('[Email] Not configured — reset link:', resetLink)
    return
  }

  const transporter = createTransporter()
  await transporter.sendMail({
    from: FROM,
    to,
    subject: '🔑 Reset Your Baytino Password',
    html: wrapEmail(
      '#6366f1',
      `<h1 style="color:#fff;margin:0;font-size:22px;">🔑 Password Reset Request</h1>`,
      `<p style="color:#374151;font-size:16px;">Hello <strong>${userName || 'there'}</strong>,</p>
       <p style="color:#374151;font-size:15px;">We received a request to reset your Baytino account password. Click the button below to set a new password:</p>
       <div style="text-align:center;margin:28px 0;">
         <a href="${resetLink}" style="background:#6366f1;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">Reset Password →</a>
       </div>
       <p style="color:#6b7280;font-size:13px;">This link will expire in <strong>30 minutes</strong>. If you did not request a password reset, you can safely ignore this email — your password will not change.</p>
       <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:10px 14px;margin:16px 0;border-radius:4px;">
         <p style="color:#92400e;font-size:13px;margin:0;">⚠️ If you didn't request this, please secure your account immediately.</p>
       </div>`
    ),
  })
}

// ─── 6. Bulk send helper ─────────────────────────────────────
// Sends emails in small batches to avoid rate limits
export const sendBulkEmails = async (recipients, emailFn, delayMs = 300) => {
  const results = { sent: 0, failed: 0, errors: [] }
  for (const recipient of recipients) {
    try {
      await emailFn(recipient)
      results.sent++
      if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs))
    } catch (err) {
      results.failed++
      results.errors.push({ email: recipient.to || recipient.email, error: err.message })
    }
  }
  return results
}
