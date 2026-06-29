import nodemailer from "nodemailer"

// 使用QQ邮箱免费SMTP
const transporter = nodemailer.createTransport({
  host: "smtp.qq.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,    // 你的QQ邮箱
    pass: process.env.SMTP_PASS,    // QQ邮箱授权码（不是登录密码）
  },
})

// 发送邮箱验证码
export async function sendVerifyEmail(to: string, code: string) {
  await transporter.sendMail({
    from: `"心芽" <${process.env.SMTP_USER}>`,
    to,
    subject: "心芽 — 验证你的邮箱",
    html: `
      <div style="max-width:480px;margin:0 auto;font-family:sans-serif;padding:32px;background:#FAFAF5;border-radius:12px;">
        <h2 style="color:#8BC34A;margin-bottom:8px;">🌱 心芽</h2>
        <p style="color:#333;font-size:15px;">欢迎来到心芽！</p>
        <p style="color:#666;font-size:14px;">你的邮箱验证码是：</p>
        <div style="background:#fff;border:2px solid #8BC34A;border-radius:8px;padding:16px;text-align:center;margin:16px 0;">
          <span style="font-size:32px;font-weight:bold;color:#8BC34A;letter-spacing:8px;">${code}</span>
        </div>
        <p style="color:#999;font-size:12px;">验证码10分钟内有效，请勿告诉他人。</p>
        <p style="color:#999;font-size:12px;margin-top:24px;">每一颗灵感的种子，都在此刻破土而出 🌿</p>
      </div>
    `,
  })
}

// 发送重置密码邮件
export async function sendResetEmail(to: string, resetUrl: string) {
  await transporter.sendMail({
    from: `"心芽" <${process.env.SMTP_USER}>`,
    to,
    subject: "心芽 — 重置你的密码",
    html: `
      <div style="max-width:480px;margin:0 auto;font-family:sans-serif;padding:32px;background:#FAFAF5;border-radius:12px;">
        <h2 style="color:#8BC34A;margin-bottom:8px;">🌱 心芽</h2>
        <p style="color:#333;font-size:15px;">你申请了重置密码</p>
        <p style="color:#666;font-size:14px;">点击下方按钮重置你的密码：</p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${resetUrl}"
            style="background:#8BC34A;color:#fff;padding:12px 32px;border-radius:24px;text-decoration:none;font-size:14px;font-weight:bold;">
            重置密码
          </a>
        </div>
        <p style="color:#999;font-size:12px;">链接30分钟内有效。若非本人操作，请忽略此邮件。</p>
        <p style="color:#999;font-size:12px;margin-top:24px;">每一颗灵感的种子，都在此刻破土而出 🌿</p>
      </div>
    `,
  })
}
