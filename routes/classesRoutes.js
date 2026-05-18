import express from "express";
import checkSubscription from "../utils/checkSubscription.js";
import supabase from "../utils/supabase.js";

const router = express.Router();

router.get("/:classId/content", checkSubscription, async (req, res) => {

  const { classId } = req.params;

  const { data, error } = await supabase
    .from("class_contents")
    .select("*")
    .eq("class_id", classId);

  if (error) {
    return res.status(500).json({ error: "Failed to fetch content" });
  }

  res.json(data);

});

export default router;