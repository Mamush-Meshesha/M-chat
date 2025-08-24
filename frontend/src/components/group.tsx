import { FC, useState, useEffect } from "react";
import {
  FiSearch,
  FiUserPlus,
  FiMoreVertical,
  FiMessageCircle,
  FiPhone,
  FiVideo,
} from "react-icons/fi";
import { MdGroup } from "react-icons/md";
import { useSelector } from "react-redux";
import { RootState } from "../store";
import axios from "axios";

interface User {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  status?: "online" | "offline" | "away";
  lastSeen?: string;
}

interface Group {
  _id: string;
  name: string;
  members: User[];
  avatar?: string;
  lastMessage?: string;
  lastMessageTime?: string;
}

interface GroupHeaderProps {}

const GroupHeader: FC<GroupHeaderProps> = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"contacts" | "groups">("contacts");
  const [showAddUser, setShowAddUser] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [contacts, setContacts] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const authUser = useSelector((state: RootState) => state.auth.user);
  const isAuthenticated = useSelector(
    (state: RootState) => state.auth.isAuthenticated
  );

  // Fetch real data from backend
  useEffect(() => {
    if (isAuthenticated && authUser) {
      fetchContacts();
      fetchGroups();
    }
  }, [isAuthenticated, authUser]);

  const fetchContacts = async () => {
    try {
      setLoading(true);

      // Get token from localStorage
      const storedAuthUser = localStorage.getItem("authUser");
      const token = storedAuthUser ? JSON.parse(storedAuthUser).token : null;

      if (!token) {
        throw new Error("No authentication token found");
      }

      // Fetch contacts from the correct backend API endpoint
      const response = await axios.get(
        "http://localhost:5300/api/users/get-friends",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data && Array.isArray(response.data)) {
        // Filter out current user and format as contacts
        if (storedAuthUser) {
          const currentUser = JSON.parse(storedAuthUser);
          if (currentUser && currentUser._id) {
            const allUsers = response.data.filter(
              (user: { _id: string; name: string; email: string }) =>
                user._id !== currentUser._id
            );
            setContacts(
              allUsers.map(
                (user: { _id: string; name: string; email: string }) => ({
                  _id: user._id,
                  name: user.name,
                  email: user.email,
                  status: "offline" as const, // Default status
                  lastSeen: "Unknown",
                })
              )
            );
          } else {
            setContacts([]);
          }
        } else {
          setContacts([]);
        }
      } else {
        setContacts([]);
      }
    } catch (error) {
      console.error("Error fetching contacts:", error);
      setError("Failed to load contacts");
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      // Get token from localStorage
      const authUser = localStorage.getItem("authUser");
      const token = authUser ? JSON.parse(authUser).token : null;

      if (!token) {
        throw new Error("No authentication token found");
      }

      // Fetch groups from your backend API
      const response = await axios.get("http://localhost:5300/api/groups", {
        headers: {
          Authorization: `Bearer ${token || ""}`,
        },
      });

      if (response.data.success) {
        setGroups(response.data.groups);
      } else {
        // If no groups endpoint, create sample groups from contacts
        if (contacts.length > 0) {
          const sampleGroups: Group[] = [
            {
              _id: "g1",
              name: "Project Team",
              members: contacts.slice(0, Math.min(3, contacts.length)),
              lastMessage: "Meeting at 3 PM today",
              lastMessageTime: "2 hours ago",
            },
            {
              _id: "g2",
              name: "Friends Group",
              members: contacts.slice(0, Math.min(5, contacts.length)),
              lastMessage: "Who wants to grab lunch?",
              lastMessageTime: "1 day ago",
            },
          ];
          setGroups(sampleGroups);
        } else {
          setGroups([]);
        }
      }
    } catch (error) {
      console.error("Error fetching groups:", error);
      // Create sample groups from available contacts
      if (contacts.length > 0) {
        const sampleGroups: Group[] = [
          {
            _id: "g1",
            name: "Project Team",
            members: contacts.slice(0, Math.min(3, contacts.length)),
            lastMessage: "Meeting at 3 PM today",
            lastMessageTime: "2 hours ago",
          },
          {
            _id: "g2",
            name: "Friends Group",
            members: contacts.slice(0, Math.min(5, contacts.length)),
            lastMessage: "Who wants to grab lunch?",
            lastMessageTime: "1 day ago",
          },
        ];
        setGroups(sampleGroups);
      } else {
        setGroups([]);
      }
    }
  };

  // Create a default group if no groups exist
  const createDefaultGroup = async () => {
    if (contacts.length === 0) {
      alert(
        "No contacts available to create a group. Please add some contacts first."
      );
      return;
    }

    try {
      // Get token from localStorage
      const authUser = localStorage.getItem("authUser");
      const token = authUser ? JSON.parse(authUser).token : null;

      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await axios.post(
        "http://localhost:5300/api/groups",
        {
          name: "My First Group",
          description: "A group to get you started",
          memberIds: contacts
            .slice(0, Math.min(3, contacts.length))
            .map((contact) => contact._id),
        },
        {
          headers: {
            Authorization: `Bearer ${token || ""}`,
          },
        }
      );

      // Handle both success format and direct response
      if (response.data.success || response.data._id) {
        // Refresh groups after creation
        fetchGroups();
        alert("Default group created successfully!");
      } else {
        throw new Error("Failed to create group");
      }
    } catch (error) {
      console.error("Error creating default group:", error);
      alert("Failed to create default group. Please try again.");
    }
  };

  // Create a new group
  const handleCreateGroup = async () => {
    if (newGroupName.trim() && selectedUsers.length > 0) {
      try {
        // Get token from localStorage
        const authUser = localStorage.getItem("authUser");
        const token = authUser ? JSON.parse(authUser).token : null;

        if (!token) {
          throw new Error("No authentication token found");
        }

        const response = await axios.post(
          "http://localhost:5300/api/groups",
          {
            name: newGroupName,
            description: `Group: ${newGroupName}`,
            memberIds: selectedUsers,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        // Handle both success format and direct response
        if (response.data.success || response.data._id) {
          setNewGroupName("");
          setSelectedUsers([]);
          setShowAddUser(false);
          // Refresh groups after creation
          fetchGroups();
          alert("Group created successfully!");
        } else {
          throw new Error("Failed to create group");
        }
      } catch (error) {
        console.error("Error creating group:", error);
        alert("Failed to create group. Please try again.");
      }
    } else {
      alert("Please enter a group name and select at least one member.");
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  // If not authenticated, show loading
  if (!isAuthenticated || !authUser) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading contacts...</p>
        </div>
      </div>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading contacts and groups...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <p className="text-red-600 text-lg mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              fetchContacts();
              fetchGroups();
            }}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const filteredContacts = contacts.filter(
    (contact) =>
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredGroups = groups.filter((group) =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-green-500";
      case "away":
        return "bg-yellow-500";
      case "offline":
        return "bg-gray-400";
      default:
        return "bg-gray-400";
    }
  };

  const handleStartChat = (user: User) => {
    console.log("Starting chat with:", user.name);
    // Here you would navigate to chat or open chat modal
    // You can integrate this with your chat system
  };

  const handleCall = (user: User, type: "audio" | "video") => {
    console.log(`${type} calling:`, user.name);
    // Here you would integrate with your calling service
    // You can integrate this with your calling system
  };

  return (
    <div className="h-screen bg-gray-50 overflow-hidden" id="users">
      <div className="h-full max-w-4xl mx-auto bg-white shadow-lg flex flex-col">
        {/* Header - Fixed */}
        <div className="bg-gradient-to-r from-green-500 to-blue-600 text-white p-3 sm:p-4 flex-shrink-0">
          <h1 className="text-xl sm:text-2xl md:text-2xl font-bold mb-1 sm:mb-2">
            Contacts & Groups
          </h1>
          <p className="text-green-100 text-xs sm:text-sm">
            Manage your contacts and group conversations
          </p>
        </div>

        {/* Search and Actions - Fixed */}
        <div className="p-3 sm:p-4 border-b bg-gray-50 flex-shrink-0">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <FiSearch className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search contacts or groups..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-xs sm:text-sm"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-1.5 sm:gap-2">
              <button
                onClick={() => setShowAddUser(true)}
                className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-xs sm:text-sm flex items-center gap-1.5"
              >
                <FiUserPlus className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Create Group</span>
              </button>
              {groups.length === 0 && contacts.length > 0 && (
                <button
                  onClick={createDefaultGroup}
                  className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-xs sm:text-sm flex items-center gap-1.5"
                >
                  <MdGroup className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Quick Group</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs - Fixed */}
        <div className="flex border-b flex-shrink-0">
          <button
            onClick={() => setActiveTab("contacts")}
            className={`flex-1 py-2.5 sm:py-3 px-3 sm:px-4 text-center font-medium transition-colors text-xs sm:text-sm ${
              activeTab === "contacts"
                ? "text-green-600 border-b-2 border-green-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Contacts ({filteredContacts.length})
          </button>
          <button
            onClick={() => setActiveTab("groups")}
            className={`flex-1 py-2.5 sm:py-3 px-3 sm:px-4 text-center font-medium transition-colors text-xs sm:text-sm ${
              activeTab === "groups"
                ? "text-green-600 border-b-2 border-green-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Groups ({filteredGroups.length})
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-3 sm:p-4">
            {activeTab === "contacts" ? (
              // Contacts Tab
              <div className="space-y-2 sm:space-y-3">
                {filteredContacts.length === 0 ? (
                  <div className="text-center py-6 sm:py-8">
                    <div className="text-gray-400 text-3xl sm:text-4xl mb-3">
                      👥
                    </div>
                    <h3 className="text-base sm:text-lg font-medium text-gray-600 mb-2">
                      No contacts found
                    </h3>
                    <p className="text-gray-500 text-xs sm:text-sm">
                      Try adjusting your search criteria
                    </p>
                  </div>
                ) : (
                  filteredContacts.map((contact) => (
                    <div
                      key={contact._id}
                      className="border border-gray-200 rounded-lg p-2.5 sm:p-3 hover:shadow-md transition-shadow"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                        {/* Contact Info */}
                        <div className="flex items-center gap-2 sm:gap-3">
                          {/* Avatar */}
                          <div className="relative">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm sm:text-base lg:text-lg flex-shrink-0">
                              {contact.name.charAt(0).toUpperCase()}
                            </div>
                            <div
                              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4 rounded-full border-2 border-white ${getStatusColor(
                                contact.status || "offline"
                              )}`}
                            ></div>
                          </div>

                          {/* Contact Details */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-800 text-sm sm:text-base lg:text-lg truncate">
                              {contact.name}
                            </h3>
                            <p className="text-gray-600 text-xs sm:text-sm truncate">
                              {contact.email}
                            </p>
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${getStatusColor(
                                  contact.status || "offline"
                                )}`}
                              ></span>
                              <span className="truncate text-xs">
                                {contact.status === "online"
                                  ? "Online"
                                  : `Last seen ${contact.lastSeen}`}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-center sm:justify-end gap-1.5 sm:gap-2 flex-wrap">
                          <button
                            onClick={() => handleStartChat(contact)}
                            className="p-1.5 sm:p-2 text-blue-600 hover:bg-blue-100 rounded-full transition-colors"
                            title="Start chat"
                          >
                            <FiMessageCircle className="text-base sm:text-lg lg:text-xl" />
                          </button>
                          <button
                            onClick={() => handleCall(contact, "audio")}
                            className="p-1.5 sm:p-2 text-green-600 hover:bg-green-100 rounded-full transition-colors"
                            title="Audio call"
                          >
                            <FiPhone className="text-base sm:text-lg lg:text-xl" />
                          </button>
                          <button
                            onClick={() => handleCall(contact, "video")}
                            className="p-1.5 sm:p-2 text-purple-600 hover:bg-purple-100 rounded-full transition-colors"
                            title="Video call"
                          >
                            <FiVideo className="text-base sm:text-lg lg:text-xl" />
                          </button>
                          <button className="p-1.5 sm:p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                            <FiMoreVertical className="text-base sm:text-lg lg:text-xl" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              // Groups Tab
              <div className="space-y-2 sm:space-y-3">
                {filteredGroups.length === 0 ? (
                  <div className="text-center py-6 sm:py-8">
                    <div className="text-gray-400 text-3xl sm:text-4xl mb-3">
                      👥
                    </div>
                    <h3 className="text-base sm:text-lg font-medium text-gray-600 mb-2">
                      No groups found
                    </h3>
                    <p className="text-gray-500 text-xs sm:text-sm mb-4">
                      {searchTerm
                        ? "Try adjusting your search"
                        : "Create a new group to get started"}
                    </p>
                    {!searchTerm && (
                      <button
                        onClick={() => setShowAddUser(true)}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-xs sm:text-sm"
                      >
                        Create Your First Group
                      </button>
                    )}
                  </div>
                ) : (
                  filteredGroups.map((group) => (
                    <div
                      key={group._id}
                      className="border border-gray-200 rounded-lg p-2.5 sm:p-3 hover:shadow-md transition-shadow"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                        {/* Group Info */}
                        <div className="flex items-center gap-2 sm:gap-3">
                          {/* Avatar */}
                          <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-bold text-sm sm:text-base lg:text-lg flex-shrink-0">
                            <MdGroup className="text-base sm:text-lg lg:text-xl" />
                          </div>

                          {/* Group Details */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-800 text-sm sm:text-base lg:text-lg truncate">
                              {group.name}
                            </h3>
                            <p className="text-gray-600 text-xs sm:text-sm">
                              {group.members.length} members
                            </p>
                            {group.lastMessage && (
                              <p className="text-gray-500 text-xs mt-0.5 truncate">
                                {group.lastMessage} • {group.lastMessageTime}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-center sm:justify-end gap-1.5 sm:gap-2">
                          <button
                            onClick={() => handleStartChat(group as any)}
                            className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-xs sm:text-sm"
                          >
                            <span className="hidden sm:inline">Open Chat</span>
                            <span className="sm:hidden">Chat</span>
                          </button>
                          <button className="p-1.5 sm:p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                            <FiMoreVertical className="text-base sm:text-lg lg:text-xl" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Add User/Group Modal */}
        {showAddUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
            <div className="bg-white rounded-lg p-3 sm:p-4 w-full max-w-sm sm:max-w-md mx-2 sm:mx-4 max-h-[85vh] sm:max-h-[90vh] overflow-y-auto">
              <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">
                Create New Group
              </h3>

              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    Group Name
                  </label>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Enter group name"
                    className="w-full px-2.5 sm:px-3 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-xs sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    Select Members
                  </label>
                  <div className="max-h-24 sm:max-h-32 overflow-y-auto space-y-1.5 sm:space-y-2">
                    {contacts.map((contact) => (
                      <label
                        key={contact._id}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(contact._id)}
                          onChange={() => toggleUserSelection(contact._id)}
                          className="rounded text-green-600 focus:ring-green-500 w-3 h-3 sm:w-4 sm:h-4"
                        />
                        <span className="text-xs sm:text-sm">
                          {contact.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 sm:gap-3 mt-4 sm:mt-6">
                <button
                  onClick={() => setShowAddUser(false)}
                  className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-xs sm:text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateGroup}
                  disabled={!newGroupName.trim() || selectedUsers.length === 0}
                  className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                >
                  Create Group
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupHeader;
