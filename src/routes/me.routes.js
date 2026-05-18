import express from "express";
import { getMe } from "../controllers/me.controller.js";
import checkSubscription from "../../utils/checkSubscription.js";

const router = express.Router();

router.get("/", checkSubscription, getMe);

export default router;