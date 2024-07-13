import { BrowserRouter, Route, Routes } from "react-router-dom";
import Home from "./pages/home";
import Register from "./pages/register";
import Login from "./pages/login";
import LogOut from "./pages/logout";
import ResetComp from "./pages/reset";

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
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
