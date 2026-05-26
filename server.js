import dotenv from "dotenv";
import app from "./src/app.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`
🚀 MedSkill Backend Running
-----------------------------------
PORT        : ${PORT}
ENVIRONMENT : ${process.env.NODE_ENV}
-----------------------------------
  `);
});