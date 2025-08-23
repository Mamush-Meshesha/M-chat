import { FC, useState, useEffect, useRef } from "react";
import { CgProfile } from "react-icons/cg";
import { CiBookmark } from "react-icons/ci";
import { HiChatBubbleBottomCenter } from "react-icons/hi2";
import { IoMdContact } from "react-icons/io";
import { IoSettingsOutline } from "react-icons/io5";
import { MdWifiCalling } from "react-icons/md";
import { HiMenu, HiX } from "react-icons/hi";
import { FiSearch } from "react-icons/fi";
import ChatHeader from "./chatheader";
import ContactHeader from "./contact";
import CallingHeader from "./calling";
import SettingHeader from "./setting";
import ChatGroup from "./group";

interface HeaderProps {
  activeUser: Array<{ userId: string; socketId: string; authUser?: any }>;
  unreadCounts: { [userId: string]: number };
}

const Header: FC<HeaderProps> = ({ activeUser, unreadCounts }) => {
  const [conditionalComponent, setConditionalComponent] =
    useState<string>("chat");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [openDialog, setOpenDialog] = useState<string | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Auto-hide sidebar on mobile after selection
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setIsMobileMenuOpen(false);
    }
  }, [conditionalComponent]);

  // Handle window resize - Always keep sidebar expanded on larger screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        // Always keep sidebar expanded on desktop
        setIsSidebarCollapsed(false);
        setIsMobileMenuOpen(false);
      } else {
        // Mobile/Tablet: Start collapsed
        setIsSidebarCollapsed(false);
        setIsMobileMenuOpen(false);
      }
    };

    handleResize(); // Initial call
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Swipe gesture handling
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && window.innerWidth < 1024) {
      // Swipe left to close sidebar
      setIsMobileMenuOpen(false);
    } else if (isRightSwipe && window.innerWidth < 1024) {
      // Swipe right to open sidebar
      setIsMobileMenuOpen(true);
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobileMenuOpen && window.innerWidth < 1024) {
        setIsMobileMenuOpen(false);
      }

      // Alt + M to toggle mobile menu
      if (e.altKey && e.key === "m" && window.innerWidth < 1024) {
        setIsMobileMenuOpen(!isMobileMenuOpen);
      }

      // Escape to close dialogs
      if (e.key === "Escape" && openDialog) {
        setOpenDialog(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileMenuOpen, openDialog]);

  // Focus management for accessibility
  useEffect(() => {
    if (isMobileMenuOpen && sidebarRef.current) {
      const firstButton = sidebarRef.current.querySelector("button");
      if (firstButton) {
        (firstButton as HTMLElement).focus();
      }
    }
  }, [isMobileMenuOpen]);

  const renderConditionalComponent = () => {
    switch (conditionalComponent) {
      case "chat":
        return (
          <ChatHeader activeUser={activeUser} unreadCounts={unreadCounts} />
        );
      case "contact":
        return <ContactHeader />;
      case "calling":
        return <CallingHeader />;
      case "group":
        return <ChatGroup />;
      case "setting":
        return <SettingHeader />;
      default:
        return (
          <ChatHeader activeUser={activeUser} unreadCounts={unreadCounts} />
        );
    }
  };

  const handleNavClick = (component: string) => {
    if (component === "chat") {
      // Chat always opens in main content area
      setConditionalComponent("chat");
      setOpenDialog(null);
    } else {
      // All other components open as dialogs (Telegram style)
      setOpenDialog(component);
      setConditionalComponent("chat"); // Keep chat as main content
    }
  };

  const closeDialog = () => {
    setOpenDialog(null);
  };

  // Calculate total unread messages
  const totalUnread = Object.values(unreadCounts).reduce(
    (sum, count) => sum + count,
    0
  );

  // Render dialog content
  const renderDialog = () => {
    if (!openDialog) return null;

    const dialogTitle = {
      contact: "Contacts",
      calling: "Call History",
      group: "Contacts & Groups",
      setting: "Settings",
    }[openDialog];

    const dialogContent = {
      contact: <ContactHeader />,
      calling: <CallingHeader />,
      group: <ChatGroup />,
      setting: <SettingHeader />,
    }[openDialog];

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Dialog Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">
              {dialogTitle}
            </h2>
            <button
              onClick={closeDialog}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <HiX size={20} />
            </button>
          </div>

          {/* Dialog Content */}
          <div className="flex-1 overflow-y-auto">{dialogContent}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Mobile menu button - Only visible on mobile and tablet */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="bg-[#19271e] text-white p-2.5 rounded-lg shadow-lg hover:bg-[#2a3a2f] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? <HiX size={20} /> : <HiMenu size={20} />}
        </button>
      </div>

      {/* Horizontal Top Navigation for Mobile - Alternative to Sidebar */}
      <div className="lg:hidden fixed top-4 right-4 z-50">
        <div className="flex gap-1.5">
          <button
            onClick={() => handleNavClick("chat")}
            className={`p-2 rounded-lg transition-colors text-white ${
              conditionalComponent === "chat"
                ? "bg-[#CCE2D3] text-[#19271e]"
                : "bg-[#19271e] hover:bg-[#2a3a2f]"
            }`}
            title="Chat"
          >
            <HiChatBubbleBottomCenter className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleNavClick("contact")}
            className={`p-2 rounded-lg transition-colors text-white ${
              openDialog === "contact"
                ? "bg-[#CCE2D3] text-[#19271e]"
                : "bg-[#19271e] hover:bg-[#2a3a2f]"
            }`}
            title="Contacts"
          >
            <IoMdContact className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleNavClick("calling")}
            className={`p-2 rounded-lg transition-colors text-white ${
              openDialog === "calling"
                ? "bg-[#CCE2D3] text-[#19271e]"
                : "bg-[#19271e] hover:bg-[#2a3a2f]"
            }`}
            title="Calls"
          >
            <MdWifiCalling className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleNavClick("group")}
            className={`p-2 rounded-lg transition-colors text-white ${
              openDialog === "group"
                ? "bg-[#CCE2D3] text-[#19271e]"
                : "bg-[#19271e] hover:bg-[#2a3a2f]"
            }`}
            title="Groups"
          >
            <CiBookmark className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleNavClick("setting")}
            className={`p-2 rounded-lg transition-colors text-white ${
              openDialog === "setting"
                ? "bg-[#CCE2D3] text-[#19271e]"
                : "bg-[#19271e] hover:bg-[#2a3a2f]"
            }`}
            title="Settings"
          >
            <IoSettingsOutline className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Floating action button for quick access on mobile */}
      <div className="lg:hidden fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="bg-[#19271e] text-white p-4 rounded-full shadow-lg hover:bg-[#2a3a2f] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-label="Quick access menu"
        >
          <HiMenu size={24} />
        </button>
      </div>

      {/* Sidebar - Responsive with mobile overlay and adaptive sizing */}
      <div
        className={`fixed inset-0 z-40 lg:relative lg:z-auto transition-all duration-300 ease-in-out ${
          isMobileMenuOpen
            ? "translate-x-0 opacity-100"
            : "-translate-x-full opacity-0 lg:translate-x-0 lg:opacity-100"
        }`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        ref={sidebarRef}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Mobile overlay */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        ></div>

        {/* Sidebar content - Telegram-style compact design */}
        <div className="relative h-full bg-white shadow-lg lg:shadow-none transition-all duration-300 ease-in-out w-80 lg:w-72 xl:w-80">
          {/* Profile section - Telegram style */}
          <div className="bg-[#19271e] text-white p-3 lg:p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                <CgProfile className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold truncate">M-chat</h2>
                <p className="text-xs text-gray-300 truncate">Welcome back!</p>
              </div>
              <button
                onClick={() => handleNavClick("setting")}
                className="p-1.5 hover:bg-[#2a3a2f] rounded-lg transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label="Go to settings"
              >
                <CgProfile className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search Bar - Telegram style */}
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-colors"
              />
            </div>
          </div>

          {/* Navigation - Telegram style compact */}
          <nav className="flex-1 p-2 space-y-1">
            <button
              onClick={() => handleNavClick("chat")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                conditionalComponent === "chat"
                  ? "bg-[#CCE2D3] text-[#19271e] shadow-sm"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
              aria-current={
                conditionalComponent === "chat" ? "page" : undefined
              }
            >
              <HiChatBubbleBottomCenter className="w-5 h-5 flex-shrink-0" />
              <span className="truncate">Chat</span>
              {totalUnread > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full flex-shrink-0">
                  {totalUnread > 99 ? "99+" : totalUnread}
                </span>
              )}
            </button>

            <button
              onClick={() => handleNavClick("contact")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                openDialog === "contact"
                  ? "bg-[#CCE2D3] text-[#19271e] shadow-sm"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
              aria-current={openDialog === "contact" ? "page" : undefined}
            >
              <IoMdContact className="w-5 h-5 flex-shrink-0" />
              <span className="truncate">Contacts</span>
            </button>

            <button
              onClick={() => handleNavClick("calling")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                openDialog === "calling"
                  ? "bg-[#CCE2D3] text-[#19271e] shadow-sm"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
              aria-current={openDialog === "calling" ? "page" : undefined}
            >
              <MdWifiCalling className="w-5 h-5 flex-shrink-0" />
              <span className="truncate">Calls</span>
            </button>

            <button
              onClick={() => handleNavClick("group")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                openDialog === "group"
                  ? "bg-[#CCE2D3] text-[#19271e] shadow-sm"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
              aria-current={openDialog === "group" ? "page" : undefined}
            >
              <CiBookmark className="w-5 h-5 flex-shrink-0" />
              <span className="truncate">Groups</span>
            </button>

            <button
              onClick={() => handleNavClick("setting")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                openDialog === "setting"
                  ? "bg-[#CCE2D3] text-[#19271e] shadow-sm"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
              aria-current={openDialog === "setting" ? "page" : undefined}
            >
              <IoSettingsOutline className="w-5 h-5 flex-shrink-0" />
              <span className="truncate">Settings</span>
            </button>
          </nav>

          {/* Active users count - Compact */}
          <div className="p-3 border-t border-gray-200">
            <div className="text-center text-xs text-gray-600">
              <p className="truncate">Active Users: {activeUser.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content area - Only shows Chat content */}
      <div className="flex-1 overflow-hidden">
        {renderConditionalComponent()}
        {renderDialog()}
      </div>
    </div>
  );
};

export default Header;
