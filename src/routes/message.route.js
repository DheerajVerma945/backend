import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  getMessages,
  sendMessage,
  getUnreadCount,
} from "../controllers/message.controller.js";

const router = express.Router();

router.get("/:id", protectRoute, getMessages);

router.post("/send/:id", protectRoute, sendMessage);

router.get("/unread/:senderId", protectRoute, getUnreadCount);

export default router;
