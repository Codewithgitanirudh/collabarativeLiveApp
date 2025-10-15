import { Router } from "express";
import { createUser, loginUser, logoutUser, refreshAccessToken, getUser, forgotPassword } from "../controllers/userController.js";
import { verifyAccessToken } from "../middleware/verifyJwt.js";

const router = new Router();

router.post("/register", createUser);
router.get("/login", loginUser);
router.get("/logout", verifyAccessToken, logoutUser);
router.get("/refresh", verifyAccessToken, refreshAccessToken);
router.get("/me", verifyAccessToken, getUser);
router.patch("/forgot-password", verifyAccessToken, forgotPassword);

export default router;