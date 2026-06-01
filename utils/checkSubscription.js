import supabase from "./supabase.js";

export default async function checkSubscription(req, res, next) {
  try {
    const user_id = req.user?.id;

    /*
    |--------------------------------------------------------------------------
    | Validate Auth
    |--------------------------------------------------------------------------
    */

    if (!user_id) {
      return res.status(401).json({
        error: "Unauthorized"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Get Requested Class ID
    |--------------------------------------------------------------------------
    */

    const classId = req.params?.classId || null;

    /*
    |--------------------------------------------------------------------------
    | Fetch Active Subscriptions
    |--------------------------------------------------------------------------
    */

    const { data: subscriptions, error } = await supabase
      .from("subscriptions")
      .select(`
        *,
        plans (
          id,
          name,
          type,
          duration_days
        )
      `)
      .eq("user_id", user_id)
      .eq("status", "active");

    if (error) {
      // Error handling - no logs

      return res.status(500).json({
        error: "Subscription check failed"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | No Subscription
    |--------------------------------------------------------------------------
    */

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(403).json({
        error: "No active subscription"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate Expiry Date
    |--------------------------------------------------------------------------
    */

    const now = new Date();

    const validSubscriptions = subscriptions.filter((sub) => {
      if (!sub.end_date) return false;

      const endDate = new Date(sub.end_date);

      return !isNaN(endDate.getTime()) && endDate >= now;
    });

    if (validSubscriptions.length === 0) {
      return res.status(403).json({
        error: "Subscription expired"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | If No Specific Class Requested
    |--------------------------------------------------------------------------
    */

    if (!classId) {
      req.subscriptions = validSubscriptions;

      return next();
    }

    /*
    |--------------------------------------------------------------------------
    | Check Class Access
    |--------------------------------------------------------------------------
    |
    | ACCESS RULE:
    |
    | 1. full_course plan => access ALL classes
    | 2. single_class => must match class_id
    |
    */

    const allowed = validSubscriptions.some((sub) => {
      const isFullCourse =
        sub.plans?.type === "full_course";

      const sameClass =
        String(sub.class_id) === String(classId);

      return isFullCourse || sameClass;
    });

    /*
    |--------------------------------------------------------------------------
    | Access Denied
    |--------------------------------------------------------------------------
    */

    if (!allowed) {
      return res.status(403).json({
        error: "Subscription does not allow this class"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Attach Subscription Data
    |--------------------------------------------------------------------------
    */

    req.subscriptions = validSubscriptions;

    return next();

  } catch (err) {
    // Error handling - no logs

    return res.status(500).json({
      error: "Subscription check failed"
    });
  }
}