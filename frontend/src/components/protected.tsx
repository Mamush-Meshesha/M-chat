import { FC } from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../store/index";
import Home from "../pages/home";

const ProtectedRoute: FC = () => {
  const { authenticated } = useSelector((state: RootState) => state.auth);

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Home />;
};

export default ProtectedRoute;
