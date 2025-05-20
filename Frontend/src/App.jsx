import React from "react";
import { Routes, Route } from "react-router-dom";
import Login from "./auth/Login";
import Register from "./auth/Register";
import ProtectedRoute from "./components/ProtectedRoute";
import Upload from "./Pages/Upload";
import LandingPage from "./Pages/LandingPage";
import FilePreview from "./Pages/FilePreview";
import './globals.css'; 

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/upload"
        element={
          <ProtectedRoute>
            <Upload />
          </ProtectedRoute>
        }
      />

      <Route
        path="/preview"      
        element={
          <ProtectedRoute>
            <FilePreview />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
