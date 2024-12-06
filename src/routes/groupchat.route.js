import express from "express"
import {protectRoute} from "../middleware/auth.middleware.js"
import { getMessages, getUnreadCount, sendMessage } from "../controllers/group.message.controller.js";

const router = express.Router();


router.post("/send/:groupId",protectRoute,sendMessage);

router.get("/getMessages/:groupId",protectRoute,getMessages);

router.get("/unread/:groupId",protectRoute,getUnreadCount);


export default router;