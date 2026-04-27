import express from "express";
import {
  getStates,
  getDefaultState,
  createState,
  updateState,
  deleteState,
  setDefaultState,
  assignStateToUser,
  removeStateFromUser,
  getUsersByState,
} from "../controllers/stateController.js";
import { auth } from "../middlewares/authMiddleware.js";
import { roleMiddleware } from "../middlewares/roleMiddleware.js";

const router = express.Router();

// Lectura pública
router.get("/default", getDefaultState);
router.get("/", getStates);

// CRUD de estados — Admin y Helper
router.post("/", auth, roleMiddleware(["Admin", "Helper"]), createState);
router.put("/:id", auth, roleMiddleware(["Admin", "Helper"]), updateState);
router.delete("/:id", auth, roleMiddleware(["Admin"]), deleteState);
router.post("/:id/set-default", auth, roleMiddleware(["Admin"]), setDefaultState);

// Asignar/quitar estado a usuarios — Admin y Helper
router.post("/assign-user", auth, roleMiddleware(["Admin", "Helper"]), assignStateToUser);
router.post("/remove-user", auth, roleMiddleware(["Admin", "Helper"]), removeStateFromUser);
router.get("/:stateId/users", auth, roleMiddleware(["Admin", "Helper"]), getUsersByState);

export default router;
