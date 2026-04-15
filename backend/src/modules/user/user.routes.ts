import { Router } from "express";
import * as userController from "./user.controller";
import { authenticate } from "../../middleware/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/me", userController.getProfile);
router.put("/me", userController.updateProfile);

export default router;
