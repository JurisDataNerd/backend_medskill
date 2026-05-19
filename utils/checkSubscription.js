import supabase from "./supabase.js";

export default async function checkSubscription(req, res, next) {
  try {
    const user_id = req.user?.id;

    if (!user_id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const classId = req.params?.classId || null;

    const { data: subscriptions, error } = await supabase
      .from("subscriptions")
      .select("*, plans(*)")
      .eq("user_id", user_id)
      .eq("status", "active");

    if (error) {
      return res.status(500).json({ error: "Subscription check failed" });
    }

    if (!subscriptions?.length) {
      return res.status(403).json({ error: "No active subscription" });
    }

    const now = new Date();

    const validSubscriptions = subscriptions.filter((sub) => {
      const endDate = new Date(sub.end_date);
      return !isNaN(endDate) && endDate >= now;
    });

    if (!validSubscriptions.length) {
      return res.status(403).json({ error: "No active subscription" });
    }

    if (!classId) {
      req.subscriptions = validSubscriptions;
      return next();
    }

    const allowed = validSubscriptions.some((sub) => {
      return (
        sub.plans?.type === "full_course" ||
        sub.class_id === classId
      );
    });

    if (!allowed) {
      return res.status(403).json({
        error: "Subscription does not allow this class"
      });
    }

    return next();
  } catch {
    return res.status(500).json({
      error: "Subscription check failed"
    });
  }
}