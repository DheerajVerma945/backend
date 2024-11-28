import express from "express"
import { protectRoute } from "../middleware/auth.middleware.js";
import { reviewInvite, sendInvite } from "../controllers/group.request.controller.js";

const router = express.Router();

router.post("/send",protectRoute,sendInvite);

router.post("/review/:status",protectRoute,reviewInvite)


export default router