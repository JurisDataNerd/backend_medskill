import express from "express";
import snap, { coreApi } from "../utils/midtrans.js";
import { supabaseAdmin as supabase } from "../utils/supabase.js";
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
    const { user_id, plan_id, tryout_id } = req.body;

    if (!user_id || (!plan_id && !tryout_id)) {
      return res.status(400).json({
        error: "user_id and either plan_id or tryout_id required"
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

    let amount = 0;
    let itemId = "";
    let itemName = "";
    let classId = null;

    if (tryout_id) {
      /**
       * GET TRYOUT SET
       */
      const { data: tryout, error: tryoutError } = await supabase
        .from("tryout_sets")
        .select("*")
        .eq("id", tryout_id)
        .single();

      if (tryoutError || !tryout) {
        return res.status(404).json({
          error: "Tryout not found"
        });
      }

      amount = Number(tryout.price || 0);
      itemId = tryout.id;
      itemName = `Tryout: ${tryout.title}`;
    } else {
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

      amount = Number(plan.price);
      itemId = plan.id;
      itemName = plan.name || "Subscription Plan";
      classId = plan.class_id || null;
    }

    /**
     * CREATE ORDER
     */
    const orderId = tryout_id
      ? `MSK-TRY-${Date.now()}`
      : `MEDSKILL-${Date.now()}`;

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
          id: itemId,
          price: amount,
          quantity: 1,
          name: itemName.substring(0, 50)
        }
      ],

      callbacks: {
        finish: `${frontendUrl}/payment/success?order_id=${orderId}`,
        error: `${frontendUrl}/payment/error?order_id=${orderId}`,
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
    const paymentPayload = {
      id: uuidv4(),
      user_id,
      plan_id: plan_id || null,
      tryout_id: tryout_id || null,
      class_id: classId,
      order_id: orderId,
      amount,
      currency: "IDR",
      status: "pending",
      snap_token: transaction.token,
      redirect_url: transaction.redirect_url
    };

    const { data: insertedPayment, error: paymentError } = await supabase
      .from("payments")
      .insert([paymentPayload])
      .select()
      .single();

    if (paymentError) {
      console.error("PAYMENT INSERT ERROR:", paymentError);

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
     * CREATE SUBSCRIPTION OR ACTIVATE TRYOUT
     */
    if (isSuccess) {
      if (payment.tryout_id) {
        /**
         * ACTIVATE TRYOUT REGISTRATION
         */
        const { data: existingReg } = await supabase
          .from("tryout_registrations")
          .select("id")
          .eq("user_id", payment.user_id)
          .eq("tryout_id", payment.tryout_id)
          .maybeSingle();

        const tryoutRegPayload = {
          user_id: payment.user_id,
          tryout_id: payment.tryout_id,
          gform_submitted: true,
          verified: true,
          module_access: true,
          package_type: "paid",
          payment_id: payment.id,
          paid_amount: payment.amount
        };

        let regError;
        if (existingReg) {
          const { error } = await supabase
            .from("tryout_registrations")
            .update({
              verified: true,
              module_access: true,
              package_type: "paid",
              payment_id: payment.id,
              paid_amount: payment.amount
            })
            .eq("id", existingReg.id);
          regError = error;
        } else {
          const { error } = await supabase
            .from("tryout_registrations")
            .insert([tryoutRegPayload]);
          regError = error;
        }

        if (regError) {
          console.error("TRYOUT REGISTRATION ACTIVATION ERROR:", regError);
        } else {
          console.log("TRYOUT REGISTRATION ACTIVATED FOR USER:", payment.user_id, "TRYOUT:", payment.tryout_id);
        }
      } else if (payment.plan_id) {
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