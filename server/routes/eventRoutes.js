
import express from "express";
import {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
} from "../controllers/eventController.js";
import { auth } from "../middlewares/authMiddleware.js";
import { checkRole } from "../middlewares/roleMiddleware.js";

const router = express.Router();

router.get("/", auth, getEvents);
router.get("/:id", auth, getEventById);
router.post("/", auth, checkRole(["admin", "teacher"]), createEvent);
router.put("/:id", auth, updateEvent);
router.delete("/:id", auth, deleteEvent);

export default router;
