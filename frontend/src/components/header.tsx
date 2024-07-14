import { FC, useState } from "react";
import { CgProfile } from "react-icons/cg";
import { CiBookmark } from "react-icons/ci";
import { HiChatBubbleBottomCenter } from "react-icons/hi2";
import { IoMdContact } from "react-icons/io";
import { IoSettingsOutline } from "react-icons/io5";
import { MdWifiCalling } from "react-icons/md";
import ChatHeader from "./chatheader";
import { NavLink } from "react-bootstrap";
import ContactHeader from "./contact";
import CallingHeader from "./calling";
import SettingHeader from "./setting";
import ChatGroup from "./group";
import Modal from "./ui/promodal";

interface HeaderProps {}

const Header: FC<HeaderProps> = () => {
  const [conditionalComponent, setConditionalComponent] =
    useState<string>("chat");

  const renderConditionalComponent = () => {
    switch (conditionalComponent) {
      case "chat":
        return <ChatHeader />;
      case "contact":
        return <ContactHeader />;
      case "calling":
        return <CallingHeader />;
      case "group":
        return <ChatGroup />;
      case "setting":
        return <SettingHeader />;
      default:
        return <ChatHeader />;
    }
  };

  const [proShow, setProShow] = useState<boolean>(false);
  const handleShowPro = () => {
    setProShow(!proShow);
  };
  return (
    <div>
      <div className="min-h-screen w-[20%]  border-l-0 border  fixed flex top-0 left-0 overflow-hidden ">
        <div className="w-[20%] bg-[#19271e] h-[100vh] relative ">
          <div className="flex flex-col justify-between h-full pb-5">
            <div className="flex flex-col gap-9 items-center pt-10">
              <NavLink onClick={() => setConditionalComponent("chat")}>
                <HiChatBubbleBottomCenter className="text-3xl text-[#878A92]" />
              </NavLink>
              <NavLink onClick={() => setConditionalComponent("contact")}>
                <IoMdContact className="text-3xl text-[#878A92]  " />
              </NavLink>
              <NavLink onClick={() => setConditionalComponent("calling")}>
                <MdWifiCalling className="text-3xl text-[#878A92]  " />
              </NavLink>
              <NavLink onClick={() => setConditionalComponent("group")}>
                <CiBookmark className="text-3xl text-[#878A92]  " />
              </NavLink>
              <NavLink onClick={() => setConditionalComponent("setting")}>
                <IoSettingsOutline className="text-3xl text-[#878A92]  " />
              </NavLink>
            </div>
            <div className="flex justify-center">
              <div>
                <button onClick={handleShowPro}>
                  <CgProfile className="text-3xl text-[#878A92]  " />
                </button>
                <div>{proShow ? <Modal onClose={false} /> : null}</div>
              </div>
            </div>
          </div>
        </div>
        {/* the routes goes here with #navlink  */}
        <div className="w-[80%] ">{renderConditionalComponent()}</div>
      </div>
    </div>
  );
};

export default Header;
