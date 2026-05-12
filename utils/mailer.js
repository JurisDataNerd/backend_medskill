import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

export const sendVerificationEmail = async (email, token) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });

  // 🔹 gunakan environment variable, fallback ke localhost
  const baseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const link = `${baseUrl}/verify/${token}`;

  const mailOptions = {
    from: `"MedSkill Support" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: "Verifikasi Akun MedSkill Anda",
    html: `
      <div style="font-family: sans-serif;">
        <h2>Selamat datang di MedSkill 🎉</h2>
        <p>Terima kasih telah mendaftar. Klik tombol di bawah ini untuk memverifikasi akun Anda:</p>
        <a href="${link}" style="background:#2563EB;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;">Verifikasi Sekarang</a>
        <p>Jika Anda tidak mendaftar di MedSkill, abaikan email ini.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};
