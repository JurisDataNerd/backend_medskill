import express from "express";
import checkSubscription from "../utils/checkSubscription.js";
import supabase, { supabaseAdmin } from "../utils/supabase.js";

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

  // Generate signed URLs for private supabase storage
  const items = await Promise.all(data.map(async (item) => {
    if (item.file_path && item.file_path.includes('/storage/v1/object/public/')) {
      const urlParts = item.file_path.split('/storage/v1/object/public/')[1];
      if (urlParts) {
        const firstSlash = urlParts.indexOf('/');
        if (firstSlash !== -1) {
          const bucket = urlParts.substring(0, firstSlash);
          const path = decodeURIComponent(urlParts.substring(firstSlash + 1));
          
          // Generate signed URL valid for 2 hours (7200 seconds)
          const { data: signedData, error: signedError } = await supabaseAdmin.storage
            .from(bucket)
            .createSignedUrl(path, 7200);
            
          if (signedData && !signedError) {
            item.file_path = signedData.signedUrl;
          } else if (signedError) {
            console.error("Failed to sign url for", path, signedError.message);
          }
        }
      }
    }
    return item;
  }));

  res.json(items);
});

export default router;