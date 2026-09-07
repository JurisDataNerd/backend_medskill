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
import rentalRoutes from "./routes/rental.routes.js";
import adminRoutes from "./routes/admin.routes.js";

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
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        // Masukkan URL frontend kamu di sini agar diizinkan masuk ke iframe
        "frame-ancestors": [
          "'self'",
          "http://localhost:5173",
          "http://localhost:5174",
          "http://127.0.0.1:5173",
          "http://127.0.0.1:5174",
          "https://medskillindonesia.com",
          "https://www.medskillindonesia.com"
        ],
      },
    },
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

const isAllowedOrigin = (origin: string): boolean => {
  const cleanOrigin = origin.replace(/\/+$/, "");

  if (allowedOrigins.includes(cleanOrigin)) return true;

  if (process.env.FRONTEND_URL && cleanOrigin === process.env.FRONTEND_URL.replace(/\/+$/, "")) return true;
  if (process.env.CLIENT_URL && cleanOrigin === process.env.CLIENT_URL.replace(/\/+$/, "")) return true;
  if (process.env.CORS_ORIGIN && cleanOrigin === process.env.CORS_ORIGIN.replace(/\/+$/, "")) return true;

  // Allow all medskillindonesia.com subdomains (http & https)
  if (/^https?:\/\/(.+\.)?medskillindonesia\.com$/i.test(cleanOrigin)) return true;

  // Allow localhost / 127.0.0.1 with any port
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(cleanOrigin)) return true;

  return false;
};

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || isAllowedOrigin(origin)) {
        return callback(null, true);
      }

      console.warn(`[CORS] Blocked request from origin: ${origin}`);
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
      "Access-Control-Allow-Origin",
    ],

    optionsSuccessStatus: 200,
  })
);

// Enable pre-flight for all routes (Express 5 compatible wildcard syntax)
app.options("{*path}", cors());

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
app.use("/api/rental", rentalRoutes);
app.use("/api/admin", adminRoutes);

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