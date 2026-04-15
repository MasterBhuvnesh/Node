import { Router } from "express";
import * as groupController from "./group.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/role.middleware";

const router = Router();

router.use(authenticate);

router.get("/", groupController.getUserGroups);
router.post("/", groupController.createGroup);
router.get("/:id", authorize(["OWNER", "LEADER", "MEMBER"]), groupController.getGroupById);
router.put("/:id", authorize(["OWNER", "LEADER"]), groupController.updateGroup);
router.delete("/:id", authorize(["OWNER"]), groupController.deleteGroup);

export default router;
