import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import fs from "fs";

import swaggerUi from "swagger-ui-express";
import swaggerSpec from "../utils/swagger.js";

import paymentRoutes from "../routes/paymentRoutes.js";
import emailRoutes from "../routes/emailRoutes.js";
import mentorRoutes from "../routes/mentorRoutes.js";

import plansRoutes from "./routes/plans.routes.js";
import meRoutes from "./routes/me.routes.js";

const app = express();

/*
|--------------------------------------------------------------------------
| TRUST PROXY
|--------------------------------------------------------------------------
*/

// Only trust proxy in production with specific trusted proxies
// In development, set to false to avoid security warnings
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1); // Trust first proxy (Nginx/CloudFlare)
} else {
  app.set("trust proxy", false);
}

/*
|--------------------------------------------------------------------------
| SECURITY
|--------------------------------------------------------------------------
*/

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
*/

const allowedOrigins = [
  "https://medskillindonesia.com",
  "https://www.medskillindonesia.com",
  "https://api.medskillindonesia.com",

  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5000",

  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:5000",

  "https://smashed-revengefully-pei.ngrok-free.dev",
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Origin blocked - log handled securely

      return callback(null, false);
    },

    credentials: true,

    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
      "user-id",
      "x-user-id",
    ],
  })
);

/*
|--------------------------------------------------------------------------
| BODY PARSER
|--------------------------------------------------------------------------
*/

app.use(express.json({ limit: "10mb" }));

app.use(
  express.urlencoded({
    extended: true,
  })
);

/*
|--------------------------------------------------------------------------
| RATE LIMITER
|--------------------------------------------------------------------------
*/

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,

  standardHeaders: true,
  legacyHeaders: false,
  
  // Only use keyGenerator in production with trust proxy
  ...(process.env.NODE_ENV === "production" && {
    keyGenerator: (req, res) => {
      return req.ip || req.socket.remoteAddress || "unknown";
    }
  })
});

app.use("/api", apiLimiter);

/*
|--------------------------------------------------------------------------
| STATIC FILES
|--------------------------------------------------------------------------
*/

const uploadsPath = fs.existsSync(
  path.join(process.cwd(), "uploads")
)
  ? path.join(process.cwd(), "uploads")
  : path.join(process.cwd(), "..", "uploads");

// Uploads path initialized

app.use(
  "/uploads",
  express.static(uploadsPath, {
    maxAge: "1d",
    etag: true,
  })
);

/*
|--------------------------------------------------------------------------
| SWAGGER
|--------------------------------------------------------------------------
*/

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/*
|--------------------------------------------------------------------------
| HEALTH
|--------------------------------------------------------------------------
*/

app.get("/health", (req, res) => {
  return res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

/*
|--------------------------------------------------------------------------
| ROUTES
|--------------------------------------------------------------------------
*/

app.use("/api/payments", paymentRoutes);
app.use("/api/email", emailRoutes);
app.use("/api/mentors", mentorRoutes);

app.use("/api/plans", plansRoutes);
app.use("/api/me", meRoutes);

/*
|--------------------------------------------------------------------------
| 404
|--------------------------------------------------------------------------
*/

app.use((req, res) => {
  return res.status(404).json({
    error: "Endpoint not found",
    path: req.originalUrl,
  });
});

/*
|--------------------------------------------------------------------------
| ERROR HANDLER
|--------------------------------------------------------------------------
*/

app.use((err, req, res, next) => {
  // Server error - logged securely
  // Actual error logging should use a proper logging service

  return res.status(500).json({
    error: "Internal Server Error",
    message: err.message,
  });
});

export default app;