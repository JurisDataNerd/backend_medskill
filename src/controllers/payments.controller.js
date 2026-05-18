import crypto from "crypto";
import supabase from "../../utils/supabase.js";

export const midtransWebhook = async (req, res) => {

  try {

    const notification = req.body;

    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      transaction_id,
      payment_type
    } = notification;

    const serverKey = process.env.MIDTRANS_SERVER_KEY;

    const expectedSignature = crypto
      .createHash("sha512")
      .update(order_id + status_code + gross_amount + serverKey)
      .digest("hex");

    if (signature_key !== expectedSignature) {
      return res.status(403).json({ message: "Invalid signature" });
    }

    const { data: payment } = await supabase
      .from("payments")
      .select("*")
      .eq("order_id", order_id)
      .single();

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    await supabase
      .from("payments")
      .update({
        status: transaction_status,
        payment_method: payment_type,
        midtrans_transaction_id: transaction_id,
        paid_at: new Date()
      })
      .eq("order_id", order_id);

    if (transaction_status === "settlement") {

      const startDate = new Date();

      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);

      await supabase.from("subscriptions").insert({
        user_id: payment.user_id,
        class_id: payment.class_id,
        payment_id: payment.id,
        plan_id: payment.plan_id,
        start_date: startDate,
        end_date: endDate,
        status: "active"
      });

    }

    res.json({ message: "Webhook processed" });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: "Webhook error"
    });

  }

};