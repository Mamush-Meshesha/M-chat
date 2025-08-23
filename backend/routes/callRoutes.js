import express from "express";
import protect from "../middlewares/authMiddleware.js";
import {
  getCallHistory,
  createCall,
  updateCall,
} from "../controllers/callController.js";

const router = express.Router();

// All routes are protected
router.use(protect);

router.route("/history").get(getCallHistory);
router.route("/").post(createCall);
router.route("/:id").put(updateCall);

export default router;
