import express from "express";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import { sendVerificationEmail } from "../utils/mailer.js";

dotenv.config();
const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY || process.env.SUPABASE__KEY
);
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

/* =============================
   REGISTER → simpan ke pending_users
   ============================= */
router.post("/register", async (req, res) => {
  try {
    const { email, password, full_name, university } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email dan password wajib diisi." });

    const token = uuidv4();
    const { error } = await supabase.from("pending_users").insert({
      email,
      password,
      full_name,
      university,
      verify_token: token,
    });
    if (error) return res.status(400).json({ error: error.message });

    await sendVerificationEmail(email, token);
    res.json({ message: "Registrasi berhasil! Silakan verifikasi lewat email." });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Terjadi kesalahan saat mendaftar." });
  }
});

/* =============================
   VERIFY → buat user + pindah ke users
   ============================= */
router.get("/verify/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { data: pending, error } = await supabase
      .from("pending_users")
      .select("*")
      .eq("verify_token", token)
      .maybeSingle();

    if (!pending || error)
      return res
        .status(400)
        .json({ success: false, message: "Token tidak valid atau sudah digunakan." });

    // 🔹 Cek apakah user sudah ada di Auth
    const { data: list } = await supabaseAdmin.auth.admin.listUsers();
    const existing = list?.users?.find(
      (u) => u.email?.toLowerCase() === pending.email.toLowerCase()
    );

    let userId;
    if (existing) {
      console.log(`✅ User sudah ada di Auth: ${pending.email}`);
      userId = existing.id;
    } else {
      const { data: created, error: authError } =
        await supabaseAdmin.auth.admin.createUser({
          email: pending.email,
          password: pending.password,
          email_confirm: true,
          user_metadata: {
            full_name: pending.full_name,
            university: pending.university,
          },
        });
      if (authError) throw authError;
      userId = created.user.id;
    }

    // 🔹 Tambahan aman: update metadata agar full_name ikut di session
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: {
        full_name: pending.full_name,
        university: pending.university,
      },
    });

    // 🔹 Pindahkan data ke tabel users utama
    const { error: insertError } = await supabase.from("users").insert({
      id: userId,
      email: pending.email,
      full_name: pending.full_name || null,
      university: pending.university || null,
      is_verified: true,
    });

    if (insertError && !insertError.message.includes("duplicate"))
      throw insertError;

    // 🔹 Hapus dari pending
    await supabase.from("pending_users").delete().eq("email", pending.email);

    res.json({
      success: true,
      message: "Akun berhasil diverifikasi dan disinkronkan!",
    });
  } catch (err) {
    console.error("Verifikasi error:", err);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat verifikasi.",
    });
  }
});

export default router;
