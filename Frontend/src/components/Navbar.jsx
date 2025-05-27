import React from "react";
import { useNavigate } from "react-router-dom";
import { getToken, removeToken } from "../utils/token";
import { File, LogOut } from "lucide-react"; // ✅ Import LogOut icon

export default function Navbar() {
  const navigate = useNavigate();
  const isLoggedIn = !!getToken();

  const handleLogout = () => {
    removeToken();
    navigate("/login");
  };

  return (
    <header className="border-b bg-black text-white shadow-sm">
      <div className="container mx-auto max-w-7xl flex h-16 items-center justify-between px-6">
        <h1
          className="text-xl font-semibold cursor-pointer pl-2 flex items-center gap-2"
          onClick={() => navigate("/")}
        >
          <File className="w-6 h-6" />
          Resume Extractor
        </h1>

        <nav className="flex items-center gap-4 pr-2">
          {isLoggedIn ? (
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-md text-sm transition flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          ) : (
            <button
              onClick={() => navigate("/login")}
              className="text-sm text-gray-300 hover:text-white transition"
            >
              Login
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
