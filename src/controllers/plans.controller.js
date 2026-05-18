import supabase  from "../../utils/supabase.js";

export const getPlans = async (req, res) => {
  try {

    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .eq("is_active", true)
      .order("price", { ascending: true });

    if (error) {
      console.error(error);
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

    console.error(err);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });

  }
};