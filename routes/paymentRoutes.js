import express from "express";
import snap from "../utils/midtrans.js";
import supabase from "../utils/supabase.js";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();



/*
================================
CREATE PAYMENT
POST /api/payments/create
================================
*/
router.post("/create", async (req, res) => {
  try {

    const { user_id, plan_id } = req.body;

    if (!user_id || !plan_id) {
      return res.status(400).json({
        error: "user_id and plan_id required"
      });
    }

    // ambil plan
    const { data: plan, error: planError } = await supabase
      .from("plans")
      .select("*")
      .eq("id", plan_id)
      .single();

    if (planError || !plan) {
      return res.status(404).json({
        error: "Plan not found"
      });
    }

    const orderId = "MEDSKILL-" + Date.now();
    const amount = plan.price;

    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: amount
      }
    };

    const transaction = await snap.createTransaction(parameter);

    // simpan payment
    const { error: paymentError } = await supabase
      .from("payments")
      .insert([
        {
          id: uuidv4(),
          user_id,
          plan_id,
          class_id: plan.class_id,
          order_id: orderId,
          amount: amount,
          currency: "IDR",
          status: "pending",
          snap_token: transaction.token
        }
      ]);

    if (paymentError) {
      console.error(paymentError);
      return res.status(500).json({
        error: "Failed to create payment"
      });
    }

    return res.json({
      snap_token: transaction.token,
      redirect_url: transaction.redirect_url,
      order_id: orderId
    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      error: "Payment creation failed"
    });

  }
});



/*
================================
MIDTRANS WEBHOOK
POST /api/payments/notification
================================
*/
router.post("/notification", async (req, res) => {

  try {

    const notification = req.body;

    const {
      order_id,
      transaction_status,
      transaction_id,
      payment_type,
      signature_key,
      status_code,
      gross_amount
    } = notification;

    const serverKey = process.env.MIDTRANS_SERVER_KEY;

    /*
    ================================
    VERIFY SIGNATURE
    ================================
    */
    const hash = crypto
      .createHash("sha512")
      .update(order_id + status_code + gross_amount + serverKey)
      .digest("hex");

    if (hash !== signature_key) {
      return res.status(403).json({
        message: "Invalid signature"
      });
    }

    /*
    ================================
    GET PAYMENT
    ================================
    */
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("*")
      .eq("order_id", order_id)
      .single();

    if (paymentError || !payment) {
      return res.status(404).json({
        message: "Payment not found"
      });
    }

    /*
    ================================
    UPDATE PAYMENT STATUS
    ================================
    */
    await supabase
      .from("payments")
      .update({
        status: transaction_status,
        payment_method: payment_type,
        midtrans_transaction_id: transaction_id,
        paid_at: transaction_status === "settlement"
          ? new Date()
          : null
      })
      .eq("order_id", order_id);



    /*
    ================================
    IF PAYMENT SUCCESS
    ================================
    */
    if (transaction_status === "settlement") {

      /*
      cek apakah subscription sudah ada
      untuk mencegah double webhook
      */
      const { data: existing } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("payment_id", payment.id)
        .maybeSingle();

      if (!existing) {

        /*
        ambil duration dari plan
        */
        const { data: plan } = await supabase
          .from("plans")
          .select("duration_days")
          .eq("id", payment.plan_id)
          .single();

        const startDate = new Date();

        const endDate = new Date();

        endDate.setDate(
          endDate.getDate() + plan.duration_days
        );

        await supabase
          .from("subscriptions")
          .insert([
            {
              user_id: payment.user_id,
              class_id: payment.class_id,
              plan_id: payment.plan_id,
              payment_id: payment.id,
              start_date: startDate,
              end_date: endDate,
              status: "active"
            }
          ]);

      }

    }

    return res.json({
      message: "Webhook processed"
    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      message: "Webhook failed"
    });

  }

});

/*
================================
GET PAYMENT STATUS
GET /api/payments/:order_id
================================
*/
router.get("/:order_id", async (req, res) => {

  try {

    const { order_id } = req.params;

    if (!order_id) {
      return res.status(400).json({
        error: "order_id required"
      });
    }

    const { data: payment, error } = await supabase
      .from("payments")
      .select(`
        id,
        order_id,
        status,
        amount,
        currency,
        payment_method,
        created_at,
        paid_at,
        plan_id,
        class_id
      `)
      .eq("order_id", order_id)
      .single();

    if (error || !payment) {
      return res.status(404).json({
        error: "Payment not found"
      });
    }

    return res.json({
      success: true,
      payment
    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      error: "Failed to fetch payment"
    });

  }

});

export default router;