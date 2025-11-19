import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}) {
  try {
    await transporter.sendMail({
      from: `"PoultryMarket" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    })
    return { success: true }
  } catch (error) {
    console.error('Email sending failed:', error)
    return { success: false, error }
  }
}

type BlogEmailPayload = {
  title: string
  slug?: string | null
  category?: string | null
  submissionNotes?: string | null
  featuredImage?: string | null
  readingTime?: number | null
  submittedAt?: Date | string | null
  author?: {
    id?: string | null
    name?: string | null
    email?: string | null
  }
  tags?: Array<{ tag: { name: string } }>
}

const resolveAppUrl = () =>
  process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://poultrymarket.co.ke'

const formatKenyanDateTime = (value?: Date | string | null) => {
  if (!value) {
    return 'Just now'
  }

  const date = typeof value === 'string' ? new Date(value) : value

  try {
    return new Intl.DateTimeFormat('en-KE', {
      dateStyle: 'long',
      timeStyle: 'short',
      timeZone: 'Africa/Nairobi',
    }).format(date)
  } catch (error) {
    console.warn('Failed to format Kenyan date:', error)
    return date.toISOString()
  }
}

export const emailTemplates = {
  blogSubmissionAcknowledgment: (
    blogPost: BlogEmailPayload,
    options: { appUrl?: string } = {}
  ) => {
    const appUrl = options.appUrl || resolveAppUrl()
    const reviewUrl = `${appUrl.replace(/\/$/, '')}/my-blogs`
    const submittedAt = formatKenyanDateTime(blogPost.submittedAt)
    const authorName = blogPost.author?.name?.trim() || 'Poultry enthusiast'

    return `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>We received your blog submission</title>
      </head>
      <body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background-color:#f5f7fb;color:#1f2937;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f7fb;padding:24px 0;">
          <tr>
            <td align="center">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 20px 35px -28px rgba(15,118,110,0.55);">
                <tr>
                  <td style="background:linear-gradient(120deg,#047857 0%,#0f766e 100%);padding:36px 40px;color:#ffffff;">
                    <h1 style="margin:0;font-size:26px;font-weight:700;">We have your blog submission! 📝</h1>
                    <p style="margin:12px 0 0;font-size:16px;color:rgba(255,255,255,0.85);">Submitted on ${submittedAt}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px 40px 16px;">
                    <h2 style="margin:0 0 12px;font-size:22px;font-weight:600;color:#0f172a;">Hello ${authorName},</h2>
                    <p style="margin:0 0 16px;line-height:1.6;">Thank you for sharing your knowledge with the PoultryMarket community. We have received your article <strong>"${blogPost.title}"</strong> and our support team is already preparing it for review.</p>
                    <p style="margin:0 0 16px;line-height:1.6;">Here is what happens next:</p>
                    <ul style="margin:0 0 16px;padding-left:20px;line-height:1.6;">
                      <li style="margin-bottom:8px;">Our editorial support team will review your submission within <strong>24-48 hours</strong>.</li>
                      <li style="margin-bottom:8px;">You will receive another email as soon as your blog is approved or if we need additional details.</li>
                      <li style="margin-bottom:8px;">Once approved, your story goes live on PoultryMarket and you can share it across all your social channels directly from the blog page.</li>
                    </ul>
                    <p style="margin:0 0 16px;line-height:1.6;">You can track the status of your submission at any time:</p>
                    <div style="text-align:center;margin:28px 0;">
                      <a href="${reviewUrl}" style="display:inline-block;background:linear-gradient(120deg,#0d9488 0%,#14b8a6 100%);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:999px;font-weight:600;font-size:16px;">Track my submission</a>
                    </div>
                    <div style="background-color:#f8fafc;border-radius:12px;padding:20px;margin:0 0 24px;border:1px solid #e2e8f0;">
                      <h3 style="margin:0 0 8px;font-size:16px;color:#0f172a;">Submission summary</h3>
                      <p style="margin:4px 0;font-size:14px;color:#475569;"><strong>Category:</strong> ${blogPost.category || 'General'}</p>
                      ${blogPost.readingTime ? `<p style="margin:4px 0;font-size:14px;color:#475569;"><strong>Estimated reading time:</strong> ${blogPost.readingTime} min</p>` : ''}
                      ${blogPost.tags && blogPost.tags.length ? `<p style="margin:4px 0;font-size:14px;color:#475569;"><strong>Tags:</strong> ${blogPost.tags.map(tag => tag.tag.name).join(', ')}</p>` : ''}
                      ${blogPost.submissionNotes ? `<p style="margin:12px 0 0;font-size:14px;color:#475569;line-height:1.6;"><strong>Your notes:</strong> ${blogPost.submissionNotes}</p>` : ''}
                    </div>
                    <p style="margin:0 0 24px;line-height:1.6;">We are grateful to have you as part of the PoultryMarket community. Every article strengthens our collective knowledge and supports farmers across the region.</p>
                    <p style="margin:0;font-weight:600;">Thank you for being part of the community and sharing your expertise!</p>
                    <p style="margin:8px 0 0;color:#0f172a;font-weight:500;">The PoultryMarket Support Team</p>
                  </td>
                </tr>
                <tr>
                  <td style="background-color:#f1f5f9;padding:20px 24px;text-align:center;font-size:12px;color:#64748b;">
                    <p style="margin:0;">You are receiving this email because you submitted a blog post on PoultryMarket.</p>
                    <p style="margin:8px 0 0;">Need help? Email us at <a href="mailto:${process.env.SUPPORT_EMAIL || 'support@poultrymarket.co.ke'}" style="color:#0f766e;text-decoration:none;">${process.env.SUPPORT_EMAIL || 'support@poultrymarket.co.ke'}</a></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>`
  },
  blogSubmissionAdminNotification: (
    blogPost: BlogEmailPayload,
    options: { appUrl?: string } = {}
  ) => {
    const appUrl = options.appUrl || resolveAppUrl()
    const moderationUrl = `${appUrl.replace(/\/$/, '')}/admin/blog/pending`
    const submittedAt = formatKenyanDateTime(blogPost.submittedAt)
    const authorName = blogPost.author?.name?.trim() || 'Unnamed contributor'
    const authorEmail = blogPost.author?.email || '—'
    const tagsList = blogPost.tags && blogPost.tags.length
      ? blogPost.tags.map(tag => tag.tag.name).join(', ')
      : 'None provided'

    return `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>New blog submission</title>
      </head>
      <body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background-color:#0f172a;color:#111827;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;padding:32px 0;">
          <tr>
            <td align="center">
              <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;">
                <tr>
                  <td style="background:linear-gradient(90deg,#0f766e 0%,#0ea5e9 100%);padding:28px 32px;color:#ffffff;">
                    <h1 style="margin:0;font-size:24px;font-weight:700;">New blog submission waiting for review</h1>
                    <p style="margin:10px 0 0;font-size:15px;color:rgba(255,255,255,0.85);">${submittedAt}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:28px 32px;">
                    <p style="margin:0 0 16px;line-height:1.6;">A new blog article has just been submitted on PoultryMarket.</p>
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
                      <tr style="background-color:#f8fafc;">
                        <td style="padding:16px 20px;font-size:14px;color:#0f172a;width:40%;font-weight:600;">Title</td>
                        <td style="padding:16px 20px;font-size:14px;color:#1e293b;">${blogPost.title}</td>
                      </tr>
                      <tr>
                        <td style="padding:16px 20px;font-size:14px;color:#0f172a;font-weight:600;">Author</td>
                        <td style="padding:16px 20px;font-size:14px;color:#1e293b;">${authorName} &lt;${authorEmail}&gt;</td>
                      </tr>
                      <tr style="background-color:#f8fafc;">
                        <td style="padding:16px 20px;font-size:14px;color:#0f172a;font-weight:600;">Category</td>
                        <td style="padding:16px 20px;font-size:14px;color:#1e293b;">${blogPost.category || 'Not set'}</td>
                      </tr>
                      <tr>
                        <td style="padding:16px 20px;font-size:14px;color:#0f172a;font-weight:600;">Tags</td>
                        <td style="padding:16px 20px;font-size:14px;color:#1e293b;">${tagsList}</td>
                      </tr>
                      ${blogPost.readingTime ? `<tr style="background-color:#f8fafc;"><td style="padding:16px 20px;font-size:14px;color:#0f172a;font-weight:600;">Reading time</td><td style="padding:16px 20px;font-size:14px;color:#1e293b;">${blogPost.readingTime} min</td></tr>` : ''}
                      <tr>
                        <td style="padding:16px 20px;font-size:14px;color:#0f172a;font-weight:600;">Submitted</td>
                        <td style="padding:16px 20px;font-size:14px;color:#1e293b;">${submittedAt}</td>
                      </tr>
                      ${blogPost.submissionNotes ? `<tr style="background-color:#f8fafc;"><td style="padding:16px 20px;font-size:14px;color:#0f172a;font-weight:600;">Contributor notes</td><td style="padding:16px 20px;font-size:14px;color:#1e293b;line-height:1.6;">${blogPost.submissionNotes}</td></tr>` : ''}
                    </table>
                    ${blogPost.featuredImage ? `<div style="margin:0 0 24px;">
                      <p style="margin:0 0 8px;font-size:14px;color:#0f172a;font-weight:600;">Featured image preview</p>
                      <img src="${blogPost.featuredImage}" alt="Featured image" style="width:100%;max-height:280px;object-fit:cover;border-radius:12px;border:1px solid #e2e8f0;" />
                    </div>` : ''}
                    <div style="text-align:center;margin:0 0 24px;">
                      <a href="${moderationUrl}" style="display:inline-block;background:linear-gradient(120deg,#2563eb 0%,#38bdf8 100%);color:#ffffff;text-decoration:none;padding:14px 30px;border-radius:10px;font-weight:600;font-size:16px;">Review submission</a>
                    </div>
                    <p style="margin:0;color:#475569;font-size:13px;line-height:1.6;">The post is currently marked as <strong>pending approval</strong>. Please review, make any necessary edits, and approve or reject it from the admin dashboard.</p>
                  </td>
                </tr>
                <tr>
                  <td style="background-color:#0f172a;color:#94a3b8;text-align:center;padding:18px 24px;font-size:12px;">
                    <p style="margin:0;">This message was sent to the PoultryMarket editorial team.</p>
                    <p style="margin:8px 0 0;">Need to update notification recipients? Adjust the BLOG_ADMIN_EMAIL or SUPPORT_EMAIL environment variables.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>`
  },
  commentApprovedPostAuthor: (
    payload: {
      postTitle: string
      postSlug?: string | null
      postAuthor?: { name?: string | null } | null
      commentAuthor?: { name?: string | null } | null
      guestName?: string | null
      commentContent: string
    },
    options: { appUrl?: string } = {}
  ) => {
    const baseUrl = (options.appUrl || resolveAppUrl()).replace(/\/$/, '')
    const commenterName = payload.commentAuthor?.name?.trim() || payload.guestName?.trim() || 'A reader'
    const sourcePreview = payload.commentContent?.trim() || ''
    const truncatedPreview = sourcePreview.length > 320 ? `${sourcePreview.slice(0, 317)}...` : sourcePreview
    const safePreview = escapeHtml(truncatedPreview || 'No additional text provided.')
    const authorSlug = toAuthorSlug(payload.postAuthor?.name)
    const postUrl = payload.postSlug
      ? `${baseUrl}/blog/${encodeURIComponent(authorSlug)}/${payload.postSlug}`
      : `${baseUrl}/blog`
    const manageUrl = `${baseUrl}/admin/blog/comments`

    return `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>New comment approved</title>
      </head>
      <body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background-color:#f5f7fb;color:#0f172a;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#e2e8f0;padding:24px 0;">
          <tr>
            <td align="center">
              <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 20px 35px -30px rgba(15,118,110,0.45);">
                <tr>
                  <td style="background:linear-gradient(120deg,#0d9488 0%,#22d3ee 100%);padding:28px 32px;color:#ffffff;">
                    <h1 style="margin:0;font-size:24px;font-weight:700;">${commenterName}'s comment is live</h1>
                    <p style="margin:10px 0 0;font-size:15px;color:rgba(255,255,255,0.85);">Approved for “${payload.postTitle}”</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:28px 32px;">
                    <p style="margin:0 0 16px;line-height:1.6;">A new comment has just been approved on your blog post <strong>“${payload.postTitle}”</strong>. Here is a quick preview:</p>
                    <blockquote style="margin:0 0 20px;padding:18px 22px;border-left:4px solid #0d9488;background-color:#f8fafc;border-radius:10px;font-style:italic;color:#0f172a;line-height:1.5;">${safePreview}</blockquote>
                    <p style="margin:0 0 24px;line-height:1.6;">Visit your post to engage with the commenter or continue the conversation from the admin comments dashboard.</p>
                    <div style="text-align:center;margin:0 0 24px;">
                      <a href="${postUrl}" style="display:inline-block;background:linear-gradient(120deg,#2563eb 0%,#38bdf8 100%);color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:600;font-size:15px;margin-right:12px;">View post</a>
                      <a href="${manageUrl}" style="display:inline-block;background:linear-gradient(120deg,#047857 0%,#0f766e 100%);color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:600;font-size:15px;">Manage comments</a>
                    </div>
                    <p style="margin:0;color:#475569;font-size:13px;">Thank you for keeping the PoultryMarket community active.</p>
                  </td>
                </tr>
                <tr>
                  <td style="background-color:#f1f5f9;padding:18px 24px;font-size:12px;color:#64748b;text-align:center;">
                    <p style="margin:0;">You are receiving this email because you own “${payload.postTitle}”.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>`
  },
  commentApprovedCommentAuthor: (
    payload: {
      postTitle: string
      postSlug?: string | null
      postAuthor?: { name?: string | null } | null
      commentAuthor?: { name?: string | null } | null
      guestName?: string | null
      commentContent: string
    },
    options: { appUrl?: string; adminBlogUrl?: string } = {}
  ) => {
    const baseUrl = (options.appUrl || resolveAppUrl()).replace(/\/$/, '')
    const commenterName = payload.commentAuthor?.name?.trim() || payload.guestName?.trim() || 'there'
    const authorName = payload.postAuthor?.name?.trim() || 'the blog author'
    const sourcePreview = payload.commentContent?.trim() || ''
    const truncatedPreview = sourcePreview.length > 320 ? `${sourcePreview.slice(0, 317)}...` : sourcePreview
    const safePreview = escapeHtml(truncatedPreview || 'Your comment is now visible to everyone.')
    const authorSlug = toAuthorSlug(payload.postAuthor?.name)
    const postUrl = payload.postSlug
      ? `${baseUrl}/blog/${encodeURIComponent(authorSlug)}/${payload.postSlug}`
      : `${baseUrl}/blog`

    return `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Your comment was approved</title>
      </head>
      <body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background-color:#ffffff;color:#0f172a;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ecfeff;padding:24px 0;">
          <tr>
            <td align="center">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #bae6fd;">
                <tr>
                  <td style="background:linear-gradient(135deg,#38bdf8 0%,#22d3ee 100%);padding:32px;color:#ffffff;">
                    <h1 style="margin:0;font-size:24px;font-weight:700;">Your comment is now live 🎉</h1>
                    <p style="margin:12px 0 0;font-size:15px;color:rgba(255,255,255,0.9);">Post: “${payload.postTitle}”</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:28px 32px;">
                    <p style="margin:0 0 16px;line-height:1.6;">Hi ${commenterName},</p>
                    <p style="margin:0 0 16px;line-height:1.6;">Great news! The PoultryMarket team approved your comment on <strong>${payload.postTitle}</strong> by ${authorName}. Here’s a preview of what readers can see:</p>
                    <blockquote style="margin:0 0 20px;padding:18px 22px;border-left:4px solid #38bdf8;background-color:#f0f9ff;border-radius:10px;font-style:italic;color:#0f172a;line-height:1.5;">${safePreview}</blockquote>
                    <p style="margin:0 0 20px;line-height:1.6;">Feel free to jump back into the conversation.</p>
                    <div style="text-align:center;margin:0 0 24px;">
                      <a href="${postUrl}" style="display:inline-block;background:linear-gradient(120deg,#0ea5e9 0%,#38bdf8 100%);color:#ffffff;text-decoration:none;padding:14px 30px;border-radius:12px;font-weight:600;font-size:15px;">View your comment</a>
                    </div>
                    ${options.adminBlogUrl ? `<div style="text-align:center;margin:0 0 24px;">
                      <a href="${options.adminBlogUrl}" style="display:inline-block;background:linear-gradient(120deg,#0d9488 0%,#34d399 100%);color:#ffffff;text-decoration:none;padding:12px 26px;border-radius:999px;font-weight:600;font-size:14px;">Manage your blog</a>
                    </div>` : ''}
                    <p style="margin:0;color:#475569;font-size:13px;">Thanks for keeping our community insightful and respectful.</p>
                  </td>
                </tr>
                <tr>
                  <td style="background-color:#f0f9ff;padding:16px 24px;text-align:center;font-size:12px;color:#0c4a6e;">
                    <p style="margin:0;">You are receiving this email because you recently commented on “${payload.postTitle}”.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>`
  },
  weeklyAuthorAnalyticsDigest: (
    payload: WeeklyAuthorAnalyticsPayload,
    options: { appUrl?: string } = {}
  ) => {
    const baseUrl = (options.appUrl || resolveAppUrl()).replace(/\/$/, '')
    const dashboardUrl = `${baseUrl}/my-blogs`
    const authorName = payload.author.name?.trim() || 'there'
    const timeframeLabel = payload.timeframe.label || 'Past 7 days'
    const timeframeRange = `${formatKenyanDateTime(payload.timeframe.start)} — ${formatKenyanDateTime(payload.timeframe.end)}`
    const prettyNumber = (value: number) => value.toLocaleString('en-KE')
    const authorSlug = toAuthorSlug(payload.author.name)

    const topPostsMarkup = payload.topPosts.length
      ? payload.topPosts
          .map((post, index) => {
            const safeTitle = escapeHtml(post.title)
            const postUrl = post.slug
              ? `${baseUrl}/blog/${encodeURIComponent(authorSlug)}/${post.slug}`
              : dashboardUrl
            const publishedAt = formatKenyanDateTime(post.publishedAt)

            return `<div style="display:flex;align-items:center;justify-content:space-between;border:1px solid #e2e8f0;border-radius:14px;padding:14px 18px;margin-bottom:12px;">
              <div style="display:flex;align-items:flex-start;gap:14px;">
                <div style="width:32px;height:32px;border-radius:999px;background-color:#ecfdf5;color:#047857;font-weight:600;display:flex;align-items:center;justify-content:center;">${index + 1}</div>
                <div>
                  <p style="margin:0;font-size:15px;font-weight:600;color:#0f172a;">${safeTitle}</p>
                  <p style="margin:6px 0 0;font-size:12px;color:#475569;">${publishedAt}</p>
                  <a href="${postUrl}" style="display:inline-block;margin-top:6px;font-size:12px;color:#047857;text-decoration:none;">View performance →</a>
                </div>
              </div>
              <div style="display:flex;gap:18px;font-size:12px;color:#0f172a;">
                <span>👁️ ${prettyNumber(post.views)}</span>
                <span>❤️ ${prettyNumber(post.likes)}</span>
                <span>💬 ${prettyNumber(post.comments)}</span>
              </div>
            </div>`
          })
          .join('')
      : `<p style="margin:0;font-size:14px;color:#475569;">No standout posts in this window. Publish or promote a story to re-engage your readers.</p>`

    return `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Weekly blog analytics</title>
      </head>
      <body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;color:#0f172a;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:30px 0;">
          <tr>
            <td align="center">
              <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 25px 45px -32px rgba(15,118,110,0.5);">
                <tr>
                  <td style="background:linear-gradient(120deg,#0d9488 0%,#14b8a6 100%);padding:32px 36px;color:#ffffff;">
                    <p style="margin:0 0 6px;font-size:14px;letter-spacing:0.08em;text-transform:uppercase;color:rgba(255,255,255,0.85);">Weekly Analytics</p>
                    <h1 style="margin:0;font-size:26px;font-weight:700;">Hi ${authorName}, here is how your blog performed</h1>
                    <p style="margin:12px 0 0;font-size:15px;color:rgba(255,255,255,0.9);">${timeframeLabel} · ${timeframeRange}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px 36px;">
                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-bottom:28px;">
                      <div style="border:1px solid #e2e8f0;border-radius:14px;padding:18px;">
                        <p style="margin:0;font-size:13px;text-transform:uppercase;color:#64748b;letter-spacing:0.05em;">Total Views</p>
                        <p style="margin:8px 0 0;font-size:28px;font-weight:700;color:#0f172a;">${prettyNumber(payload.stats.totalViews)}</p>
                        <p style="margin:6px 0 0;font-size:12px;color:#16a34a;">Across ${payload.stats.publishedPosts} published posts</p>
                      </div>
                      <div style="border:1px solid #e2e8f0;border-radius:14px;padding:18px;">
                        <p style="margin:0;font-size:13px;text-transform:uppercase;color:#64748b;letter-spacing:0.05em;">Likes & Love</p>
                        <p style="margin:8px 0 0;font-size:28px;font-weight:700;color:#0f172a;">${prettyNumber(payload.stats.totalLikes)}</p>
                        <p style="margin:6px 0 0;font-size:12px;color:#f97316;">Readers engaged with your stories</p>
                      </div>
                      <div style="border:1px solid #e2e8f0;border-radius:14px;padding:18px;">
                        <p style="margin:0;font-size:13px;text-transform:uppercase;color:#64748b;letter-spacing:0.05em;">Community Replies</p>
                        <p style="margin:8px 0 0;font-size:28px;font-weight:700;color:#0f172a;">${prettyNumber(payload.stats.totalComments)}</p>
                        <p style="margin:6px 0 0;font-size:12px;color:#6366f1;">${prettyNumber(payload.stats.commentsThisWeek)} new this week</p>
                      </div>
                    </div>

                    <div style="border:1px solid #e2e8f0;border-radius:16px;padding:24px;margin-bottom:28px;background-color:#f8fafc;">
                      <h2 style="margin:0 0 14px;font-size:18px;color:#0f172a;">Weekly highlights</h2>
                      <ul style="margin:0;padding-left:20px;color:#475569;line-height:1.6;font-size:14px;">
                        <li>${payload.stats.postsPublishedThisWeek} new ${payload.stats.postsPublishedThisWeek === 1 ? 'post' : 'posts'} published</li>
                        <li>${prettyNumber(payload.stats.commentsThisWeek)} reader comments arrived in the past week</li>
                        <li>Average reading time ${payload.stats.avgReadingTime ? `${payload.stats.avgReadingTime} min` : 'not set yet'} · keep stories concise and helpful</li>
                      </ul>
                    </div>

                    <div style="margin-bottom:28px;">
                      <h2 style="margin:0 0 14px;font-size:18px;color:#0f172a;">Top performing posts</h2>
                      ${topPostsMarkup}
                    </div>

                    <div style="text-align:center;margin-top:10px;">
                      <a href="${dashboardUrl}" style="display:inline-block;background:linear-gradient(120deg,#2563eb 0%,#38bdf8 100%);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:999px;font-weight:600;font-size:15px;">Open my blog dashboard</a>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="background-color:#f8fafc;padding:18px 24px;text-align:center;color:#475569;font-size:12px;">
                    <p style="margin:0;">Need ideas to boost engagement? Reply to this email and we will help craft your next article.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>`
  },
  welcome: (name: string, message: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to PoultryMarket - Start Shopping Fresh!</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 32px; font-weight: bold;">🎉 Welcome to PoultryMarket!</h1>
          <p style="color: #d1fae5; margin: 10px 0 0 0; font-size: 18px;">Fresh Farm Products at Your Fingertips</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 28px;">Welcome aboard, ${name}! 🐔</h2>
          
          <p style="color: #4b5563; line-height: 1.8; margin: 0 0 25px 0; font-size: 16px;">
            ${message}
          </p>
          
          <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding: 25px; border-radius: 12px; margin: 30px 0; border-left: 4px solid #10b981;">
            <h3 style="color: #166534; margin: 0 0 15px 0; font-size: 20px;">🚀 What You Can Do Now:</h3>
            <ul style="color: #374151; line-height: 1.6; margin: 0; padding-left: 20px;">
              <li style="margin-bottom: 8px;">Browse fresh eggs, chicken meat, and feed from verified sellers</li>
              <li style="margin-bottom: 8px;">Find trusted local farmers and suppliers in Kenya</li>
              <li style="margin-bottom: 8px;">Enjoy secure payments and reliable delivery services</li>
              <li style="margin-bottom: 8px;">Track your orders in real-time</li>
              <li>Connect directly with sellers through our chat system</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="${process.env.NEXTAUTH_URL}/products" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
              🛒 Start Shopping Now
            </a>
          </div>
          
          <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #f59e0b;">
            <h4 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px;">💡 Pro Tips for New Users:</h4>
            <p style="color: #78350f; margin: 0; font-size: 14px; line-height: 1.5;">
              • Use filters to find products near you for faster delivery<br>
              • Check seller ratings and reviews before ordering<br>
              • Join our WhatsApp community for exclusive deals and updates<br>
              • Download our mobile app for the best shopping experience
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0 20px 0;">
            <p style="color: #6b7280; font-size: 16px; margin: 0 0 15px 0;">Follow us for daily updates and special offers:</p>
            <div style="margin: 15px 0;">
              <a href="#" style="display: inline-block; margin: 0 10px; padding: 10px; background-color: #1877f2; color: white; text-decoration: none; border-radius: 50%; width: 40px; height: 40px; text-align: center; line-height: 20px;">📘</a>
              <a href="#" style="display: inline-block; margin: 0 10px; padding: 10px; background-color: #1da1f2; color: white; text-decoration: none; border-radius: 50%; width: 40px; height: 40px; text-align: center; line-height: 20px;">🐦</a>
              <a href="#" style="display: inline-block; margin: 0 10px; padding: 10px; background-color: #25d366; color: white; text-decoration: none; border-radius: 50%; width: 40px; height: 40px; text-align: center; line-height: 20px;">📱</a>
            </div>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 30px 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
            © 2025 PoultryMarket. All rights reserved.<br>
            Supporting Kenyan farmers and delivering fresh products to your door.
          </p>
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            Need help? Contact us at support@poultrymarket.co.ke or call +254 700 000 000
          </p>
        </div>
      </div>
    </body>
    </html>
  `,

  verification: (name: string, verificationUrl: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email - PoultryMarket</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">🐔 PoultryMarket</h1>
          <p style="color: #d1fae5; margin: 10px 0 0 0; font-size: 16px;">Fresh Farm Products Delivered</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Welcome to PoultryMarket, ${name}!</h2>
          
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
            Thank you for joining our marketplace! To complete your registration and start shopping for fresh farm products, please verify your email address.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="display: inline-block; background-color: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
              Verify Email Address
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 20px 0 0 0;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${verificationUrl}" style="color: #10b981; word-break: break-all;">${verificationUrl}</a>
          </p>
          
          <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 20px 0 0 0;">
            This verification link will expire in 24 hours for security reasons.
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">
            © 2024 PoultryMarket. All rights reserved.<br>
            Fresh farm products delivered to your door.
          </p>
        </div>
      </div>
    </body>
    </html>
  `,

  passwordReset: (name: string, resetUrl: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password - PoultryMarket</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">🔒 Password Reset</h1>
          <p style="color: #fecaca; margin: 10px 0 0 0; font-size: 16px;">PoultryMarket Security</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Reset Your Password</h2>
          
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
            Hi ${name}, we received a request to reset your password for your PoultryMarket account. Click the button below to create a new password.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="display: inline-block; background-color: #dc2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
              Reset Password
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 20px 0 0 0;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${resetUrl}" style="color: #dc2626; word-break: break-all;">${resetUrl}</a>
          </p>
          
          <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 20px 0 0 0;">
            This reset link will expire in 1 hour for security reasons. If you didn't request this reset, please ignore this email.
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">
            © 2025 PoultryMarket. All rights reserved.<br>
            If you have questions, contact our support team.
          </p>
        </div>
      </div>
    </body>
    </html>
  `,

  contactForm: (name: string, email: string, message: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Contact Form Submission - PoultryMarket</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">📧 Contact Form</h1>
          <p style="color: #bfdbfe; margin: 10px 0 0 0; font-size: 16px;">New Message Received</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">New Contact Form Submission</h2>
          
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #374151; margin: 0 0 15px 0; font-size: 18px;">Contact Details:</h3>
            <p style="color: #4b5563; margin: 5px 0; font-size: 16px;"><strong>Name:</strong> ${name}</p>
            <p style="color: #4b5563; margin: 5px 0; font-size: 16px;"><strong>Email:</strong> ${email}</p>
          </div>
          
          <h3 style="color: #374151; margin: 20px 0 10px 0; font-size: 18px;">Message:</h3>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6;">
            <p style="color: #1f2937; line-height: 1.6; margin: 0; font-size: 16px; white-space: pre-wrap;">${message}</p>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 30px 0 0 0;">
            <strong>Submitted:</strong> ${new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })} (EAT)
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">
            © 2025 PoultryMarket. All rights reserved.<br>
            This message was sent from the contact form on poultrymarket.co.ke
          </p>
        </div>
      </div>
    </body>
    </html>
  `,

  contactConfirmation: (name: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Message Received - PoultryMarket</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">✅ Message Received</h1>
          <p style="color: #d1fae5; margin: 10px 0 0 0; font-size: 16px;">PoultryMarket Support</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Thank you, ${name}!</h2>
          
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
            We've received your message and appreciate you reaching out to PoultryMarket. Our team will review your inquiry and get back to you within 24 hours.
          </p>
          
          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 20px 0;">
            <h3 style="color: #1e40af; margin: 0 0 10px 0; font-size: 18px;">What happens next?</h3>
            <ul style="color: #1f2937; margin: 0; padding-left: 20px;">
              <li style="margin: 5px 0;">Our support team will review your message</li>
              <li style="margin: 5px 0;">You'll receive a personalized response within 24 hours</li>
              <li style="margin: 5px 0;">For urgent matters, call us at +254 705 423 479</li>
            </ul>
          </div>
          
          <p style="color: #4b5563; line-height: 1.6; margin: 20px 0 0 0; font-size: 16px;">
            In the meantime, feel free to explore our marketplace and discover fresh poultry products from trusted local farmers.
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">
            © 2025 PoultryMarket. All rights reserved.<br>
            Fresh farm products delivered to your door.
          </p>
        </div>
      </div>
    </body>
    </html>
  `,

  // Order-related email templates
  orderConfirmed: (name: string, message: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmed - PoultryMarket</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 32px; font-weight: bold;">🎉 Order Confirmed!</h1>
          <p style="color: #d1fae5; margin: 10px 0 0 0; font-size: 18px;">Thank you for choosing PoultryMarket</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 28px;">Hello ${name}! 🛒</h2>
          
          <p style="color: #4b5563; line-height: 1.8; margin: 0 0 25px 0; font-size: 16px;">
            Great news! ${message}
          </p>
          
          <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); padding: 25px; border-radius: 12px; margin: 30px 0; border-left: 4px solid #10b981;">
            <h3 style="color: #166534; margin: 0 0 15px 0; font-size: 20px;">📋 What Happens Next:</h3>
            <ul style="color: #374151; line-height: 1.7; margin: 0; padding-left: 20px; font-size: 15px;">
              <li style="margin-bottom: 10px;">📦 <strong>Order Processing:</strong> Your order is being prepared by our sellers</li>
              <li style="margin-bottom: 10px;">🔔 <strong>Status Updates:</strong> You'll receive SMS and email notifications</li>
              <li style="margin-bottom: 10px;">🚚 <strong>Delivery:</strong> Expected within 24-48 hours in Nairobi, 2-3 days elsewhere</li>
              <li style="margin-bottom: 10px;">📱 <strong>Track Order:</strong> Monitor progress in real-time through our app</li>
              <li>💬 <strong>Support:</strong> Chat directly with sellers for any questions</li>
            </ul>
          </div>
          
          <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #f59e0b;">
            <h4 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px;">💡 Delivery Tips:</h4>
            <p style="color: #78350f; margin: 0; font-size: 14px; line-height: 1.5;">
              • Ensure someone is available at the delivery address<br>
              • Have your phone accessible for delivery agent contact<br>
              • Fresh products are best consumed within 24-48 hours<br>
              • Rate your experience to help us serve you better
            </p>
          </div>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="${process.env.NEXTAUTH_URL}/customer/orders" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
              📋 Track Your Order
            </a>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 30px 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
            © 2025 PoultryMarket. All rights reserved.<br>
            Supporting Kenyan farmers and delivering fresh products to your door.
          </p>
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            Questions? Contact us at support@comradehomes.me| epheynyaga@gmail.com or call +254 705 423 479
          </p>
        </div>
      </div>
    </body>
    </html>
  `,

  newOrder: (name: string, message: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Order Received - PoultryMarket</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 32px; font-weight: bold;">🛒 New Order Alert!</h1>
          <p style="color: #bfdbfe; margin: 10px 0 0 0; font-size: 18px;">You have a new customer order</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 28px;">Hello ${name}! 🎯</h2>
          
          <p style="color: #4b5563; line-height: 1.8; margin: 0 0 25px 0; font-size: 16px;">
            Excellent! ${message}
          </p>
          
          <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); padding: 25px; border-radius: 12px; margin: 30px 0; border-left: 4px solid #3b82f6;">
            <h3 style="color: #1e40af; margin: 0 0 15px 0; font-size: 20px;">⚡ Action Required:</h3>
            <ul style="color: #374151; line-height: 1.7; margin: 0; padding-left: 20px; font-size: 15px;">
              <li style="margin-bottom: 10px;">✅ <strong>Review Order:</strong> Check order details in your seller dashboard</li>
              <li style="margin-bottom: 10px;">📦 <strong>Confirm Stock:</strong> Ensure products are available and fresh</li>
              <li style="margin-bottom: 10px;">⏰ <strong>Process Quickly:</strong> Aim to pack within 2-4 hours</li>
              <li style="margin-bottom: 10px;">📞 <strong>Contact Customer:</strong> Use our chat system for any clarifications</li>
              <li>🚚 <strong>Arrange Delivery:</strong> Schedule pickup or delivery as per your settings</li>
            </ul>
          </div>
          
          <div style="background-color: #dcfce7; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #22c55e;">
            <h4 style="color: #166534; margin: 0 0 10px 0; font-size: 16px;">💰 Seller Success Tips:</h4>
            <p style="color: #166534; margin: 0; font-size: 14px; line-height: 1.5;">
              • Fast processing leads to better customer ratings<br>
              • Good packaging ensures product quality during delivery<br>
              • Proactive communication builds customer trust<br>
              • Consistent quality increases repeat orders
            </p>
          </div>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="${process.env.NEXTAUTH_URL}/seller/orders" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);">
              📋 Process Order Now
            </a>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 30px 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
            © 2025 PoultryMarket. All rights reserved.<br>
            Empowering sellers to reach more customers across Kenya.
          </p>
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            Need help? Contact seller support at seller-support@comradehomes.com || epheynyaga@gmail.com
          </p>
        </div>
      </div>
    </body>
    </html>
  `,

  // Payment-related templates
  paymentSubmitted: (name: string, message: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Submitted - PoultryMarket</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">💳 Payment Submitted</h1>
          <p style="color: #fef3c7; margin: 10px 0 0 0; font-size: 16px;">PoultryMarket</p>
        </div>
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hello ${name}!</h2>
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">${message}</p>
          <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b;">
            <p style="color: #1f2937; margin: 0; font-size: 16px;"><strong>Payment is under review and will be processed shortly.</strong></p>
          </div>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">© 2025 PoultryMarket. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  paymentApproved: (name: string, message: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Approved - PoultryMarket</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">✅ Payment Approved</h1>
          <p style="color: #d1fae5; margin: 10px 0 0 0; font-size: 16px;">PoultryMarket</p>
        </div>
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Great news, ${name}!</h2>
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">${message}</p>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">© 2025 PoultryMarket. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  paymentRejected: (name: string, message: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Issue - PoultryMarket</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">⚠️ Payment Issue</h1>
          <p style="color: #fecaca; margin: 10px 0 0 0; font-size: 16px;">PoultryMarket</p>
        </div>
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hello ${name},</h2>
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">${message}</p>
          <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; border-left: 4px solid #ef4444;">
            <p style="color: #1f2937; margin: 0; font-size: 16px;"><strong>Please contact our support team for assistance.</strong></p>
          </div>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">© 2025 PoultryMarket. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  // Delivery status templates
  orderPacked: (name: string, message: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Packed - PoultryMarket</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">📦 Order Packed</h1>
          <p style="color: #e9d5ff; margin: 10px 0 0 0; font-size: 16px;">PoultryMarket</p>
        </div>
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hello ${name}!</h2>
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">${message}</p>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">© 2025 PoultryMarket. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  orderDispatched: (name: string, message: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Dispatched - PoultryMarket</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">🚚 Order Dispatched</h1>
          <p style="color: #cffafe; margin: 10px 0 0 0; font-size: 16px;">PoultryMarket</p>
        </div>
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hello ${name}!</h2>
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">${message}</p>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">© 2025 PoultryMarket. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  orderPickedUp: (name: string, message: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Picked Up - PoultryMarket</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">📋 Order Picked Up</h1>
          <p style="color: #fef3c7; margin: 10px 0 0 0; font-size: 16px;">PoultryMarket</p>
        </div>
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hello ${name}!</h2>
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">${message}</p>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">© 2025 PoultryMarket. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  orderInTransit: (name: string, message: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order In Transit - PoultryMarket</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">🚛 Order In Transit</h1>
          <p style="color: #bfdbfe; margin: 10px 0 0 0; font-size: 16px;">PoultryMarket</p>
        </div>
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hello ${name}!</h2>
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">${message}</p>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">© 2025 PoultryMarket. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  orderOutForDelivery: (name: string, message: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Out for Delivery - PoultryMarket</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">🏃‍♂️ Out for Delivery</h1>
          <p style="color: #fef3c7; margin: 10px 0 0 0; font-size: 16px;">PoultryMarket</p>
        </div>
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hello ${name}!</h2>
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">${message}</p>
          <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b;">
            <p style="color: #1f2937; margin: 0; font-size: 16px;"><strong>Your order will arrive soon!</strong></p>
          </div>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">© 2025 PoultryMarket. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  orderDelivered: (name: string, message: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Delivered - PoultryMarket</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">🎉 Delivered!</h1>
          <p style="color: #d1fae5; margin: 10px 0 0 0; font-size: 16px;">PoultryMarket</p>
        </div>
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hello ${name}!</h2>
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">${message}</p>
          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981;">
            <p style="color: #1f2937; margin: 0; font-size: 16px;"><strong>Thank you for choosing PoultryMarket!</strong></p>
            <p style="color: #4b5563; margin: 10px 0 0 0;">Please rate your experience and help us serve you better.</p>
          </div>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">© 2025 PoultryMarket. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  orderRejected: (name: string, message: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Update - PoultryMarket</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">📋 Order Update</h1>
          <p style="color: #fecaca; margin: 10px 0 0 0; font-size: 16px;">PoultryMarket</p>
        </div>
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hello ${name},</h2>
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">${message}</p>
          <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; border-left: 4px solid #ef4444;">
            <p style="color: #1f2937; margin: 0; font-size: 16px;"><strong>Our support team is here to help. Please contact us for assistance.</strong></p>
          </div>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">© 2025 PoultryMarket. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  // Application templates
  applicationApproved: (name: string, message: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Application Approved - PoultryMarket</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">🎉 Congratulations!</h1>
          <p style="color: #d1fae5; margin: 10px 0 0 0; font-size: 16px;">PoultryMarket</p>
        </div>
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hello ${name}!</h2>
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">${message}</p>
          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981;">
            <p style="color: #1f2937; margin: 0; font-size: 16px;"><strong>Welcome to the PoultryMarket community!</strong></p>
            <p style="color: #4b5563; margin: 10px 0 0 0;">You can now access your dashboard and start using our platform.</p>
          </div>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">© 2025 PoultryMarket. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  applicationRejected: (name: string, message: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Application Update - PoultryMarket</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">📋 Application Update</h1>
          <p style="color: #fef3c7; margin: 10px 0 0 0; font-size: 16px;">PoultryMarket</p>
        </div>
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hello ${name},</h2>
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">${message}</p>
          <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b;">
            <p style="color: #1f2937; margin: 0; font-size: 16px;"><strong>Thank you for your interest in PoultryMarket.</strong></p>
            <p style="color: #4b5563; margin: 10px 0 0 0;">Please feel free to contact our support team if you have any questions.</p>
          </div>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">© 2025 PoultryMarket. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  // Sponsorship templates
  sponsorshipApproved: (name: string, message: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Sponsorship Approved - PoultryMarket</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">🤝 Sponsorship Approved</h1>
          <p style="color: #d1fae5; margin: 10px 0 0 0; font-size: 16px;">PoultryMarket</p>
        </div>
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hello ${name}!</h2>
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">${message}</p>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">© 2025 PoultryMarket. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  sponsorshipRejected: (name: string, message: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Sponsorship Update - PoultryMarket</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">📋 Sponsorship Update</h1>
          <p style="color: #fecaca; margin: 10px 0 0 0; font-size: 16px;">PoultryMarket</p>
        </div>
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hello ${name},</h2>
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">${message}</p>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">© 2025 PoultryMarket. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  sponsorshipReceived: (name: string, message: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Sponsorship Offer - PoultryMarket</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">🎉 New Sponsorship</h1>
          <p style="color: #e9d5ff; margin: 10px 0 0 0; font-size: 16px;">PoultryMarket</p>
        </div>
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hello ${name}!</h2>
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">${message}</p>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">© 2025 PoultryMarket. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  sponsorshipDeclined: (name: string, message: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Sponsorship Update - PoultryMarket</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">📋 Sponsorship Update</h1>
          <p style="color: #fef3c7; margin: 10px 0 0 0; font-size: 16px;">PoultryMarket</p>
        </div>
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hello ${name},</h2>
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">${message}</p>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">© 2025 PoultryMarket. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  // Review and delivery templates
  reviewReceived: (name: string, message: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Review - PoultryMarket</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">⭐ New Review</h1>
          <p style="color: #fef3c7; margin: 10px 0 0 0; font-size: 16px;">PoultryMarket</p>
        </div>
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hello ${name}!</h2>
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">${message}</p>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">© 2025 PoultryMarket. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  deliveryAssigned: (name: string, message: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Delivery Assignment - PoultryMarket</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">🚚 New Delivery</h1>
          <p style="color: #cffafe; margin: 10px 0 0 0; font-size: 16px;">PoultryMarket Delivery</p>
        </div>
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hello ${name}!</h2>
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">${message}</p>
          <div style="background-color: #cffafe; padding: 20px; border-radius: 8px; border-left: 4px solid #06b6d4;">
            <p style="color: #1f2937; margin: 0; font-size: 16px;"><strong>Please check your delivery dashboard for details.</strong></p>
          </div>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">© 2025 PoultryMarket. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  // Delivery photo notification templates
  deliveryPhotoUploaded: (name: string, trackingId: string, uploaderName: string, uploaderRole: string, photoType: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Delivery Photo Uploaded - PoultryMarket</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">📸 Delivery Photo Uploaded</h1>
          <p style="color: #d1fae5; margin: 10px 0 0 0; font-size: 16px;">PoultryMarket</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hello ${name}!</h2>
          
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
            A new delivery photo has been uploaded for your order.
          </p>
          
          <!-- Delivery Info Card -->
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #15803d; margin: 0 0 15px 0; font-size: 18px; font-weight: bold;">📦 Delivery Details</h3>
            <div style="color: #166534;">
              <p style="margin: 5px 0;"><strong>Tracking ID:</strong> #${trackingId}</p>
              <p style="margin: 5px 0;"><strong>Photo Type:</strong> ${photoType}</p>
              <p style="margin: 5px 0;"><strong>Uploaded by:</strong> ${uploaderName} (${uploaderRole.replace('_', ' ')})</p>
            </div>
          </div>
          
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 30px 0; font-size: 16px;">
            You can view this photo and track your delivery progress by clicking the button below.
          </p>
          
          <!-- CTA Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXTAUTH_URL}/order" 
               style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: bold; font-size: 16px;">
              View Delivery Photos
            </a>
          </div>
          
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              <strong>💡 Tip:</strong> Delivery photos help ensure transparency and provide proof of delivery condition.
            </p>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
            Thank you for choosing PoultryMarket for your fresh poultry needs!
          </p>
          <p style="color: #6b7280; font-size: 12px; margin: 0;">
            © 2025 PoultryMarket. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `,

  deliveryPhotoReminder: (name: string, trackingId: string, userRole: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Delivery Photo Reminder - PoultryMarket</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">📸 Delivery Photo Reminder</h1>
          <p style="color: #fef3c7; margin: 10px 0 0 0; font-size: 16px;">PoultryMarket</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hello ${name}!</h2>
          
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
            ${userRole === 'DELIVERY_AGENT' 
              ? 'Please remember to upload delivery photos for completed deliveries to maintain transparency with customers.'
              : 'You can upload photos of your received delivery to provide feedback and help us improve our service.'
            }
          </p>
          
          <!-- Delivery Info Card -->
          <div style="background-color: #fffbeb; border: 1px solid #fed7aa; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #ea580c; margin: 0 0 15px 0; font-size: 18px; font-weight: bold;">📦 Delivery Information</h3>
            <div style="color: #c2410c;">
              <p style="margin: 5px 0;"><strong>Tracking ID:</strong> #${trackingId}</p>
              <p style="margin: 5px 0;"><strong>Action Required:</strong> Upload delivery photo</p>
            </div>
          </div>
          
          <!-- CTA Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXTAUTH_URL}/order" 
               style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: bold; font-size: 16px;">
              Upload Photo Now
            </a>
          </div>
          
          <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
            <p style="color: #1e40af; margin: 0; font-size: 14px;">
              <strong>📋 Why upload photos?</strong><br>
              • Provides proof of delivery condition<br>
              • Helps resolve disputes quickly<br>
              • Improves service quality<br>
              • Builds trust in our platform
            </p>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
            Thank you for helping us maintain quality service!
          </p>
          <p style="color: #6b7280; font-size: 12px; margin: 0;">
            © 2025 PoultryMarket. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `,

  // Generic notification template
  genericNotification: (name: string, title: string, message: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title} - PoultryMarket</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">🔔 ${title}</h1>
          <p style="color: #e5e7eb; margin: 10px 0 0 0; font-size: 16px;">PoultryMarket</p>
        </div>
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hello ${name}!</h2>
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">${message}</p>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">© 2025 PoultryMarket. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  // Professional Announcement Email Template
  announcement: (name: string, announcementType: string, title: string, content: string, authorName: string, viewUrl: string) => {
    // Define announcement type configurations
    const typeConfig: { [key: string]: { icon: string, color: string, bgColor: string, description: string } } = {
      'GENERAL': { 
        icon: '📢', 
        color: '#2563eb', 
        bgColor: '#dbeafe',
        description: 'General Information' 
      },
      'URGENT': { 
        icon: '🚨', 
        color: '#dc2626', 
        bgColor: '#fee2e2',
        description: 'Urgent Notice' 
      },
      'EVENT': { 
        icon: '📅', 
        color: '#7c3aed', 
        bgColor: '#f3e8ff',
        description: 'Event Announcement' 
      },
      'PROMOTION': { 
        icon: '🏷️', 
        color: '#ea580c', 
        bgColor: '#fed7aa',
        description: 'Special Promotion' 
      },
      'SALE': { 
        icon: '💰', 
        color: '#059669', 
        bgColor: '#d1fae5',
        description: 'Sale Alert' 
      },
      'PRODUCT_LAUNCH': { 
        icon: '🚀', 
        color: '#0891b2', 
        bgColor: '#cffafe',
        description: 'Product Launch' 
      },
      'DISCOUNT': { 
        icon: '🎁', 
        color: '#c2410c', 
        bgColor: '#fed7aa',
        description: 'Discount Offer' 
      },
      'SLAUGHTER_SCHEDULE': { 
        icon: '📋', 
        color: '#7c2d12', 
        bgColor: '#fef3c7',
        description: 'Slaughter Schedule' 
      }
    };

    const config = typeConfig[announcementType] || typeConfig['GENERAL'];
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title} - PoultryMarket Announcement</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; line-height: 1.6;">
      <div style="max-width: 650px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1); margin-top: 20px; margin-bottom: 20px;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, ${config.color} 0%, ${config.color}dd 100%); padding: 50px 30px; text-align: center; position: relative; overflow: hidden;">
          <!-- Background Pattern -->
          <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-image: radial-gradient(circle at 20% 80%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 50%);"></div>
          
          <div style="position: relative; z-index: 1;">
            <div style="font-size: 48px; margin-bottom: 15px;">${config.icon}</div>
            <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">New ${config.description}</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 18px; font-weight: 500;">PoultryMarket Kenya</p>
            <div style="background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 20px; display: inline-block; margin-top: 15px;">
              <span style="color: white; font-size: 14px; font-weight: 600;">📍 Published by ${authorName}</span>
            </div>
          </div>
        </div>
        
        <!-- Content -->
        <div style="padding: 45px 30px;">
          <div style="text-align: center; margin-bottom: 35px;">
            <h2 style="color: #1e293b; margin: 0 0 15px 0; font-size: 28px; font-weight: 700; line-height: 1.3;">${title}</h2>
            <div style="background: ${config.bgColor}; color: ${config.color}; padding: 8px 16px; border-radius: 20px; display: inline-block; font-size: 14px; font-weight: 600;">
              ${config.icon} ${config.description}
            </div>
          </div>
          
          <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 30px; border-radius: 12px; margin: 30px 0; border-left: 4px solid ${config.color};">
            <h3 style="color: #334155; margin: 0 0 20px 0; font-size: 20px; font-weight: 600;">📋 Announcement Details</h3>
            <div style="color: #475569; font-size: 16px; line-height: 1.8; white-space: pre-wrap;">${content}</div>
          </div>
          
          <!-- Call to Action -->
          <div style="text-align: center; margin: 40px 0;">
            <a href="${viewUrl}" style="display: inline-block; background: linear-gradient(135deg, ${config.color} 0%, ${config.color}dd 100%); color: white; text-decoration: none; padding: 18px 36px; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(37, 99, 235, 0.3); transition: all 0.3s ease;">
              📖 View Full Announcement
            </a>
          </div>
          
          <!-- Why This Matters -->
          <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 25px; border-radius: 12px; margin: 30px 0; border-left: 4px solid #0ea5e9;">
            <h4 style="color: #0c4a6e; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">💡 Why This Matters</h4>
            <p style="color: #164e63; margin: 0; font-size: 15px; line-height: 1.7;">
              Stay informed with the latest updates from PoultryMarket Kenya. Our announcements help you discover new opportunities, stay updated on important changes, and make the most of our platform.
            </p>
          </div>
          
          <!-- Quick Actions -->
          <div style="background: #fafafa; padding: 25px; border-radius: 12px; margin: 25px 0;">
            <h4 style="color: #374151; margin: 0 0 20px 0; font-size: 18px; font-weight: 600; text-align: center;">🚀 Quick Actions</h4>
            <div style="display: table; width: 100%; border-collapse: separate; border-spacing: 10px;">
              <div style="display: table-row;">
                <div style="display: table-cell; text-align: center; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <a href="${process.env.NEXTAUTH_URL}/announcements" style="text-decoration: none; color: #4f46e5; font-weight: 600; font-size: 14px;">📢 All Announcements</a>
                </div>
                <div style="display: table-cell; text-align: center; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <a href="${process.env.NEXTAUTH_URL}/products" style="text-decoration: none; color: #059669; font-weight: 600; font-size: 14px;">🛒 Browse Products</a>
                </div>
                <div style="display: table-cell; text-align: center; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <a href="${process.env.NEXTAUTH_URL}/chatbot" style="text-decoration: none; color: #ea580c; font-weight: 600; font-size: 14px;">🤖 AI Assistant</a>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Social & Community -->
          <div style="text-align: center; margin: 35px 0 20px 0;">
            <p style="color: #6b7280; font-size: 16px; margin: 0 0 20px 0; font-weight: 500;">Stay connected with our community:</p>
            <div style="margin: 20px 0;">
              <a href=" https://www.facebook.com/groups/4228746564014783/?ref=share&mibextid=NSMWBT
" style="display: inline-block; margin: 0 8px; padding: 12px; background-color: #1877f2; color: white; text-decoration: none; border-radius: 50%; width: 44px; height: 44px; text-align: center; line-height: 20px; font-size: 18px; box-shadow: 0 4px 12px rgba(24, 119, 242, 0.3);">📘</a>
              <a href="https://chat.whatsapp.com/IbiitCQgb1KB4Aowo23nBQ?mode=ac_t
" style="display: inline-block; margin: 0 8px; padding: 12px; background-color: #25d366; color: white; text-decoration: none; border-radius: 50%; width: 44px; height: 44px; text-align: center; line-height: 20px; font-size: 18px; box-shadow: 0 4px 12px rgba(37, 211, 102, 0.3);">💬</a>
              <a href="${process.env.NEXTAUTH_URL}" style="display: inline-block; margin: 0 8px; padding: 12px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 50%; width: 44px; height: 44px; text-align: center; line-height: 20px; font-size: 18px; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);">🌐</a>
            </div>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 30px 20px; text-align: center; border-top: 1px solid #e2e8f0;">
          <div style="margin-bottom: 20px;">
            <img src="https://res.cloudinary.com/dgvslio7u/image/upload/v1734690503/poultry-marketplace/logo_hd2q5e.png" alt="PoultryMarket" style="height: 40px; width: auto;">
          </div>
          <p style="color: #64748b; font-size: 14px; margin: 0 0 10px 0; font-weight: 500;">
            © 2025 PoultryMarket Kenya. All rights reserved.<br>
            Connecting farmers, buyers, and the poultry community across Kenya.
          </p>
          <p style="color: #94a3b8; font-size: 13px; margin: 10px 0 0 0;">
            Need help? Contact us at <a href="mailto:support@poultrymarketke.com" style="color: #4f46e5; text-decoration: none;">support@poultrymarketke.com</a><br>
            <a href="${process.env.NEXTAUTH_URL}/unsubscribe" style="color: #94a3b8; text-decoration: underline; font-size: 12px;">Unsubscribe from announcements</a>
          </p>
        </div>
      </div>
    </body>
    </html>
    `;
  },

  // Delivery photo notification template
  deliveryPhotoNotification: (name: string, trackingId: string, uploaderName: string, uploaderRole: string, photoType: string, viewUrl: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Delivery Photo Uploaded - PoultryMarket</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">📸 Delivery Photo Uploaded</h1>
          <p style="color: #d1fae5; margin: 10px 0 0 0; font-size: 16px;">PoultryMarket Delivery Update</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hello ${name}!</h2>
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
            A new delivery photo has been uploaded for your order.
          </p>
          
          <!-- Order Info -->
          <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">📦 Delivery Details</h3>
            <div style="color: #4b5563; line-height: 1.6;">
              <p style="margin: 0 0 10px 0;"><strong>Tracking ID:</strong> #${trackingId}</p>
              <p style="margin: 0 0 10px 0;"><strong>Photo Type:</strong> ${photoType}</p>
              <p style="margin: 0 0 10px 0;"><strong>Uploaded by:</strong> ${uploaderName} (${uploaderRole})</p>
            </div>
          </div>
          
          <!-- Call to Action -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${viewUrl}" 
               style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; font-size: 16px;">
              View Photo & Order Details
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
            This photo helps ensure transparency and quality in our delivery process. You can view all delivery photos and track your order progress in your dashboard.
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
            Need help? Contact our support team at <a href="mailto:epheynyaga@gmail.com" style="color: #059669;">epheynyaga@gmail.com</a>
          </p>
          <p style="color: #6b7280; font-size: 14px; margin: 0;">© 2025 PoultryMarket. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,
}

type BlogEmailOptions = {
  appUrl?: string
}

type CommentApprovalEmailPayload = {
  postTitle: string
  postSlug?: string | null
  postAuthor?: {
    id?: string | null
    name?: string | null
    email?: string | null
  } | null
  commentContent: string
  commentAuthor?: {
    id?: string | null
    name?: string | null
    email?: string | null
    role?: string | null
  } | null
  guestName?: string | null
  guestEmail?: string | null
}

type CommentApprovalEmailOptions = {
  appUrl?: string
}

type WeeklyAuthorAnalyticsPayload = {
  author: {
    id?: string | null
    name?: string | null
    email?: string | null
  }
  stats: {
    totalPosts: number
    publishedPosts: number
    postsPublishedThisWeek: number
    totalViews: number
    totalLikes: number
    totalComments: number
    commentsThisWeek: number
    avgReadingTime?: number | null
  }
  timeframe: {
    label: string
    start: string | Date
    end: string | Date
  }
  topPosts: Array<{
    id: string
    title: string
    slug?: string | null
    views: number
    likes: number
    comments: number
    publishedAt?: string | Date | null
  }>
}

type WeeklyAuthorAnalyticsOptions = {
  appUrl?: string
}

export async function sendBlogSubmissionAcknowledgmentToAuthor(
  blogPost: BlogEmailPayload,
  options: BlogEmailOptions = {}
) {
  const recipient = blogPost.author?.email

  if (!recipient) {
    throw new Error('Cannot send blog acknowledgment without author email')
  }

  const html = emailTemplates.blogSubmissionAcknowledgment(blogPost, {
    appUrl: options.appUrl,
  })

  const subject = `We received your blog submission: ${blogPost.title}`

  return sendEmail({
    to: recipient,
    subject,
    html,
  })
}

export async function sendBlogSubmissionToAdmin(
  blogPost: BlogEmailPayload,
  options: BlogEmailOptions = {}
) {
  const to = process.env.BLOG_ADMIN_EMAIL || process.env.SUPPORT_EMAIL

  if (!to) {
    throw new Error('Cannot send blog submission notification without admin email configured')
  }

  const html = emailTemplates.blogSubmissionAdminNotification(blogPost, {
    appUrl: options.appUrl,
  })

  const subject = `New blog submission awaiting review: ${blogPost.title}`

  return sendEmail({
    to,
    subject,
    html,
  })
}

export async function sendCommentApprovalNotifications(
  payload: CommentApprovalEmailPayload,
  options: CommentApprovalEmailOptions = {}
) {
  const baseAppUrl = (options.appUrl || resolveAppUrl()).replace(/\/$/, '')
  const operations: Promise<unknown>[] = []

  if (payload.postAuthor?.email) {
    const html = emailTemplates.commentApprovedPostAuthor(payload, {
      appUrl: baseAppUrl,
    })

    operations.push(
      sendEmail({
        to: payload.postAuthor.email,
        subject: `New comment on ${payload.postTitle}`,
        html,
      })
    )
  }

  const commentRecipient = payload.commentAuthor?.email || payload.guestEmail
  if (commentRecipient) {
    const adminBlogUrl =
      payload.commentAuthor?.role === 'ADMIN' && payload.commentAuthor?.id
        ? `${baseAppUrl}/blog/author/${payload.commentAuthor.id}`
        : undefined

    const html = emailTemplates.commentApprovedCommentAuthor(payload, {
      appUrl: baseAppUrl,
      adminBlogUrl,
    })

    operations.push(
      sendEmail({
        to: commentRecipient,
        subject: `Your comment on ${payload.postTitle} is live`,
        html,
      })
    )
  }

  if (!operations.length) {
    return []
  }

  return Promise.allSettled(operations)
}

export async function sendWeeklyBlogAnalyticsDigest(
  payload: WeeklyAuthorAnalyticsPayload,
  options: WeeklyAuthorAnalyticsOptions = {}
) {
  if (!payload.author?.email) {
    throw new Error('Cannot send analytics digest without author email')
  }

  const html = emailTemplates.weeklyAuthorAnalyticsDigest(payload, {
    appUrl: options.appUrl,
  })

  const subject = `Weekly blog analytics · ${payload.timeframe.label}`

  return sendEmail({
    to: payload.author.email,
    subject,
    html,
  })
}

const escapeHtml = (value?: string | null) => {
  if (!value) {
    return ''
  }

  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const toAuthorSlug = (name?: string | null) => {
  if (!name) {
    return 'blog-author'
  }

  return name.trim().toLowerCase().replace(/\s+/g, '-') || 'blog-author'
}