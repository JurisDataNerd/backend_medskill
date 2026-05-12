import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import emailRoutes from "./routes/emailRoutes.js";
import mentorRoutes from "./routes/mentorRoutes.js";

dotenv.config();
const app = express();

// 🔹 CORS Configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://medskillindonesia.com'
    : ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

// 🔹 Gunakan route (penting)
app.use("/api/email", emailRoutes);
app.use("/api/mentors", mentorRoutes);

// 🔹 Default root handler
app.get("/", (req, res) => {
  res.send("✅ Backend MedSkill API berjalan dengan baik!");
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
