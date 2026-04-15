import { Router } from "express";
import * as memberController from "./member.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/role.middleware";

const router = Router();

router.use(authenticate);

router.post("/:id/members", authorize(["OWNER", "LEADER"]), memberController.addMember);
router.delete("/:id/members/:userId", authorize(["OWNER", "LEADER"]), memberController.removeMember);
router.put("/:id/members/:userId/role", authorize(["OWNER"]), memberController.updateMemberRole);

export default router;
