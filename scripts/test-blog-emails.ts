import 'dotenv/config'
import { emailTemplates, sendBlogEmail } from '../lib/email'

type BlogTestResult = {
  name: string
  success: boolean
  error?: unknown
}

const resolveRecipient = "poultrymarket.admin@gmail.com"

const resolveAppUrl = () =>
  process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'

const buildBlogPost = (recipient: string) => ({
  title: 'Test Blog Submission: Email Pipeline Check',
  slug: 'test-blog-submission-email-pipeline-check',
  category: 'FARMING_TIPS',
  submissionNotes: 'This is a test submission to verify blog email delivery.',
  featuredImage: 'https://res.cloudinary.com/dgg3dx6i4/image/upload/v1734690503/poultry-marketplace/logo_hd2q5e.png',
  readingTime: 6,
  submittedAt: new Date(),
  author: {
    id: 'test-author-id',
    name: 'PoultryMarket Test Author',
    email: recipient,
  },
  tags: [{ tag: { name: 'Email Test' } }, { tag: { name: 'Blog' } }],
})

const logResult = (result: BlogTestResult) => {
  if (result.success) {
    console.log(`OK: ${result.name}`)
    return
  }

  console.error(`FAIL: ${result.name}`)
  if (result.error) {
    console.error(result.error)
  }
}

const run = async () => {
  const recipient = resolveRecipient

  if (!recipient) {
    console.error(
      'Missing recipient. Set BLOG_TEST_RECIPIENT, BLOG_ADMIN_EMAIL, ADMIN_EMAIL, or SUPPORT_EMAIL.'
    )
    process.exitCode = 1
    return
  }

  const appUrl = resolveAppUrl()
  const blogPost = buildBlogPost(recipient)

  const tests: Array<{ name: string; subject: string; html: string }> = [
    {
      name: 'Author submission acknowledgment (new)',
      subject: `Blog submission test (author): ${blogPost.title}`,
      html: emailTemplates.blogSubmissionAcknowledgment(blogPost, { appUrl, variant: 'new' }),
    },
    {
      name: 'Admin submission notification (new)',
      subject: `Blog submission test (admin): ${blogPost.title}`,
      html: emailTemplates.blogSubmissionAdminNotification(blogPost, { appUrl, variant: 'new' }),
    },
    {
      name: 'Author submission acknowledgment (edit)',
      subject: `Blog update test (author): ${blogPost.title}`,
      html: emailTemplates.blogSubmissionAcknowledgment(blogPost, { appUrl, variant: 'edit' }),
    },
    {
      name: 'Admin submission notification (edit)',
      subject: `Blog update test (admin): ${blogPost.title}`,
      html: emailTemplates.blogSubmissionAdminNotification(blogPost, { appUrl, variant: 'edit' }),
    },
  ]

  const results: BlogTestResult[] = []

  for (const test of tests) {
    const response = await sendBlogEmail({
      to: recipient,
      subject: test.subject,
      html: test.html,
    })

    results.push({
      name: test.name,
      success: response.success,
      error: response.success ? undefined : response.error,
    })
  }

  results.forEach(logResult)

  if (results.some(result => !result.success)) {
    process.exitCode = 1
  }
}

run().catch(error => {
  console.error('Unexpected error running blog email tests:', error)
  process.exitCode = 1
})
