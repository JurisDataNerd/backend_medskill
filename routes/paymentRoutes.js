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

    /**
     * GET PLAN
     */
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

    /**
     * GET USER
     */
    const { data: user, error: userError } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", user_id)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        error: "User not found"
      });
    }

    /**
     * CREATE ORDER
     */
    const orderId = `MEDSKILL-${Date.now()}`;
    const amount = Number(plan.price);

    /**
     * FRONTEND URL
     */
    const frontendUrl =
      process.env.FRONTEND_URL ||
      "http://localhost:5173";

    /**
     * MIDTRANS PARAMETER
     */
    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: amount
      },

      customer_details: {
        email: user.email,
        first_name: user.full_name || "MedSkill User"
      },

      item_details: [
        {
          id: plan.id,
          price: amount,
          quantity: 1,
          name: plan.name || "Subscription Plan"
        }
      ],

      callbacks: {
        finish: `${frontendUrl}/payment/success?order_id=${orderId}`,
        error: `${frontendUrl}/payment/failed?order_id=${orderId}`,
        pending: `${frontendUrl}/payment/pending?order_id=${orderId}`
      }
    };

    /**
     * CREATE MIDTRANS TRANSACTION
     */
    const transaction = await snap.createTransaction(parameter);

    /**
     * SAVE PAYMENT
     */
    const { data: insertedPayment, error: paymentError } = await supabase
      .from("payments")
      .insert([
        {
          id: uuidv4(),
          user_id,
          plan_id,
          class_id: plan.class_id || null,
          order_id: orderId,
          amount,
          currency: "IDR",
          status: "pending",
          snap_token: transaction.token,
          redirect_url: transaction.redirect_url
        }
      ])
      .select()
      .single();

    if (paymentError) {
      console.error(paymentError);

      return res.status(500).json({
        error: "Failed to create payment"
      });
    }

    return res.json({
      success: true,
      snap_token: transaction.token,
      redirect_url: transaction.redirect_url,
      order_id: orderId,
      payment: insertedPayment
    });

  } catch (err) {
    console.error("CREATE PAYMENT ERROR:", err);

    return res.status(500).json({
      error: "Payment creation failed"
    });
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
      gross_amount,
      fraud_status
    } = notification;

    /**
     * VERIFY SIGNATURE
     */
    const serverKey = process.env.MIDTRANS_SERVER_KEY;

    const hash = crypto
      .createHash("sha512")
      .update(order_id + status_code + gross_amount + serverKey)
      .digest("hex");

    if (hash !== signature_key) {
      return res.status(403).json({
        message: "Invalid signature"
      });
    }

    /**
     * GET PAYMENT
     */
    const { data: payment, error: paymentFetchError } = await supabase
      .from("payments")
      .select("*")
      .eq("order_id", order_id)
      .single();

    if (paymentFetchError || !payment) {
      return res.status(404).json({
        message: "Payment not found"
      });
    }

    /**
     * DETERMINE STATUS
     */
    let paymentStatus = transaction_status;

    if (
      transaction_status === "capture" &&
      fraud_status === "challenge"
    ) {
      paymentStatus = "challenge";
    }

    const isSuccess =
      transaction_status === "settlement" ||
      (transaction_status === "capture" &&
        fraud_status === "accept");

    /**
     * UPDATE PAYMENT
     */
    await supabase
      .from("payments")
      .update({
        status: paymentStatus,
        payment_method: payment_type,
        midtrans_transaction_id: transaction_id,
        paid_at: isSuccess ? new Date().toISOString() : null
      })
      .eq("order_id", order_id);

    /**
     * CREATE SUBSCRIPTION
     */
    if (isSuccess) {

      /**
       * CHECK EXISTING SUBSCRIPTION
       */
      const { data: existingSubscription } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("payment_id", payment.id)
        .maybeSingle();

      if (!existingSubscription) {

        /**
         * GET PLAN
         */
        const { data: plan } = await supabase
          .from("plans")
          .select("*")
          .eq("id", payment.plan_id)
          .single();

        if (plan) {

          const startDate = new Date();

          const endDate = new Date();

          endDate.setDate(
            endDate.getDate() + (plan.duration_days || 30)
          );

          /**
           * IMPORTANT:
           * class_id diambil langsung dari payment.class_id
           */
          const subscriptionPayload = {
            user_id: payment.user_id,
            class_id: payment.class_id || null,
            plan_id: payment.plan_id,
            payment_id: payment.id,
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            status: "active"
          };

          const { error: subError } = await supabase
            .from("subscriptions")
            .insert([subscriptionPayload]);

          if (subError) {
            console.error(
              "SUBSCRIPTION INSERT ERROR:",
              subError
            );
          } else {
            console.log(
              "SUBSCRIPTION CREATED:",
              subscriptionPayload
            );
          }
        }
      }
    }

    return res.json({
      success: true,
      message: "Webhook processed"
    });

  } catch (err) {
    console.error("MIDTRANS WEBHOOK ERROR:", err);

    return res.status(500).json({
      message: "Webhook failed"
    });
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