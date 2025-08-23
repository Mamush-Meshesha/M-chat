import asyncHandler from "../middlewares/asyncHandler.js";
import Group from "../models/groupModel.js";
import User from "../models/userModel.js";

// @desc    Get all groups for a user
// @route   GET /api/groups
// @access  Private
const getGroups = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const groups = await Group.find({
    "members.user": userId,
    isActive: true,
  })
    .populate("members.user", "name email")
    .populate("creator", "name email")
    .populate("lastMessageSender", "name")
    .sort({ updatedAt: -1 });

  // Transform the data to match frontend expectations
  const transformedGroups = groups.map((group) => ({
    _id: group._id.toString(),
    name: group.name,
    members: group.members.map((member) => ({
      _id: member.user._id.toString(),
      name: member.user.name,
      email: member.user.email,
      role: member.role,
    })),
    avatar: group.avatar,
    lastMessage: group.lastMessage || "No messages yet",
    lastMessageTime: group.lastMessageTime
      ? new Date(group.lastMessageTime).toLocaleDateString("en-US", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "Never",
    creator: group.creator.name,
    memberCount: group.members.length,
  }));

  res.json({
    success: true,
    groups: transformedGroups,
  });
});

// @desc    Create a new group
// @route   POST /api/groups
// @access  Private
const createGroup = asyncHandler(async (req, res) => {
  const { name, description, memberIds } = req.body;
  const creatorId = req.user._id;

  // Validate required fields
  if (
    !name ||
    !memberIds ||
    !Array.isArray(memberIds) ||
    memberIds.length === 0
  ) {
    res.status(400);
    throw new Error("Group name and at least one member are required");
  }

  // Check if all member IDs are valid users
  const members = await User.find({ _id: { $in: memberIds } });
  if (members.length !== memberIds.length) {
    res.status(400);
    throw new Error("One or more member IDs are invalid");
  }

  // Create group with creator as admin and other members
  const groupMembers = [
    {
      user: creatorId,
      role: "admin",
    },
    ...memberIds.map((memberId) => ({
      user: memberId,
      role: "member",
    })),
  ];

  const group = await Group.create({
    name,
    description,
    creator: creatorId,
    members: groupMembers,
  });

  const populatedGroup = await Group.findById(group._id)
    .populate("members.user", "name email")
    .populate("creator", "name email");

  res.status(201).json({
    success: true,
    group: populatedGroup,
  });
});

// @desc    Add members to a group
// @route   PUT /api/groups/:id/members
// @access  Private
const addMembersToGroup = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { memberIds } = req.body;
  const userId = req.user._id;

  const group = await Group.findById(id);
  if (!group) {
    res.status(404);
    throw new Error("Group not found");
  }

  // Check if user is admin of the group
  const isAdmin = group.members.find(
    (member) =>
      member.user.toString() === userId.toString() && member.role === "admin"
  );
  if (!isAdmin) {
    res.status(403);
    throw new Error("Only group admins can add members");
  }

  // Check if all member IDs are valid users
  const newMembers = await User.find({ _id: { $in: memberIds } });
  if (newMembers.length !== memberIds.length) {
    res.status(400);
    throw new Error("One or more member IDs are invalid");
  }

  // Add new members (avoid duplicates)
  const existingMemberIds = group.members.map((member) =>
    member.user.toString()
  );
  const membersToAdd = memberIds.filter(
    (memberId) => !existingMemberIds.includes(memberId.toString())
  );

  if (membersToAdd.length === 0) {
    res.status(400);
    throw new Error("All members are already in the group");
  }

  const newGroupMembers = membersToAdd.map((memberId) => ({
    user: memberId,
    role: "member",
  }));

  group.members.push(...newGroupMembers);
  await group.save();

  const updatedGroup = await Group.findById(id)
    .populate("members.user", "name email")
    .populate("creator", "name email");

  res.json({
    success: true,
    group: updatedGroup,
  });
});

// @desc    Remove member from group
// @route   DELETE /api/groups/:id/members/:memberId
// @access  Private
const removeMemberFromGroup = asyncHandler(async (req, res) => {
  const { id, memberId } = req.params;
  const userId = req.user._id;

  const group = await Group.findById(id);
  if (!group) {
    res.status(404);
    throw new Error("Group not found");
  }

  // Check if user is admin of the group
  const isAdmin = group.members.find(
    (member) =>
      member.user.toString() === userId.toString() && member.role === "admin"
  );
  if (!isAdmin) {
    res.status(403);
    throw new Error("Only group admins can remove members");
  }

  // Cannot remove the creator
  if (group.creator.toString() === memberId) {
    res.status(400);
    throw new Error("Cannot remove the group creator");
  }

  // Remove the member
  group.members = group.members.filter(
    (member) => member.user.toString() !== memberId
  );

  await group.save();

  const updatedGroup = await Group.findById(id)
    .populate("members.user", "name email")
    .populate("creator", "name email");

  res.json({
    success: true,
    group: updatedGroup,
  });
});

export { getGroups, createGroup, addMembersToGroup, removeMemberFromGroup };
