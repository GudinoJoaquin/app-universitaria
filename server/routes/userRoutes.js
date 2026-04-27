import express from "express";
import { getUsers, updateUserRole } from "../controllers/userController.js";
import { auth } from "../middlewares/authMiddleware.js";
import { roleMiddleware } from "../middlewares/roleMiddleware.js";

const router = express.Router();

// Admin y Helper pueden listar usuarios; Organizer también si queremos que vea la lista
router.get("/", auth, roleMiddleware(["Admin", "Helper", "Organizer"]), getUsers);

// Admin puede cambiar cualquier rol; Helper/Organizer solo User <-> Organizer (validado en controller)
router.put("/:id/role", auth, roleMiddleware(["Admin", "Helper", "Organizer"]), updateUserRole);

export default router;
