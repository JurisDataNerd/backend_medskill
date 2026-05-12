import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import emailRoutes from "./routes/emailRoutes.js";
import mentorRoutes from "./routes/mentorRoutes.js";

dotenv.config();

const app = express();

/*
|--------------------------------------------------------------------------
| Security Middleware
|--------------------------------------------------------------------------
*/

app.use(helmet());

/*
|--------------------------------------------------------------------------
| CORS Configuration
|--------------------------------------------------------------------------
*/

const allowedOrigins = process.env.NODE_ENV === "production"
  ? [
      "https://medskillindonesia.com",
      "https://www.medskillindonesia.com"
    ]
  : [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5174"
    ];

const corsOptions = {
  origin: function (origin, callback) {

    // allow server-to-server requests or curl
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS not allowed"));
    }

  },
  credentials: true,
  methods: ["GET","POST","PUT","DELETE","PATCH","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"]
};

app.use(cors(corsOptions));

/*
|--------------------------------------------------------------------------
| Body Parser
|--------------------------------------------------------------------------
*/

app.use(express.json());

/*
|--------------------------------------------------------------------------
| Rate Limiting (anti abuse)
|--------------------------------------------------------------------------
*/

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false
});

app.use(limiter);

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

app.use("/api/email", emailRoutes);
app.use("/api/mentors", mentorRoutes);

/*
|--------------------------------------------------------------------------
| Health Check
|--------------------------------------------------------------------------
*/

app.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "MedSkill Backend API",
    timestamp: new Date().toISOString()
  });
});

/*
|--------------------------------------------------------------------------
| Global Error Handler
|--------------------------------------------------------------------------
*/

app.use((err, req, res, next) => {

  console.error("Server Error:", err.message);

  if (err.message === "CORS not allowed") {
    return res.status(403).json({
      error: "CORS blocked request"
    });
  }

  res.status(500).json({
    error: "Internal Server Error"
  });

});

/*
|--------------------------------------------------------------------------
| Start Server
|--------------------------------------------------------------------------
*/

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚀 MedSkill Backend running on port ${PORT}`);
});