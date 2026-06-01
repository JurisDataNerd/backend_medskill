import supabase  from "../../utils/supabase.js";

export const getPlans = async (req, res) => {
  try {

    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .eq("is_active", true)
      .order("price", { ascending: true });

    if (error) {
      // Error handling - no logs
      return res.status(500).json({
        success: false,
        message: "Failed to fetch plans",
      });
    }

    res.json({
      success: true,
      data,
    });

  } catch (err) {

    // Error handling - no logs

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });

  }
};