import express from "express";
import { getMe } from "../controllers/me.controller.js";
import auth from "../../utils/auth.js";

const router = express.Router();

/**
 * @openapi
 * /api/me:
 *   get:
 *     tags:
 *       - Me
 *     summary: Get current authenticated user
 *     parameters:
 *       - in: header
 *         name: user-id
 *         schema:
 *           type: string
 *         description: User ID for authentication
 *     responses:
 *       200:
 *         description: Returns current user information
 *       401:
 *         description: Unauthorized
 */
router.get("/", auth, getMe);

export default router;