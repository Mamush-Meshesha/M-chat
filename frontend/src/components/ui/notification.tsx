import { FC, useEffect, useState } from "react";
import { IoClose } from "react-icons/io5";
import { BsChatDots } from "react-icons/bs";

interface NotificationProps {
  message: string;
  senderName: string;
  onClose: () => void;
  duration?: number;
}

const Notification: FC<NotificationProps> = ({
  message,
  senderName,
  onClose,
  duration = 5000,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for fade out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <div
      className={`fixed top-4 right-4 z-50 transition-all duration-300 ${
        isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      }`}
    >
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-sm w-80">
        <div className="flex items-start gap-3">
          <div className="bg-[#4EAC6D] p-2 rounded-full">
            <BsChatDots className="text-white text-lg" />
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-800 text-sm mb-1">
              New message from {senderName}
            </h4>
            <p className="text-gray-600 text-sm truncate">{message}</p>
          </div>

          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
          >
            <IoClose size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Notification;
