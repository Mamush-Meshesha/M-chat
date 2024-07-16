import { FC } from "react";
import { BsThreeDotsVertical } from "react-icons/bs";
import { MdVideoCall, MdWifiCalling3 } from "react-icons/md";
import { useSelector } from "react-redux";
import { RootState } from "../../store";

interface DashboardheaderProps {}
const Dashboardheader: FC<DashboardheaderProps> = ({ currentUserChat }) => {
    const activeUser = useSelector((state: RootState) => state.user.activeUser);

  return (
    <>
      {currentUserChat ? (
        <div className="bg-[#E5DDD5] h-20 w-[80%] ml-[20%] border-b  absolute top-0 left-0 right-0 ">
          <div className="flex justify-between px-10 items-center h-full">
            {/* left side */}
            <div className="flex  gap-3 ">
              <div className="h-10 w-10 relative border rounded-full bg-black  ">
                {activeUser ? (
                  <span className="w-3 h-3 rounded-full bg-green-600 absolute right-0  bottom-0 "></span>
                ) : null}
              </div>
              <div>
                <div className="flex flex-col text-[#66615e] ">
                  {/* name */}
                  <h1>{currentUserChat.name}</h1>
                  {/* status */}
                  {activeUser ? (
                    <span className="text-xs">active</span>
                  ) : (
                    <div>
                      <span className="text-xs">last seen recently</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* right side */}
            <div>
              <div className="flex gap-8 text-2xl text-[#66615e] ">
                <MdWifiCalling3 />
                <MdVideoCall />
                <BsThreeDotsVertical />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default Dashboardheader;
