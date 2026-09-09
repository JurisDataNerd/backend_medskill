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
    const {
      user_id,
      plan_id,
      tryout_id,
      tryout_package_code,
      tryout_package_id,
      simulation_id,
      bimbel_class_id,
      package_id
    } = req.body;

    if (!user_id || (!plan_id && !tryout_id && !tryout_package_code && !tryout_package_id && !simulation_id && !bimbel_class_id)) {
      return res.status(400).json({
        error: "user_id and either plan_id, tryout_id, tryout_package_code, tryout_package_id, simulation_id or bimbel_class_id required"
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
    let bimbelPackageId = package_id || null;
    let tryoutPackageId = tryout_package_id || null;
    let pkgType = null;

    if (bimbel_class_id) {
      /**
       * GET BIMBEL CLASS & PACKAGE
       */
      let pkg = null;
      if (package_id) {
        const { data: foundPkg } = await supabase
          .from("bimbel_packages")
          .select("*, bimbel_classes(id, title)")
          .eq("id", package_id)
          .maybeSingle();
        pkg = foundPkg;
      }

      if (!pkg) {
        const { data: defaultPkg } = await supabase
          .from("bimbel_packages")
          .select("*, bimbel_classes(id, title)")
          .eq("class_id", bimbel_class_id)
          .eq("is_active", true)
          .order("order_index", { ascending: true })
          .limit(1)
          .maybeSingle();
        pkg = defaultPkg;
      }

      if (pkg) {
        bimbelPackageId = pkg.id;
        amount = Number(pkg.promo_price !== null && pkg.promo_price !== undefined ? pkg.promo_price : pkg.price);
        itemId = pkg.id;
        const classTitle = pkg.bimbel_classes?.title || "Bimbel Class";
        itemName = `${classTitle} - ${pkg.name}`;
      } else {
        const { data: bimbelClass, error: bcError } = await supabase
          .from("bimbel_classes")
          .select("*")
          .eq("id", bimbel_class_id)
          .single();

        if (bcError || !bimbelClass) {
          return res.status(404).json({
            error: "Class not found"
          });
        }

        amount = Number(bimbelClass.price || 0);
        itemId = bimbelClass.id;
        itemName = `Bimbel: ${bimbelClass.title}`;
      }
    } else if (simulation_id) {
      /**
       * GET SIMULATION SET
       */
      const { data: simulation, error: simError } = await supabase
        .from("simulation_sets")
        .select("*")
        .eq("id", simulation_id)
        .single();

      if (simError || !simulation) {
        return res.status(404).json({
          error: "Simulation not found"
        });
      }

      amount = Number(simulation.price || 0);
      itemId = simulation.id;
      itemName = `Simulasi: ${simulation.title}`;
    } else if (tryout_package_code || tryout_package_id) {
      /**
       * GET TRYOUT BUNDLE PACKAGE
       */
      let pkgQuery = supabase.from("tryout_packages").select("*");
      if (tryout_package_id) {
        pkgQuery = pkgQuery.eq("id", tryout_package_id);
      } else {
        pkgQuery = pkgQuery.eq("code", tryout_package_code);
      }
      const { data: pkg, error: pkgError } = await pkgQuery.maybeSingle();

      if (pkgError || !pkg) {
        return res.status(404).json({
          error: "Tryout Package not found"
        });
      }

      // ANTI-DOUBLE PURCHASE CHECK for bundle_kombo
      if (pkg.code === "bundle_kombo") {
        const { data: userRegs } = await supabase
          .from("tryout_registrations")
          .select("tryout_id, package_type, tryout_sets(bundle_type)")
          .eq("user_id", user_id)
          .eq("verified", true);

        const hasFiveTo = userRegs?.some(
          (r) => r.tryout_sets?.bundle_type === "bundle_5_to" || r.package_type === "bundle_5_to"
        );
        const hasStase = userRegs?.some(
          (r) => r.tryout_sets?.bundle_type === "bundle_stase"
        );

        if (hasFiveTo || hasStase) {
          return res.status(400).json({
            error: "Pembelian Paket Kombo ditutup karena akun Anda telah memiliki paket/stase bagian dari program ini."
          });
        }
      }

      tryoutPackageId = pkg.id;
      pkgType = pkg.code;
      amount = Number(pkg.promo_price !== null && pkg.promo_price !== undefined ? pkg.promo_price : pkg.price);
      itemId = pkg.code;
      itemName = pkg.title;
    } else if (tryout_id) {
      /**
       * GET TRYOUT SET (Batch or Stase A La Carte)
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
      itemId = tryout.code || tryout.id;
      itemName = tryout.bundle_type === "bundle_stase" ? `TO Stase: ${tryout.title}` : `Tryout: ${tryout.title}`;
      pkgType = tryout.bundle_type || "single";
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
    const orderId = bimbel_class_id
      ? `MSK-KLS-${Date.now()}`
      : simulation_id
      ? `MSK-SIM-${Date.now()}`
      : tryout_id
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
      tryout_package_id: tryoutPackageId || null,
      package_type: pkgType || null,
      simulation_id: simulation_id || null,
      bimbel_class_id: bimbel_class_id || null,
      bimbel_package_id: bimbelPackageId || null,
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

    /**
     * IF BIMBEL CLASS, CREATE PENDING REGISTRATION
     */
    if (bimbel_class_id) {
      let waLink = null;
      if (bimbelPackageId) {
        const { data: pkgData } = await supabase
          .from("bimbel_packages")
          .select("wa_group_link")
          .eq("id", bimbelPackageId)
          .maybeSingle();
        waLink = pkgData?.wa_group_link || null;
      }

      await supabase
        .from("bimbel_registrations")
        .insert([{
          user_id,
          class_id: bimbel_class_id,
          package_id: bimbelPackageId,
          payment_id: insertedPayment.id,
          status: "pending",
          paid_amount: amount,
          wa_group_link: waLink
        }]);
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
      if (order_id?.startsWith("payment_notif_test_")) {
        return res.status(200).json({
          success: true,
          message: "Midtrans test notification received"
        });
      }

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
      if (order_id?.startsWith("payment_notif_test_")) {
        return res.status(200).json({
          success: true,
          message: "Midtrans test notification received"
        });
      }

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
     * CREATE SUBSCRIPTION OR ACTIVATE TRYOUT/SIMULATION
     */
    if (isSuccess) {
      if (payment.simulation_id) {
        /**
         * ACTIVATE SIMULATION REGISTRATION
         */
        const { data: existingReg } = await supabase
          .from("simulation_registrations")
          .select("id")
          .eq("user_id", payment.user_id)
          .eq("simulation_id", payment.simulation_id)
          .maybeSingle();

        const simRegPayload = {
          user_id: payment.user_id,
          simulation_id: payment.simulation_id,
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
            .from("simulation_registrations")
            .update({
              verified: true,
              module_access: true,
              package_type: "paid",
              payment_id: payment.id,
              paid_amount: payment.amount,
              gform_submitted: true
            })
            .eq("id", existingReg.id);
          regError = error;
        } else {
          const { error } = await supabase
            .from("simulation_registrations")
            .insert([simRegPayload]);
          regError = error;
        }

        if (regError) {
          console.error("SIMULATION REGISTRATION ACTIVATION ERROR:", regError);
        } else {
          console.log("SIMULATION REGISTRATION ACTIVATED FOR USER:", payment.user_id, "SIMULATION:", payment.simulation_id);
        }
      } else if (payment.tryout_package_id || payment.package_type === "bundle_5_to" || payment.package_type === "bundle_kombo") {
        /**
         * ACTIVATE TRYOUT BUNDLE REGISTRATIONS
         */
        const pkgType = payment.package_type;
        let targetSetsQuery = supabase.from("tryout_sets").select("id").eq("is_published", true);

        if (pkgType === "bundle_5_to") {
          targetSetsQuery = targetSetsQuery.eq("bundle_type", "bundle_5_to");
        } else if (pkgType === "bundle_kombo") {
          targetSetsQuery = targetSetsQuery.in("bundle_type", ["bundle_5_to", "bundle_stase"]);
        }

        const { data: targetSets, error: setsErr } = await targetSetsQuery;
        if (!setsErr && targetSets && targetSets.length > 0) {
          const perItemAmount = Math.round(Number(payment.amount || 0) / targetSets.length);
          for (const s of targetSets) {
            const { data: existingReg } = await supabase
              .from("tryout_registrations")
              .select("id")
              .eq("user_id", payment.user_id)
              .eq("tryout_id", s.id)
              .maybeSingle();

            const regPayload = {
              user_id: payment.user_id,
              tryout_id: s.id,
              gform_submitted: true,
              verified: true,
              module_access: true,
              package_type: pkgType,
              payment_id: payment.id,
              paid_amount: perItemAmount
            };

            if (existingReg) {
              await supabase.from("tryout_registrations").update(regPayload).eq("id", existingReg.id);
            } else {
              await supabase.from("tryout_registrations").insert([regPayload]);
            }
          }
          console.log(`TRYOUT BUNDLE ACTIVATED (${pkgType}) FOR USER: ${payment.user_id} (${targetSets.length} sets unlocked)`);
        }
      } else if (payment.tryout_id) {
        /**
         * ACTIVATE SINGLE TRYOUT REGISTRATION (Batch or Stase A La Carte)
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
          package_type: payment.package_type || "paid",
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
              package_type: payment.package_type || "paid",
              payment_id: payment.id,
              paid_amount: payment.amount,
              gform_submitted: true
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
      } else if (payment.bimbel_class_id) {
        /**
         * ACTIVATE BIMBEL REGISTRATION
         */
        let waLink = null;
        if (payment.bimbel_package_id) {
          const { data: pkgData } = await supabase
            .from("bimbel_packages")
            .select("wa_group_link")
            .eq("id", payment.bimbel_package_id)
            .maybeSingle();
          waLink = pkgData?.wa_group_link || null;
        }

        const { data: existingReg } = await supabase
          .from("bimbel_registrations")
          .select("id")
          .eq("payment_id", payment.id)
          .maybeSingle();

        if (existingReg) {
          await supabase
            .from("bimbel_registrations")
            .update({
              status: "paid",
              paid_amount: payment.amount,
              payment_type: payment_type,
              wa_group_link: waLink,
              paid_at: new Date().toISOString()
            })
            .eq("id", existingReg.id);
        } else {
          await supabase
            .from("bimbel_registrations")
            .insert([{
              user_id: payment.user_id,
              class_id: payment.bimbel_class_id,
              package_id: payment.bimbel_package_id || null,
              payment_id: payment.id,
              status: "paid",
              paid_amount: payment.amount,
              payment_type: payment_type,
              wa_group_link: waLink,
              paid_at: new Date().toISOString()
            }]);
        }

        console.log("BIMBEL REGISTRATION ACTIVATED FOR USER:", payment.user_id, "CLASS:", payment.bimbel_class_id);
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
/**
 * @openapi
 * /api/payments/tryout-eligibility/{userId}:
 *   get:
 *     tags:
 *       - Payments
 *     summary: Check tryout bundle ownership and combo eligibility
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Returns ownership and eligibility status
 */
router.get("/tryout-eligibility/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    const { data: userRegs, error } = await supabase
      .from("tryout_registrations")
      .select("tryout_id, package_type, tryout_sets(id, bundle_type)")
      .eq("user_id", userId)
      .eq("verified", true);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const hasFiveToBundle = userRegs?.some(
      (r) => r.tryout_sets?.bundle_type === "bundle_5_to" || r.package_type === "bundle_5_to" || r.package_type === "bundle_kombo"
    ) || false;

    const hasStaseItems = userRegs?.some(
      (r) => r.tryout_sets?.bundle_type === "bundle_stase" || r.package_type === "bundle_kombo"
    ) || false;

    const ownedStaseIds = userRegs
      ?.filter((r) => r.tryout_sets?.bundle_type === "bundle_stase" || r.package_type === "bundle_kombo")
      .map((r) => r.tryout_id) || [];

    const isKomboEligible = !hasFiveToBundle && !hasStaseItems;

    return res.status(200).json({
      success: true,
      data: {
        has_five_to_bundle: hasFiveToBundle,
        has_stase_items: hasStaseItems,
        owned_stase_ids: ownedStaseIds,
        is_kombo_eligible: isKomboEligible
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/payments/{order_id}:
 *   get:
 *     tags:
 *       - Payments
 *     summary: Get payment details by order_id
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
        class_id,
        tryout_id,
        simulation_id,
        bimbel_class_id,
        bimbel_package_id
      `)
      .eq("order_id", order_id)
      .single();

    if (error || !payment) {
      return res.status(404).json({
        error: "Payment not found"
      });
    }

    let bimbelRegistration = null;
    if (payment.bimbel_class_id) {
      const { data: bReg } = await supabase
        .from("bimbel_registrations")
        .select(`
          id,
          status,
          wa_group_link,
          bimbel_classes(id, title, img_url),
          bimbel_packages(id, name, wa_group_link)
        `)
        .eq("payment_id", payment.id)
        .maybeSingle();

      bimbelRegistration = bReg;
    }

    return res.json({
      success: true,
      payment: {
        ...payment,
        bimbel_registration: bimbelRegistration
      }
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: "Failed to fetch payment"
    });
  }
});

export default router;