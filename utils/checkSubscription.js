import supabase from "./supabase.js";

export default async function checkSubscription(req, res, next) {

  try {

    const { user_id } = req.body;
    const { classId } = req.params;

    if (!user_id) {
      return res.status(401).json({
        error: "User ID required"
      });
    }

    const now = new Date();

    const { data: subscriptions } = await supabase
      .from("subscriptions")
      .select("*, plans(*)")
      .eq("user_id", user_id)
      .eq("status", "active")
      .gte("end_date", now);

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(403).json({
        error: "No active subscription"
      });
    }

    let allowed = false;

    for (const sub of subscriptions) {

      if (sub.plans.type === "full_course") {
        allowed = true;
        break;
      }

      if (sub.class_id === classId) {
        allowed = true;
        break;
      }

    }

    if (!allowed) {
      return res.status(403).json({
        error: "Subscription does not allow this class"
      });
    }

    next();

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: "Subscription check failed"
    });

  }

}