import supabase from "../../utils/supabase.js";

export const getMe = async (req, res) => {
  try {

    const user_id = req.user.id;

    const { data: subscriptions, error } = await supabase
      .from("subscriptions")
      .select(`
        *,
        classes (*),
        plans (*)
      `)
      .eq("user_id", user_id);

    if (error) throw error;

    const active_subscription = subscriptions.find(
      s => s.status === "active"
    );

    res.json({
      user_id,
      subscriptions,
      active_subscription
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: "Failed to fetch user data"
    });

  }
};