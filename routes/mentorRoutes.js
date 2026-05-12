import express from "express";
import { supabase } from "../utils/supabase.js";

const router = express.Router();

// GET /api/mentors
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("mentors")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error("❌ Error fetching mentors:", error.message);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data mentor.",
      error: error.message
    });
  }
});

// GET /api/mentors/:id
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("mentors")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Mentor tidak ditemukan."
      });
    }

    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error("❌ Error fetching mentor:", error.message);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data mentor.",
      error: error.message
    });
  }
});

export default router;
