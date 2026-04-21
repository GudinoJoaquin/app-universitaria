
import express from "express";
import { register, login, getProfile } from "../controllers/authController.js";
import { auth } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/login", login);
router.post("/register", register);
router.get("/profile", auth, getProfile);

export default router;
