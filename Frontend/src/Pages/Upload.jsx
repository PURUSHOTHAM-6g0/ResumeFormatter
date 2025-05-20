import React from "react";
import Navbar from "@/components/navbar";
import { FileUpload } from "@/components/file-upload";

export default function UploadPage() {
  const user = JSON.parse(localStorage.getItem("user"));
  const username = user?.username || "";

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-bold">
            Welcome{username ? `, ${username}` : ""}!
          </h1>
          <p className="text-gray-500 mt-2">Upload a file to get started</p>
        </div>
        <div className="flex justify-center">
          <FileUpload />
        </div>
      </main>
    </div>
  );
}
