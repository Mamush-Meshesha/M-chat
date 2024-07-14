import { FC } from "react";
import Dashboardheader from "../components/ui/dashboardheader";
import Dashboardbottom from "../components/ui/dashboardbottom";
import Header from "../components/header";
import { FaCheck } from "react-icons/fa6";
import { useSelector } from "react-redux";
import { RootState } from "../store";

interface HomeProps {}

const Home: FC<HomeProps> = () => {

  const currentUserChat = useSelector((state:RootState) => state.user.currentUser)
  return (
    <div>
      <Header />
      <div
        className="!w-[80%] ml-[20%] h-screen mb-[60px] md:mb-0 "
        style={{ backgroundImage: `url("./back.png")` }}
      >
        <div>
          <Dashboardheader currentUserChat={currentUserChat} />
        </div>
        {currentUserChat ? (
          <div className="h-[calc(100%-85px)]   overflow-y-scroll">
            <div>
              <div className="pt-[100px] px-5 ">
                <div className="space-y-8 ">
                  {/* me */}
                  <div className="flex justify-end">
                    <div className="flex flex-col gap-2">
                      <div className="bg-[#CCE2D3] mr-5 rounded-md px-3 py-2 max-w-xs break-words">
                        <h1>
                          Hello
                          hhhdfffffffffffffffffffffffsyeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee
                        </h1>
                      </div>
                      <div className="flex items-center gap-3 justify-end w-full">
                        <FaCheck className="text-xs text-green-500" />
                        <span className="text-xs">05:12am</span>
                        <h1>You</h1>
                        <div className="w-7 bg-black h-7  rounded-full border">
                          <img
                            src="/profile.jpg"
                            alt="alt"
                            className="w-full h-full rounded-full object-cover"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Friend */}
                  <div className="flex justify-start">
                    <div>
                      <div className="bg-[#FFFFFF] rounded-md px-3 ml-5 py-2 max-w-xs break-words">
                        <h1>
                          Hello there
                          gggggggggggggggggggggggffffffffffffffffffffffggggggggggggggggggggggggggfffffffffffffffffffffffffg
                        </h1>
                      </div>
                      <div className="flex pt-3 items-center gap-3 justify-start w-full">
                        <div className="w-7 bg-black h-7  rounded-full border">
                          <img
                            src="/profile.jpg"
                            alt="alt"
                            className="w-full h-full rounded-full object-cover"
                          />
                        </div>
                        <h1>{currentUserChat.name}</h1>
                        <span className="text-xs">05:12am</span>
                      </div>
                    </div>
                  </div>
                  {/* end */}
                  {/* me */}
                  <div className="flex justify-end">
                    <div className="bg-[#CCE2D3] rounded-md px-3 py-2 max-w-xs break-words">
                      <h1>
                        Hello
                        hhhdfffffffffffffffffffffffsyeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee
                      </h1>
                    </div>
                  </div>
                  {/* Friend */}
                  <div className="flex justify-start">
                    <div className="bg-[#FFFFFF] rounded-md px-3 py-2 max-w-xs break-words">
                      <h1>
                        Hello there
                        gggggggggggggggggggggggffffffffffffffffffffffggggggggggggggggggggggggggfffffffffffffffffffffffffg
                      </h1>
                    </div>
                  </div>
                  {/* end */}
                  {/* me */}
                  <div className="flex justify-end">
                    <div className="bg-[#CCE2D3] rounded-md px-3 py-2 max-w-xs break-words">
                      <h1>
                        Hello
                        hhhdfffffffffffffffffffffffsyeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee
                      </h1>
                    </div>
                  </div>
                  {/* Friend */}
                  <div className="flex justify-start">
                    <div className="bg-[#FFFFFF] rounded-md px-3 py-2 max-w-xs break-words">
                      <h1>
                        Hello there
                        gggggggggggggggggggggggffffffffffffffffffffffggggggggggggggggggggggggggfffffffffffffffffffffffffg
                      </h1>
                    </div>
                  </div>
                  {/* end */}
                  {/* me */}
                  <div className="flex justify-end">
                    <div className="bg-[#CCE2D3] rounded-md px-3 py-2 max-w-xs break-words">
                      <h1>
                        Hello
                        hhhdfffffffffffffffffffffffsyeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee
                      </h1>
                    </div>
                  </div>
                  {/* Friend */}
                  <div className="flex justify-start">
                    <div className="bg-[#FFFFFF] rounded-md px-3 py-2 max-w-xs break-words">
                      <h1>
                        Hello there
                        gggggggggggggggggggggggffffffffffffffffffffffggggggggggggggggggggggggggfffffffffffffffffffffffffg
                      </h1>
                    </div>
                  </div>
                  {/* end */}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-[calc(100%-85px)]   overflow-y-scroll">
            <div className="flex justify-center items-center h-full">
              <div>
                <img
                  src="/chat.gif"
                  alt="chat"
                  className="w-[20rem] object-contain "
                  />
                  <h1 className="text-center text-3xl bg-gradient-to-r from-[#7fa346] via-[#24685f] to-[#7026d1] text-transparent bg-clip-text inline-block ">Come on guys let's chat......</h1>
              </div>
            </div>
          </div>
        )}
        <div>
          <Dashboardbottom />
        </div>
      </div>
    </div>
  );
};

export default Home;
