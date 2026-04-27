import express from "express";
import {
  registerToEvent,
  unregisterFromEvent,
  getMyRegistrations,
  getEventParticipants,
} from "../controllers/registrationController.js";
import { auth } from "../middlewares/authMiddleware.js";
import { roleMiddleware } from "../middlewares/roleMiddleware.js";

const router = express.Router();

// Cualquier usuario autenticado puede inscribirse/ver sus inscripciones
router.post("/", auth, registerToEvent);
router.delete("/:eventId", auth, unregisterFromEvent);
router.get("/my", auth, getMyRegistrations);

// Ver participantes (Admin, Helper, Organizer)
router.get("/event/:eventId/participants", auth,
  roleMiddleware(["Admin", "Helper", "Organizer"]),
  getEventParticipants
);

export default router;
