import { FC, useState } from "react";
import { CgLogOut, CgProfile } from "react-icons/cg";
import { IoSettingsOutline } from "react-icons/io5";
import Addmodal from "./addmodal";
import { logoutUserRequest } from "../../slice/authSlice";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";

interface ModalProps {
  onClose: boolean;
}

const Modal: FC<ModalProps> = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [open, setIsOpen] = useState(false);

  const handleShow = () => {
    setIsOpen(!open);
  };

  // const dispatch = useDispatch();
  // const navigate = useNavigate();
  // const { search } = useLocation();
  // const sp = new URLSearchParams(search);
  // const redirect = sp.get("redirect") || "/login";

  const logoutHandler = () => {
    try {
      dispatch(logoutUserRequest());
      navigate("/logout");
    } catch (error) {
      console.log(error);
    }
  };
  return (
    <div className="ml-72">
      <div className="w-[200px] h-auto  border rounded-md p-6 ">
        <div className="flex flex-col gap-5">
          <div className="flex justify-between">
            <button>Profile</button>
            <button onClick={handleShow}>
              <CgProfile />
            </button>
          </div>
          {open ? <Addmodal onClose={handleShow} /> : null}
          <div className="flex justify-between">
            <button>Settings</button>
            <button>
              <IoSettingsOutline />
            </button>
          </div>
          <div className="flex justify-between">
            <button onClick={logoutHandler}>Logout</button>
            <button onClick={logoutHandler}>
              <CgLogOut />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
