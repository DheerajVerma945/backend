import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  getMessages,
  sendMessage,
} from "../controllers/message.controller.js";
import { getConnections } from "../controllers/user.request.controller.js";

const router = express.Router();

router.get("/users", protectRoute, getConnections);

router.get("/:id", protectRoute, getMessages);

router.post("/send/:id", protectRoute, sendMessage);

export default router;
