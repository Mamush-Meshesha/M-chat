import { FC, FormEvent, useEffect, useState } from "react";
import { FaRegMessage } from "react-icons/fa6";
import { useDispatch } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { loginSuccess } from "../slice/authSlice";

interface RegisterProps {}

const RegisterComp: FC<RegisterProps> = () => {
  const [state, setState] = useState({
    email: "",
    password: "",
    name: "",
    confirmPassword: "",
    image: "",
  });

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { search } = useLocation();
  const sp = new URLSearchParams(search);
  const redirect = sp.get("redirect") || "/";

  const registerSubmit = (e: { target: { name: string; value: string } }) => {
    setState({
      ...state,
      [e.target.name]: e.target.value,
    });
  };

  useEffect(() => {
    // Check if user is already authenticated
    const storedUser = localStorage.getItem("authUser");
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        if (user && user._id && user.name && user.email && user.token) {
          dispatch(loginSuccess(user));
          navigate(redirect);
        }
      } catch (error) {
        console.error("Failed to parse stored user:", error);
        localStorage.removeItem("authUser");
      }
    }
  }, [dispatch, navigate, redirect]);

  const register = (e: FormEvent<HTMLFormElement>) => {
    const { name, email, password, confirmPassword } = state;
    e.preventDefault();

    if (confirmPassword !== password) {
      console.log("password didnt match");
      return;
    }

    // For now, redirect to login since we don't have a register saga
    // In a real app, you'd implement registration API call here
    console.log("Registration form submitted:", { name, email });
    alert(
      "Registration not implemented yet. Please use login with existing credentials."
    );
  };
  return (
    <div className="bg-[#4EAC6D] min-h-screen p-10 overflow-hidden ">
      <div className="md:flex md:justify-between gap-20">
        <div className="leading-10">
          <div className="flex gap-3">
            <FaRegMessage className="text-white text-3xl " />
            <h1 className="text-2xl font-medium text-white">Let's Chat!</h1>
          </div>
          <h1 className="capitalize text-[#9ED5B2] ">
            come and enjoy with friends
          </h1>
          <div className="hidden md:flex absolute bottom-0 pb-[6rem] pl-[20rem] ">
            <img
              src="./Animation.gif"
              alt="gif"
              className="w-[300px] h-[200px] object-center "
            />
          </div>
        </div>
        <div className="bg-[#fff] md:w-[70%]  md:h-[91vh] rounded-2xl py-10 md:py-0 ">
          <div className="flex items-center justify-center md:pt-[10rem]   ">
            <div>
              <h1 className="text-3xl capitalize text-center ">
                Create account
              </h1>
              <p className="text-[#b7beba] font-raleway text-center  text-xl ">
                create your account and make new friends
              </p>
            </div>
          </div>
          <div className="flex items-center justify-center  pt-10">
            <form onSubmit={register} className="flex flex-col md:w-[40%] ">
              <div className="pt-3 flex flex-col">
                <label htmlFor="username">Email</label>
                <input
                  onChange={registerSubmit}
                  value={state.email}
                  name="email"
                  id="email"
                  type="email"
                  placeholder="eg, user@gmail.com"
                  className="outline-none border h-11 rounded-md px-3 py-2 "
                />
              </div>
              <div className="pt-3 flex flex-col">
                <label htmlFor="username">name</label>
                <input
                  onChange={registerSubmit}
                  value={state.name}
                  name="name"
                  id="name"
                  type="text"
                  placeholder="Name"
                  className="outline-none border h-11 rounded-md px-3 py-2 "
                />
              </div>

              <div className="pt-3 flex flex-col">
                <label htmlFor="password">Password</label>
                <input
                  onChange={registerSubmit}
                  value={state.password}
                  name="password"
                  id="password"
                  type="password"
                  placeholder="********"
                  className="outline-none border h-11 rounded-md px-3 py-2 "
                />
                <div className="pt-3 flex flex-col">
                  <label htmlFor="username">confirm password</label>
                  <input
                    onChange={registerSubmit}
                    value={state.confirmPassword}
                    name="confirmPassword"
                    id="confirmPassword"
                    type="password"
                    placeholder="Name"
                    className="outline-none border h-11 rounded-md px-3 py-2 "
                  />
                </div>
                <div className="flex justify-end">
                  <h1 className="text-[#b7beba]">Forget password?</h1>
                </div>
              </div>
              <div className="pt-10">
                <button className="bg-[#4EAC6D] text-center w-full h-11 rounded-md ">
                  Register
                </button>
              </div>
              <div className="flex gap-4 pt-10 justify-center">
                <h1>Already have an account?</h1>{" "}
                <Link to="/login" className="text-[#4EAC6D]">
                  {" "}
                  Login here
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterComp;
