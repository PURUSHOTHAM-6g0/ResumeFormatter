"use client"

import { useState, useRef, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { Upload, File } from "lucide-react"
import axios from "../api/axios"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

export function FileUpload() {
  const [file, setFile] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [taskId, setTaskId] = useState(null)
  const [currentStage, setCurrentStage] = useState("")
  const [pollCount, setPollCount] = useState(0)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave" || e.type === "drop") {
      setDragActive(false)
    }
  }

  const validateFile = (file) => {
    const validTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]
    if (!validTypes.includes(file.type)) {
      setError("Please upload only PDF, DOC, or DOCX files.")
      return false
    }
    setError(null)
    return true
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (validateFile(droppedFile)) {
        setFile(droppedFile)
      }
    }
  }

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      if (validateFile(selectedFile)) {
        setFile(selectedFile)
      }
    }
  }

  const handleClick = () => {
    if (uploading) return
    inputRef.current?.click()
  }

  const getStageMessage = (stage) => {
    const stageMessages = {
      upload: "File uploaded successfully",
      processing: "Starting processing...",
      converting_docx_to_pdf: "Converting pages to images...",
      conversion_to_image_all_pages: "Completed Converting pages to images...",
      parsing_all_pages_with_vision: "Analyzing document with AI...",
      extraction: "Extracting text from document...",
      parsing: "Processing resume data...",
      completion: "Finalizing results...",
      completed: "Processing completed!",
      failed: "Processing failed",
    }
    return stageMessages[stage] || "Processing..."
  }

  const simulateProgress = (currentProgress, targetProgress, duration = 2000) => {
    const steps = 20
    const stepSize = (targetProgress - currentProgress) / steps
    const stepDuration = duration / steps

    let step = 0
    const interval = setInterval(() => {
      step++
      const newProgress = Math.min(currentProgress + stepSize * step, targetProgress)
      setUploadProgress(Math.round(newProgress))

      if (step >= steps || newProgress >= targetProgress) {
        clearInterval(interval)
      }
    }, stepDuration)

    return interval
  }

  const pollProgress = useCallback(
    async (taskId) => {
      try {
        const response = await axios.get(`/resume/progress/${taskId}`)
        const progressData = response.data

        console.log("Progress data:", progressData) // Debug log

        // Get backend progress directly
        let targetProgress = progressData.progress || 0

        // If backend doesn't provide progress, simulate based on stage
        if (!progressData.progress || progressData.progress === 0) {
          const stageProgress = {
            upload: 10,
            processing: 15,
            converting_docx_to_pdf: 25,
            conversion_to_image_all_pages: 40,
            parsing_all_pages_with_vision: 70,
            extraction: 50,
            parsing: 80,
            completion: 95,
            completed: 100,
            failed: 0,
          }

          targetProgress = stageProgress[progressData.stage] || 10
        }

        // Update progress immediately
        setUploadProgress(targetProgress)
        setCurrentStage(progressData.stage || "processing")

        if (progressData.status === "completed" && progressData.data) {
          // Processing completed successfully
          setUploading(false)
          setUploadProgress(100)
          setCurrentStage("completed")

          // Navigate to preview with the processed data
          setTimeout(() => {
            navigate("/preview", {
              state: {
                jsonData: progressData.data,
                taskId: taskId,
              },
            })
          }, 1000)
        } else if (progressData.status === "failed") {
          // Processing failed
          setUploading(false)
          setError(progressData.error || "Processing failed")
          setTaskId(null)
          setUploadProgress(0)
          setCurrentStage("")
          setPollCount(0)
        } else if (progressData.status === "processing" || progressData.status === "pending") {
          // Continue polling every 1.5 seconds
          setTimeout(() => pollProgress(taskId), 1500)
        }
      } catch (err) {
        console.error("Error polling progress:", err)

        // Increment poll count for this specific call
        const currentCount = pollCount + 1
        setPollCount(currentCount)

        // If it's a network error, continue polling a few more times
        if (currentCount < 10) {
          setTimeout(() => pollProgress(taskId), 2000)
          return
        }

        setError("Failed to check processing status")
        setUploading(false)
        setTaskId(null)
        setUploadProgress(0)
        setCurrentStage("")
        setPollCount(0)
      }
    },
    [navigate], // Remove pollCount and uploadProgress from dependencies
  )

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file first.")
      return
    }

    setUploading(true)
    setError(null)
    setUploadProgress(0)
    setCurrentStage("uploading")
    setPollCount(0)

    try {
      const formData = new FormData()
      formData.append("file", file)

      // Simulate upload progress
      simulateProgress(0, 10, 1000)

      const response = await axios.post("/resume/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })

      const uploadResponse = response.data

      if (uploadResponse.task_id) {
        setTaskId(uploadResponse.task_id)
        setCurrentStage("processing")
        setUploadProgress(15)

        // Start polling for progress updates
        setTimeout(() => pollProgress(uploadResponse.task_id), 1000)
      } else {
        // Fallback for direct response (if backend returns data immediately)
        setUploadProgress(100)
        navigate("/preview", { state: { jsonData: uploadResponse } })
      }
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.detail || err.message || "Upload failed. Try again.")
      setUploading(false)
      setTaskId(null)
      setUploadProgress(0)
      setCurrentStage("")
      setPollCount(0)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Upload File</CardTitle>
        <CardDescription>Upload a document to preview and download</CardDescription>
      </CardHeader>

      <CardContent>
        <div
          className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center cursor-pointer select-none
            ${dragActive ? "border-primary bg-primary/5" : "border-gray-300 bg-white"}`}
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
                  Drag & drop your file here or <span className="text-primary underline">browse</span>
                </>
              )}
            </div>
            <div className="text-xs text-gray-500">Supports PDF, DOC, and DOCX files</div>
          </div>
        </div>

        {uploading && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{currentStage ? getStageMessage(currentStage) : "Processing..."}</span>
              <span className="text-gray-600">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2 bg-gray-200" />
            <div className="flex justify-center pt-2">
              <div className="animate-spin h-5 w-5 border-2 border-t-transparent border-blue-600 rounded-full" />
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
  )
}











// import React, { useState, useRef } from "react";
// import { useNavigate } from "react-router-dom";
// import { Upload, File } from "lucide-react";
// import axios from "../api/axios";
// import { Button } from "@/components/ui/button";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardFooter,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import { Progress } from "@/components/ui/progress";

// export function FileUpload() {
//   const [file, setFile] = useState(null);
//   const [dragActive, setDragActive] = useState(false);
//   const [error, setError] = useState(null);
//   const [uploading, setUploading] = useState(false);
//   const [uploadProgress, setUploadProgress] = useState(0);
//   const inputRef = useRef(null);
//   const navigate = useNavigate();

//   const handleDrag = (e) => {
//     e.preventDefault();
//     e.stopPropagation();
//     if (e.type === "dragenter" || e.type === "dragover") {
//       setDragActive(true);
//     } else if (e.type === "dragleave" || e.type === "drop") {
//       setDragActive(false);
//     }
//   };

//   const validateFile = (file) => {
//     const validTypes = [
//       "application/pdf",
//       "application/msword",
//       "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
//     ];
//     if (!validTypes.includes(file.type)) {
//       setError("Please upload only PDF, DOC, or DOCX files.");
//       return false;
//     }
//     setError(null);
//     return true;
//   };

//   const handleDrop = (e) => {
//     e.preventDefault();
//     e.stopPropagation();
//     if (e.dataTransfer.files && e.dataTransfer.files[0]) {
//       const droppedFile = e.dataTransfer.files[0];
//       if (validateFile(droppedFile)) {
//         setFile(droppedFile);
//       }
//     }
//   };

//   const handleChange = (e) => {
//     if (e.target.files && e.target.files[0]) {
//       const selectedFile = e.target.files[0];
//       if (validateFile(selectedFile)) {
//         setFile(selectedFile);
//       }
//     }
//   };

//   const handleClick = () => {
//     if (uploading) return;
//     inputRef.current?.click();
//   };

//   const simulateProgress = () => {
//     let current = 0;
//     const interval = setInterval(() => {
//       current += 10;
//       if (current <= 90) setUploadProgress(current);
//       else clearInterval(interval);
//     }, 100);
//   };

//   const handleUpload = async () => {
//     if (!file) {
//       setError("Please select a file first.");
//       return;
//     }

//     setUploading(true);
//     setError(null);
//     setUploadProgress(0);
//     simulateProgress();

//     try {
//       const formData = new FormData();
//       formData.append("file", file);

//       const response = await axios.post("/resume/upload", formData, {
//         headers: { "Content-Type": "multipart/form-data" },
//         onUploadProgress: (progressEvent) => {
//           if (progressEvent.total) {
//             const percentCompleted = Math.round(
//               (progressEvent.loaded * 100) / progressEvent.total
//             );
//             setUploadProgress(percentCompleted);
//           }
//         },
//       });

//       setUploadProgress(100);
//       navigate("/preview", { state: { jsonData: response.data } });
//     } catch (err) {
//       console.error(err);
//       setError(
//         err.response?.data?.detail || err.message || "Upload failed. Try again."
//       );
//     } finally {
//       setUploading(false);
//     }
//   };

//   return (
//     <Card className="w-full max-w-md">
//       <CardHeader>
//         <CardTitle>Upload File</CardTitle>
//         <CardDescription>
//           Upload a document to preview and download
//         </CardDescription>
//       </CardHeader>

//       <CardContent>
//         <div
//           className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center cursor-pointer select-none
//             ${
//               dragActive
//                 ? "border-primary bg-primary/5"
//                 : "border-gray-300 bg-white"
//             }`}
//           onDragEnter={handleDrag}
//           onDragLeave={handleDrag}
//           onDragOver={handleDrag}
//           onDrop={handleDrop}
//           onClick={handleClick}
//         >
//           <input
//             ref={inputRef}
//             type="file"
//             className="hidden"
//             accept=".pdf,.doc,.docx"
//             onChange={handleChange}
//             disabled={uploading}
//           />
//           <div className="flex flex-col items-center justify-center space-y-2">
//             <div className="rounded-full bg-primary/10 p-3">
//               <File className="h-6 w-6 text-primary" />
//             </div>
//             <div className="text-sm font-medium">
//               {file ? (
//                 <span>{file.name}</span>
//               ) : (
//                 <>
//                   Drag & drop your file here or{" "}
//                   <span className="text-primary underline">browse</span>
//                 </>
//               )}
//             </div>
//             <div className="text-xs text-gray-500">
//               Supports PDF, DOC, and DOCX files
//             </div>
//           </div>
//         </div>

//         {uploading && (
//           <div className="mt-4 space-y-2">
//             <div className="flex justify-between text-sm">
//               <span className="text-gray-600">Processing...</span>
//               <span className="text-gray-600">{uploadProgress}%</span>
//             </div>
//             <Progress
//               value={uploadProgress}
//               className="h-2 bg-gray-200 [&>div]:bg-gray-400"
//             />
//             <div className="flex justify-center pt-2">
//               <div className="animate-spin h-5 w-5 border-2 border-t-transparent border-black rounded-full" />
//             </div>
//           </div>
//         )}

//         {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
//       </CardContent>

//       <CardFooter>
//         <Button
//           className="w-full bg-black text-white hover:bg-black/90"
//           onClick={handleUpload}
//           disabled={uploading || !file}
//         >
//           <Upload className="mr-2 h-4 w-4" />
//           {uploading ? "Uploading..." : "Upload File"}
//         </Button>
//       </CardFooter>
//     </Card>
//   );
// }
