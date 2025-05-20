import React from "react";
import { useNavigate } from "react-router-dom";
import { getToken, removeToken } from "../utils/token";
import { File } from "lucide-react";

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
        {/* Added left padding to give breathing room */}
        <h1
          className="text-xl font-semibold cursor-pointer pl-2 flex items-center gap-2"
          onClick={() => navigate("/")}
        >
          <File className="w-6 h-6" />
          FileManager
        </h1>

        <nav className="flex items-center gap-4 pr-2">
          {isLoggedIn ? (
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-md text-sm transition"
            >
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
