import { Router } from "express";
import * as logController from "./log.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/role.middleware";

const router = Router();

router.use(authenticate);

router.get("/:id/logs", authorize(["OWNER", "LEADER", "MEMBER"]), logController.getGroupLogs);

export default router;
