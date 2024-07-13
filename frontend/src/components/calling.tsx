import { FC } from "react";
import { MdOutlineCallReceived, MdVideoCall } from "react-icons/md";

interface ChatHeaderProps {}

const CallingHeader: FC<ChatHeaderProps> = () => {
  return (
    <div className="p-5" id="calling">
      <div>
        <div>
          <h1 className="text-2xl ">calls</h1>
          <div className=" py-8">
            <div className="border-b py-5">
              <div className="flex justify-between ">
                {/* profile and name date */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-black  "></div>
                  <div>
                    <h1 className="text-nowrap">Mamush</h1>
                    <div className="flex gap-1">
                      <MdOutlineCallReceived className="text-xs" />
                      <span className="text-nowrap text-xs">
                        5 jun, 2024, 06:23..
                      </span>
                    </div>
                  </div>
                </div>
                {/* call duration and video call icon */}
                <div className="flex gap-5 items-center">
                  <h1>5:34</h1>
                  <MdVideoCall className="text-2xl" />
                </div>
              </div>
            </div>
            {/* end of  one call */}
            <div className="border-b py-5">
              <div className="flex justify-between ">
                {/* profile and name date */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-black  "></div>
                  <div>
                    <h1 className="text-nowrap">Mamush</h1>
                    <div className="flex gap-1">
                      <MdOutlineCallReceived className="text-xs" />
                      <span className="text-nowrap text-xs">
                        5 jun, 2024, 06:23..
                      </span>
                    </div>
                  </div>
                </div>
                {/* call duration and video call icon */}
                <div className="flex gap-5 items-center">
                  <h1>5:34</h1>
                  <MdVideoCall className="text-2xl" />
                </div>
              </div>
            </div>
            {/* end of  one call */}
            <div className="border-b py-5">
              <div className="flex justify-between ">
                {/* profile and name date */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-black  "></div>
                  <div>
                    <h1 className="text-nowrap">Mamush</h1>
                    <div className="flex gap-1">
                      <MdOutlineCallReceived className="text-xs" />
                      <span className="text-nowrap text-xs">
                        5 jun, 2024, 06:23..
                      </span>
                    </div>
                  </div>
                </div>
                {/* call duration and video call icon */}
                <div className="flex gap-5 items-center">
                  <h1>5:34</h1>
                  <MdVideoCall className="text-2xl" />
                </div>
              </div>
            </div>
            {/* end of  one call */}
            <div className="border-b py-5">
              <div className="flex justify-between ">
                {/* profile and name date */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-black  "></div>
                  <div>
                    <h1 className="text-nowrap">Mamush</h1>
                    <div className="flex gap-1">
                      <MdOutlineCallReceived className="text-xs" />
                      <span className="text-nowrap text-xs">
                        5 jun, 2024, 06:23..
                      </span>
                    </div>
                  </div>
                </div>
                {/* call duration and video call icon */}
                <div className="flex gap-5 items-center">
                  <h1>5:34</h1>
                  <MdVideoCall className="text-2xl" />
                </div>
              </div>
            </div>
            {/* end of  one call */}
            <div className="border-b py-5">
              <div className="flex justify-between ">
                {/* profile and name date */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-black  "></div>
                  <div>
                    <h1 className="text-nowrap">Mamush</h1>
                    <div className="flex gap-1">
                      <MdOutlineCallReceived className="text-xs" />
                      <span className="text-nowrap text-xs">
                        5 jun, 2024, 06:23..
                      </span>
                    </div>
                  </div>
                </div>
                {/* call duration and video call icon */}
                <div className="flex gap-5 items-center">
                  <h1>5:34</h1>
                  <MdVideoCall className="text-2xl" />
                </div>
              </div>
            </div>
            {/* end of  one call */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallingHeader;
