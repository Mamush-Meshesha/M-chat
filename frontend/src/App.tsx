import { BrowserRouter, Route, Routes } from "react-router-dom";
import Register from "./pages/register";
import Login from "./pages/login";
import LogOut from "./pages/logout";
import ResetComp from "./pages/reset";
import ProtectedRoute from "./components/protected";

function App() {
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
