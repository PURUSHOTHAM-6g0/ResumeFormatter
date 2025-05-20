import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, File } from "lucide-react";
import axios from "../api/axios";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function FileUpload() {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave" || e.type === "drop") {
      setDragActive(false);
    }
  };

  const validateFile = (file) => {
    const validTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!validTypes.includes(file.type)) {
      setError("Please upload only PDF, DOC, or DOCX files.");
      return false;
    }
    setError(null);
    return true;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (validateFile(droppedFile)) {
        setFile(droppedFile);
      }
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (validateFile(selectedFile)) {
        setFile(selectedFile);
      }
    }
  };

  const handleClick = () => {
    if (uploading) return;
    inputRef.current?.click();
  };

  const simulateProgress = () => {
    let current = 0;
    const interval = setInterval(() => {
      current += 10;
      if (current <= 90) setUploadProgress(current);
      else clearInterval(interval);
    }, 100);
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file first.");
      return;
    }

    setUploading(true);
    setError(null);
    setUploadProgress(0);
    simulateProgress();

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await axios.post("/resume/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(percentCompleted);
          }
        },
      });

      setUploadProgress(100);
      navigate("/preview", { state: { jsonData: response.data } });
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail || err.message || "Upload failed. Try again."
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Upload File</CardTitle>
        <CardDescription>
          Upload a document to preview and download
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div
          className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center cursor-pointer select-none
            ${
              dragActive
                ? "border-primary bg-primary/5"
                : "border-gray-300 bg-white"
            }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx"
            onChange={handleChange}
            disabled={uploading}
          />
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="rounded-full bg-primary/10 p-3">
              <File className="h-6 w-6 text-primary" />
            </div>
            <div className="text-sm font-medium">
              {file ? (
                <span>{file.name}</span>
              ) : (
                <>
                  Drag & drop your file here or{" "}
                  <span className="text-primary underline">browse</span>
                </>
              )}
            </div>
            <div className="text-xs text-gray-500">
              Supports PDF, DOC, and DOCX files
            </div>
          </div>
        </div>

        {uploading && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Uploading...</span>
              <span className="text-gray-600">{uploadProgress}%</span>
            </div>
            <Progress
              value={uploadProgress}
              className="h-2 bg-gray-200 [&>div]:bg-gray-400"
            />
            <div className="flex justify-center pt-2">
              <div className="animate-spin h-5 w-5 border-2 border-t-transparent border-black rounded-full" />
            </div>
          </div>
        )}

        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      </CardContent>

      <CardFooter>
        <Button
          className="w-full bg-black text-white hover:bg-black/90"
          onClick={handleUpload}
          disabled={uploading || !file}
        >
          <Upload className="mr-2 h-4 w-4" />
          {uploading ? "Uploading..." : "Upload File"}
        </Button>
      </CardFooter>
    </Card>
  );
}
