import express from "express";
import protect from "../middlewares/authMiddleware.js";
import {
  getGroups,
  createGroup,
  addMembersToGroup,
  removeMemberFromGroup,
} from "../controllers/groupController.js";

const router = express.Router();

// All routes are protected
router.use(protect);

router.route("/").get(getGroups).post(createGroup);
router.route("/:id/members").put(addMembersToGroup);
router.route("/:id/members/:memberId").delete(removeMemberFromGroup);

export default router;

