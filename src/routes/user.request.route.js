import express from "express"
import { exploreUsers, getConnections, getRequests, removeConnection, reviewRequest, sendRequest } from "../controllers/user.request.controller.js";
import {protectRoute} from "../middleware/auth.middleware.js"

const router = express.Router();

router.post("/send",protectRoute,sendRequest);

router.get("/fetch",protectRoute,getRequests);

router.post("/review/:status",protectRoute,reviewRequest);

router.delete("/remove",protectRoute,removeConnection);

router.get("/exploreUsers",protectRoute,exploreUsers);

router.get("/connections",protectRoute,getConnections);


export default router