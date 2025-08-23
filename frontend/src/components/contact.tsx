import { FC, useState, useEffect } from "react";
import {
  FiSearch,
  FiUserPlus,
  FiMoreVertical,
  FiMessageCircle,
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

interface ContactHeaderProps {}

const ContactHeader: FC<ContactHeaderProps> = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactEmail, setNewContactEmail] = useState("");
  const [contacts, setContacts] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const authUser = useSelector((state: RootState) => state.auth.user);
  const isAuthenticated = useSelector(
    (state: RootState) => state.auth.isAuthenticated
  );

  // Fetch real contacts from backend
  useEffect(() => {
    if (isAuthenticated && authUser) {
      fetchContacts();
    }
  }, [isAuthenticated, authUser]);

  const fetchContacts = async () => {
    try {
      setLoading(true);

      // Get token from localStorage
      const authUser = localStorage.getItem("authUser");
      const token = authUser ? JSON.parse(authUser).token : null;

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
        const currentUser = JSON.parse(authUser);
        const allUsers = response.data.filter(
          (user: any) => user._id !== currentUser._id
        );
        setContacts(
          allUsers.map((user: any) => ({
            _id: user._id,
            name: user.name,
            email: user.email,
            status: "offline", // Default status
            lastSeen: "Unknown",
          }))
        );
      } else {
        setContacts([]);
      }
    } catch (error) {
      console.error("Error fetching contacts:", error);
      setError("Failed to load contacts");
      // Fallback to empty array
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  // If not authenticated, show loading
  if (!isAuthenticated || !authUser) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading contacts...</p>
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

  const handleAddContact = () => {
    if (newContactEmail.trim()) {
      console.log("Adding contact:", newContactEmail);
      // Here you would make an API call to add the contact
      // You can integrate this with your backend
      setNewContactEmail("");
      setShowAddContact(false);
    }
  };

  const handleStartChat = (contact: User) => {
    console.log("Starting chat with:", contact.name);
    // Here you would navigate to chat or open chat modal
    // You can integrate this with your chat system
  };

  const handleRemoveContact = (contact: User) => {
    console.log("Removing contact:", contact.name);
    // Here you would make an API call to remove the contact
    // You can integrate this with your backend
  };

  return (
    <div className="h-screen bg-gray-50 overflow-hidden" id="contact">
      <div className="h-full max-w-4xl mx-auto bg-white shadow-lg flex flex-col">
        {/* Header - Fixed */}
        <div className="flex-shrink-0 p-4 sm:p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">
              Contacts
            </h1>
            <button
              onClick={() => setShowAddContact(true)}
              className="bg-[#92ffb3] hover:bg-[#7aee9f] text-white p-2 sm:p-2.5 rounded-lg transition-colors flex items-center gap-2"
            >
              <FiUserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Add Contact</span>
            </button>
          </div>
        </div>

        {/* Search Bar - Fixed */}
        <div className="flex-shrink-0 p-4 sm:p-6 pt-0">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 sm:py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-colors"
            />
          </div>
        </div>

        {/* Contacts List - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 pt-0">
          {filteredContacts.length === 0 ? (
            <div className="text-center py-8">
              <FiUserPlus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-2">
                {searchTerm ? "No contacts found" : "No contacts yet"}
              </p>
              <p className="text-gray-400 text-sm mb-4">
                {searchTerm
                  ? "Try adjusting your search"
                  : "Add your first contact to get started"}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => setShowAddContact(true)}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Add First Contact
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredContacts.map((contact) => (
                <div
                  key={contact._id}
                  className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold text-lg sm:text-xl">
                        {contact.avatar ? (
                          <img
                            src={contact.avatar}
                            alt={contact.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          contact.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      {/* Status Indicator */}
                      <div
                        className={`absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 border-white ${getStatusColor(
                          contact.status || "offline"
                        )}`}
                      ></div>
                    </div>

                    {/* Contact Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-800 text-sm sm:text-base truncate">
                        {contact.name}
                      </h3>
                      <p className="text-gray-500 text-xs sm:text-sm truncate">
                        {contact.email}
                      </p>
                      <p className="text-gray-400 text-xs truncate">
                        {contact.status === "online"
                          ? "Online"
                          : `Last seen ${contact.lastSeen}`}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 sm:gap-2">
                      <button
                        onClick={() => handleStartChat(contact)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Start chat"
                      >
                        <FiMessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                      <button
                        onClick={() => handleRemoveContact(contact)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove contact"
                      >
                        <FiMoreVertical className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Contact Modal */}
        {showAddContact && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Add New Contact
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={newContactEmail}
                    onChange={(e) => setNewContactEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowAddContact(false)}
                    className="flex-1 px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddContact}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add Contact
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactHeader;
