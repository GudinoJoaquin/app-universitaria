import express from "express";
import cors from "cors";
import { createConnection } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import eventRoutes from "./routes/eventRoutes.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({ origin: "*", methods: ["GET", "POST", "PUT", "DELETE"] }));

// Middleware de conexión a DB
app.use(async (req, res, next) => {
  try {
    req.db = await createConnection();
    res.on("finish", () => req.db?.end());
    next();
  } catch {
    res.status(500).json({ error: "Error de conexión a la base de datos" });
  }
});

// Rutas principales
app.use("/api", authRoutes);
app.use("/api/events", eventRoutes);

// Ruta por defecto
app.use((req, res) => res.status(404).json({ error: "Ruta no encontrada" }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
