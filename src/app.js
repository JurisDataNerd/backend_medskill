import express from "express";
import paymentRoutes from "../routes/paymentRoutes.js";
import plansRoutes from "./routes/plans.routes.js";
import meRoutes from "./routes/me.routes.js";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "../utils/swagger.js";

const app = express();

app.use(express.json());

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api/payments", paymentRoutes);
app.use("/api/plans", plansRoutes);
app.use("/api/me", meRoutes);

export default app;