const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

exports.handler = async (event) => {
  const { email, username, verificationCode } = JSON.parse(event.body);
  
  try {
    const { data, error } = await resend.emails.send({
      from: 'Photosphere <noreply@yourdomain.com>',
      to: [email],
      subject: 'Verify your email for Photosphere',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
          <h1 style="color: #0095f6;">Welcome to Photosphere! 📸</h1>
          <p>Hi ${username},</p>
          <p>Thanks for signing up! Please verify your email address using this code:</p>
          <div style="background: #f4f4f4; padding: 15px; font-size: 24px; letter-spacing: 5px; text-align: center; font-weight: bold;">
            ${verificationCode}
          </div>
          <p>This code expires in 24 hours.</p>
          <p>Enter this code in the app to complete your registration.</p>
          <hr />
          <p style="font-size: 12px; color: #666;">If you didn't sign up for Photosphere, please ignore this email.</p>
        </div>
      `
    });
    
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
