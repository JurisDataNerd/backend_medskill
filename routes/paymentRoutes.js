import express from "express";
import snap from "../utils/midtrans.js";
import supabase from "../utils/supabase.js";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

/**
 * @openapi
 * /api/payments/create:
 *   post:
 *     tags:
 *       - Payments
 *     summary: Create a payment and generate Midtrans transaction
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user_id:
 *                 type: string
 *               plan_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Returns snap token and redirect url
 */
router.post("/create", async (req, res) => {
  try {
    const { user_id, plan_id } = req.body;

    if (!user_id || !plan_id) {
      return res.status(400).json({
        error: "user_id and plan_id required"
      });
    }

    const { data: plan, error: planError } = await supabase
      .from("plans")
      .select("*")
      .eq("id", plan_id)
      .single();

    if (planError || !plan) {
      return res.status(404).json({ error: "Plan not found" });
    }

    const { data: user, error: userError } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", user_id)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: "User not found" });
    }

    const orderId = "MEDSKILL-" + Date.now();
    const amount = plan.price;

    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: amount
      },
      customer_details: {
        email: user.email,
        first_name: user.full_name || "MedSkill User"
      }
    };

    const transaction = await snap.createTransaction(parameter);

    const { error: paymentError } = await supabase
      .from("payments")
      .insert([
        {
          id: uuidv4(),
          user_id,
          plan_id,
          class_id: plan.class_id,
          order_id: orderId,
          amount,
          currency: "IDR",
          status: "pending",
          snap_token: transaction.token
        }
      ]);

    if (paymentError) {
      console.error(paymentError);
      return res.status(500).json({ error: "Failed to create payment" });
    }

    return res.json({
      snap_token: transaction.token,
      redirect_url: transaction.redirect_url,
      order_id: orderId
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Payment creation failed" });
  }
});


/**
 * @openapi
 * /api/payments/notification:
 *   post:
 *     tags:
 *       - Payments
 *     summary: Midtrans webhook receiver
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed
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

    const hash = crypto
      .createHash("sha512")
      .update(order_id + status_code + gross_amount + serverKey)
      .digest("hex");

    if (hash !== signature_key) {
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

    const isSuccess = ["settlement", "capture"].includes(transaction_status);

    await supabase
      .from("payments")
      .update({
        status: transaction_status,
        payment_method: payment_type,
        midtrans_transaction_id: transaction_id,
        paid_at: isSuccess ? new Date() : null
      })
      .eq("order_id", order_id);

    /**
     * CREATE SUBSCRIPTION
     */
    if (isSuccess) {
      const { data: existing } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("payment_id", payment.id)
        .maybeSingle();

      if (!existing) {
        const { data: plan } = await supabase
          .from("plans")
          .select("duration_days")
          .eq("id", payment.plan_id)
          .single();

        if (plan) {
          const startDate = new Date();
          const endDate = new Date();
          endDate.setDate(endDate.getDate() + plan.duration_days);

          await supabase.from("subscriptions").insert([
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
    }

    return res.json({ message: "Webhook processed" });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Webhook failed" });
  }
});


/**
 * @openapi
 * /api/payments/{order_id}:
 *   get:
 *     tags:
 *       - Payments
 *     summary: Get payment status by order id
 *     parameters:
 *       - in: path
 *         name: order_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Returns payment information
 */
router.get("/:order_id", async (req, res) => {
  try {
    const { order_id } = req.params;

    if (!order_id) {
      return res.status(400).json({ error: "order_id required" });
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
      return res.status(404).json({ error: "Payment not found" });
    }

    return res.json({ success: true, payment });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch payment" });
  }
});

export default router;