import express from "express";
import { getPlans } from "../controllers/plans.controller.js";

const router = express.Router();

/**
 * @openapi
 * /api/plans:
 *   get:
 *     tags:
 *       - Plans
 *     summary: Get available plans
 *     responses:
 *       200:
 *         description: Returns list of plans
 */
router.get("/", getPlans);

export default router;