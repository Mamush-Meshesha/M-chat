import express from "express";
import protect from "../middlewares/authMiddleware.js";
const router = express.Router();
import {
  authUser,
  registerUser,
  logoutUser,
  getUserProfile,
  updateUserProfile,
  getAllUsers,
} from "../controllers/userController.js";
import { fetchMessage, sendMessage } from "../controllers/messageController.js";

router.route("/").post(registerUser);
router.post("/logout", logoutUser);
router.post("/auth", authUser);
router
  .route("/profile")
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);
router.get("/get-friends", protect, getAllUsers);
router.post("/send-message", protect, sendMessage);
router.get("/message/:id", protect, fetchMessage);

export default router;
