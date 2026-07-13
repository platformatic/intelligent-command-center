const { Resend } = require('resend')

let resend = null

function initializeResend (apiKey) {
  if (apiKey) {
    resend = new Resend(apiKey)
  }
}

async function sendInviteEmail (email, inviterName = 'Admin') {
  if (!resend) {
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const response = await resend.emails.send({
      from: 'noreply@platformatic.dev',
      to: email,
      subject: 'You\'ve been invited to ICC',
      html: `
        <html>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Welcome to ICC!</h2>
            <p>Hi there,</p>
            <p>${inviterName} has invited you to join the Intelligent Command Center (ICC).</p>
            <p>Click the link below to get started:</p>
            <p><a href="${process.env.ICC_APP_URL || 'https://app.platformatic.dev'}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Accept Invitation</a></p>
            <p>If you have any questions, please contact your administrator.</p>
            <br />
            <p>Best regards,<br />The ICC Team</p>
          </body>
        </html>
      `
    })
    return { success: true, data: response }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

module.exports = {
  initializeResend,
  sendInviteEmail
}
