import { FC, useState } from "react";
import { CgProfile } from "react-icons/cg";
import { IoColorPaletteOutline } from "react-icons/io5";
import {
  MdOutlineKeyboardArrowDown,
  MdOutlineKeyboardArrowUp,
} from "react-icons/md";
import { SiGnuprivacyguard } from "react-icons/si";
import { FiEdit3, FiLogOut } from "react-icons/fi";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../store";
import { logout } from "../slice/authSlice";

interface SettingHeaderProps {}

const SettingHeader: FC<SettingHeaderProps> = () => {
  const [expandedSections, setExpandedSections] = useState<{
    profile: boolean;
    themes: boolean;
    privacy: boolean;
  }>({
    profile: false,
    themes: false,
    privacy: false,
  });

  const dispatch = useDispatch();
  const authUser = useSelector((state: RootState) => state.auth.user);
  const isAuthenticated = useSelector(
    (state: RootState) => state.auth.isAuthenticated
  );

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleLogout = () => {
    dispatch(logout());
  };

  // If not authenticated, show loading or redirect
  if (!isAuthenticated || !authUser) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  // Get user data with fallbacks
  const userName = authUser.name || "User Name";
  const userEmail = authUser.email || "user@email.com";
  const userId = authUser._id || "Not available";
  const userCreatedAt = authUser.createdAt || null;

  return (
    <div className="h-screen bg-gray-50 overflow-hidden" id="setting">
      <div className="h-full max-w-2xl mx-auto bg-white shadow-lg flex flex-col">
        {/* Header with Profile Picture - Fixed */}
        <div className="relative flex-shrink-0">
          <div
            className="w-full h-24 sm:h-28 md:h-32 bg-cover bg-center"
            style={{
              backgroundImage: `url("./profile.jpg")`,
            }}
          >
            <div className="absolute inset-0 bg-black bg-opacity-30"></div>
          </div>

          {/* Profile Picture */}
          <div className="flex justify-center absolute w-full bottom-[-32px] sm:bottom-[-36px] md:bottom-[-40px]">
            <div className="w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 rounded-full border-4 border-white bg-gray-200 flex items-center justify-center text-white font-bold text-xl sm:text-2xl md:text-3xl flex-shrink-0">
              {userName ? (
                <span>{userName.charAt(0).toUpperCase()}</span>
              ) : (
                <CgProfile className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 text-gray-400" />
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto pt-12 sm:pt-14 md:pt-16">
          {/* User Info */}
          <div className="flex justify-center border-b pb-6 sm:pb-8 md:pb-10 px-4">
            <div className="text-center">
              <h1 className="text-xl sm:text-2xl md:text-2xl font-semibold text-gray-800">
                {userName}
              </h1>
              <p className="text-gray-600 mb-2 text-sm sm:text-base">
                {userEmail}
              </p>
              <div className="flex justify-center items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-xs sm:text-sm text-green-600 font-medium">
                  Active
                </span>
              </div>
            </div>
          </div>

          {/* Profile Information Section */}
          <div className="border-b">
            <div
              className="flex justify-between px-4 sm:px-6 items-center py-4 sm:py-6 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleSection("profile")}
            >
              <div className="flex gap-3 items-center">
                <CgProfile className="text-blue-600 text-lg sm:text-xl" />
                <span className="font-medium text-sm sm:text-base">
                  Profile Information
                </span>
              </div>
              <div className="text-gray-400">
                {expandedSections.profile ? (
                  <MdOutlineKeyboardArrowUp />
                ) : (
                  <MdOutlineKeyboardArrowDown />
                )}
              </div>
            </div>

            {expandedSections.profile && (
              <div className="px-4 sm:px-6 pb-4 sm:pb-6 bg-gray-50">
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-white rounded-lg gap-2 sm:gap-0">
                    <span className="text-gray-600 text-sm sm:text-base">
                      Name
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm sm:text-base">
                        {userName}
                      </span>
                      <FiEdit3 className="text-blue-500 cursor-pointer hover:text-blue-600 w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-white rounded-lg gap-2 sm:gap-0">
                    <span className="text-gray-600 text-sm sm:text-base">
                      Email
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm sm:text-base">
                        {userEmail}
                      </span>
                      <FiEdit3 className="text-blue-500 cursor-pointer hover:text-blue-600 w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-white rounded-lg gap-2 sm:gap-0">
                    <span className="text-gray-600 text-sm sm:text-base">
                      User ID
                    </span>
                    <span className="font-mono text-xs sm:text-sm text-gray-500 break-all">
                      {userId}
                    </span>
                  </div>
                  {userCreatedAt && (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-white rounded-lg gap-2 sm:gap-0">
                      <span className="text-gray-600 text-sm sm:text-base">
                        Member Since
                      </span>
                      <span className="font-medium text-sm sm:text-sm text-gray-500">
                        {new Date(userCreatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Themes Section */}
          <div className="border-b">
            <div
              className="flex justify-between px-4 sm:px-6 items-center py-4 sm:py-6 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleSection("themes")}
            >
              <div className="flex gap-3 items-center">
                <IoColorPaletteOutline className="text-purple-600 text-lg sm:text-xl" />
                <span className="font-medium text-sm sm:text-base">Themes</span>
              </div>
              <div className="text-gray-400">
                {expandedSections.themes ? (
                  <MdOutlineKeyboardArrowUp />
                ) : (
                  <MdOutlineKeyboardArrowDown />
                )}
              </div>
            </div>

            {expandedSections.themes && (
              <div className="px-4 sm:px-6 pb-4 sm:pb-6 bg-gray-50">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="p-3 sm:p-4 bg-white rounded-lg border-2 border-blue-500 cursor-pointer hover:shadow-md transition-shadow">
                    <div className="w-full h-16 sm:h-20 bg-blue-500 rounded mb-2"></div>
                    <span className="text-xs sm:text-sm font-medium text-center block">
                      Blue Theme
                    </span>
                  </div>
                  <div className="p-3 sm:p-4 bg-white rounded-lg border-2 border-transparent cursor-pointer hover:shadow-md transition-shadow">
                    <div className="w-full h-16 sm:h-20 bg-green-500 rounded mb-2"></div>
                    <span className="text-xs sm:text-sm font-medium text-center block">
                      Green Theme
                    </span>
                  </div>
                  <div className="p-3 sm:p-4 bg-white rounded-lg border-2 border-transparent cursor-pointer hover:shadow-md transition-shadow">
                    <div className="w-full h-16 sm:h-20 bg-purple-500 rounded mb-2"></div>
                    <span className="text-xs sm:text-sm font-medium text-center block">
                      Purple Theme
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Privacy Section */}
          <div className="border-b">
            <div
              className="flex justify-between px-4 sm:px-6 items-center py-4 sm:py-6 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleSection("privacy")}
            >
              <div className="flex gap-3 items-center">
                <SiGnuprivacyguard className="text-red-600 text-lg sm:text-xl" />
                <span className="font-medium text-sm sm:text-base">
                  Privacy & Security
                </span>
              </div>
              <div className="text-gray-400">
                {expandedSections.privacy ? (
                  <MdOutlineKeyboardArrowUp />
                ) : (
                  <MdOutlineKeyboardArrowDown />
                )}
              </div>
            </div>

            {expandedSections.privacy && (
              <div className="px-4 sm:px-6 pb-4 sm:pb-6 bg-gray-50">
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-white rounded-lg gap-2 sm:gap-0">
                    <span className="text-gray-600 text-sm sm:text-base">
                      Online Status
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        defaultChecked
                      />
                      <div className="w-9 h-5 sm:w-11 sm:h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 sm:after:h-5 sm:after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-white rounded-lg gap-2 sm:gap-0">
                    <span className="text-gray-600 text-sm sm:text-base">
                      Read Receipts
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        defaultChecked
                      />
                      <div className="w-9 h-5 sm:w-11 sm:h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 sm:after:h-5 sm:after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-white rounded-lg gap-2 sm:gap-0">
                    <span className="text-gray-600 text-sm sm:text-base">
                      Last Seen
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-9 h-5 sm:w-11 sm:h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 sm:after:h-5 sm:after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Logout Button */}
          <div className="p-4 sm:p-6">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 bg-red-500 text-white py-2 sm:py-3 px-4 sm:px-6 rounded-lg hover:bg-red-600 transition-colors font-medium text-sm sm:text-base"
            >
              <FiLogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingHeader;
