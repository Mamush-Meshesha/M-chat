import { useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { useDispatch } from "react-redux";
import { restoreAuth } from "./slice/authSlice";
import Register from "./pages/register";
import Login from "./pages/login";
import LogOut from "./pages/logout";
import ResetComp from "./pages/reset";
import ProtectedRoute from "./components/protected";

function App() {
  const dispatch = useDispatch();

  // Restore auth state from localStorage on app startup
  useEffect(() => {
    console.log("🚀 App starting, restoring auth state...");
    dispatch(restoreAuth());
  }, [dispatch]);

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ProtectedRoute />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/logout" element={<LogOut />} />
          <Route path="/reset" element={<ResetComp />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
