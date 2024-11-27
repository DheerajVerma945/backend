import express from "express"
import {protectRoute} from "../middleware/auth.middleware.js"
import { getMessages, sendMessage } from "../controllers/group.message.controller.js";

const router = express.Router();


router.post("/send",protectRoute,sendMessage);

router.get("/getMessages",protectRoute,getMessages);


export default router;