"use client"

import { useState, useRef, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { Upload, File, X, Plus } from "lucide-react"
import axios from "../api/axios"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

export function FileUpload() {
  const [files, setFiles] = useState([])
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [taskId, setTaskId] = useState(null)
  const [currentStage, setCurrentStage] = useState("")
  const [pollCount, setPollCount] = useState(0)
  const [totalFiles, setTotalFiles] = useState(0)
  const [processedFiles, setProcessedFiles] = useState(0)
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
      return false
    }
    return true
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files)
      const validFiles = droppedFiles.filter(validateFile)

      if (validFiles.length !== droppedFiles.length) {
        setError("Some files were skipped. Only PDF, DOC, or DOCX files are supported.")
      } else {
        setError(null)
      }

      setFiles((prev) => [...prev, ...validFiles])
    }
  }

  const handleChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files)
      const validFiles = selectedFiles.filter(validateFile)

      if (validFiles.length !== selectedFiles.length) {
        setError("Some files were skipped. Only PDF, DOC, or DOCX files are supported.")
      } else {
        setError(null)
      }

      setFiles((prev) => [...prev, ...validFiles])
    }
  }

  const handleClick = () => {
    if (uploading) return
    inputRef.current?.click()
  }

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
    setError(null)
  }

  const clearAllFiles = () => {
    setFiles([])
    setError(null)
  }

  const getStageMessage = (stage) => {
    const stageMessages = {
      upload: "Files uploaded successfully",
      processing: "Starting processing...",
      processing_multiple: "Processing multiple files...",
      converting_docx_to_pdf: "Converting pages to images...",
      conversion_to_image_all_pages: "Completed Converting pages to images...",
      parsing_all_pages_with_vision: "Analyzing document with AI...",
      extraction: "Extracting text from document...",
      parsing: "Processing resume data...",
      completion: "Finalizing results...",
      completed: "Processing completed!",
      failed: "Processing failed",
    }

    // Handle dynamic file processing messages
    if (stage.includes("processing_file_")) {
      const match = stage.match(/processing_file_(\d+)_of_(\d+)/)
      if (match) {
        return `Processing file ${match[1]} of ${match[2]}...`
      }
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
            processing_multiple: 20,
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

        // Update batch processing info if available
        if (progressData.total_files) {
          setTotalFiles(progressData.total_files)
          setProcessedFiles(progressData.processed_files || 0)
        }

        if (progressData.status === "completed" && progressData.data) {
          // Processing completed successfully
          setUploading(false)
          setUploadProgress(100)
          setCurrentStage("completed")

          console.log("Final processed data:", progressData.data) // Debug log

          // Navigate to preview with the processed data
          setTimeout(() => {
            navigate("/preview", {
              state: {
                jsonData: Array.isArray(progressData.data) ? progressData.data[0] : progressData.data,
                allData: progressData.data,
                taskId: taskId,
                isMultiple: Array.isArray(progressData.data) && progressData.data.length > 1,
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
          setTotalFiles(0)
          setProcessedFiles(0)
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
        setTotalFiles(0)
        setProcessedFiles(0)
      }
    },
    [navigate], // Remove pollCount and uploadProgress from dependencies
  )

  const handleUpload = async () => {
    if (files.length === 0) {
      setError("Please select at least one file.")
      return
    }

    setUploading(true)
    setError(null)
    setUploadProgress(0)
    setCurrentStage("uploading")
    setPollCount(0)
    setProcessedFiles(0)

    try {
      const formData = new FormData()

      // Determine if single or multiple upload
      const isMultiple = files.length > 1

      if (isMultiple) {
        // Multiple file upload
        files.forEach((file) => {
          formData.append("files", file)
        })
        setTotalFiles(files.length)

        // Simulate upload progress
        simulateProgress(0, 10, 1000)

        const response = await axios.post("/resume/upload-multiple", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })

        const uploadResponse = response.data
        console.log("Multiple upload response:", uploadResponse) // Debug log
        setTotalFiles(uploadResponse.total_files || files.length)

        if (uploadResponse.task_id) {
          setTaskId(uploadResponse.task_id)
          setCurrentStage("processing_multiple")
          setUploadProgress(15)

          // Start polling for progress updates
          setTimeout(() => pollProgress(uploadResponse.task_id), 1000)
        }
      } else {
        // Single file upload
        formData.append("file", files[0])
        setTotalFiles(1)

        // Simulate upload progress
        simulateProgress(0, 10, 1000)

        const response = await axios.post("/resume/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })

        const uploadResponse = response.data
        console.log("Single upload response:", uploadResponse) // Debug log

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
      }
    } catch (err) {
      console.error("Upload error:", err)
      setError(err.response?.data?.detail || err.message || "Upload failed. Try again.")
      setUploading(false)
      setTaskId(null)
      setUploadProgress(0)
      setCurrentStage("")
      setPollCount(0)
      setTotalFiles(0)
      setProcessedFiles(0)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Upload Files</CardTitle>
        <CardDescription>Upload one or more documents to preview and download</CardDescription>
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
            multiple
          />
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="rounded-full bg-primary/10 p-3">
              {files.length > 0 ? (
                <div className="flex items-center gap-1">
                  <File className="h-6 w-6 text-primary" />
                  <span className="text-sm font-medium text-primary">{files.length}</span>
                </div>
              ) : (
                <Plus className="h-6 w-6 text-primary" />
              )}
            </div>
            <div className="text-sm font-medium">
              {files.length > 0 ? (
                <span>
                  {files.length} file{files.length > 1 ? "s" : ""} selected
                </span>
              ) : (
                <>
                  Drag & drop your files here or <span className="text-primary underline">browse</span>
                </>
              )}
            </div>
            <div className="text-xs text-gray-500">Supports PDF, DOC, and DOCX files</div>
          </div>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Selected Files:</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFiles}
                disabled={uploading}
                className="text-red-500 hover:text-red-700"
              >
                Clear All
              </Button>
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded text-sm">
                  <span className="truncate flex-1">{file.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    disabled={uploading}
                    className="ml-2 h-6 w-6 p-0 text-red-500 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {uploading && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{currentStage ? getStageMessage(currentStage) : "Processing..."}</span>
              <span className="text-gray-600">{uploadProgress}%</span>
            </div>
            {totalFiles > 1 && (
              <div className="text-xs text-gray-500">
                Files processed: {processedFiles} / {totalFiles}
              </div>
            )}
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
          disabled={uploading || files.length === 0}
        >
          <Upload className="mr-2 h-4 w-4" />
          {uploading ? "Uploading..." : `Upload ${files.length} File${files.length > 1 ? "s" : ""}`}
        </Button>
      </CardFooter>
    </Card>
  )
}








// "use client"

// import { useState, useRef, useCallback } from "react"
// import { useNavigate } from "react-router-dom"
// import { Upload, File, X, Plus } from "lucide-react"
// import axios from "../api/axios"
// import { Button } from "@/components/ui/button"
// import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
// import { Progress } from "@/components/ui/progress"

// export function FileUpload() {
//   const [files, setFiles] = useState([])
//   const [dragActive, setDragActive] = useState(false)
//   const [error, setError] = useState(null)
//   const [uploading, setUploading] = useState(false)
//   const [uploadProgress, setUploadProgress] = useState(0)
//   const [taskId, setTaskId] = useState(null)
//   const [currentStage, setCurrentStage] = useState("")
//   const [pollCount, setPollCount] = useState(0)
//   const [totalFiles, setTotalFiles] = useState(0)
//   const [processedFiles, setProcessedFiles] = useState(0)
//   const inputRef = useRef(null)
//   const navigate = useNavigate()

//   const handleDrag = (e) => {
//     e.preventDefault()
//     e.stopPropagation()
//     if (e.type === "dragenter" || e.type === "dragover") {
//       setDragActive(true)
//     } else if (e.type === "dragleave" || e.type === "drop") {
//       setDragActive(false)
//     }
//   }

//   const validateFile = (file) => {
//     const validTypes = [
//       "application/pdf",
//       "application/msword",
//       "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
//     ]
//     if (!validTypes.includes(file.type)) {
//       return false
//     }
//     return true
//   }

//   const handleDrop = (e) => {
//     e.preventDefault()
//     e.stopPropagation()
//     if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
//       const droppedFiles = Array.from(e.dataTransfer.files)
//       const validFiles = droppedFiles.filter(validateFile)

//       if (validFiles.length !== droppedFiles.length) {
//         setError("Some files were skipped. Only PDF, DOC, or DOCX files are supported.")
//       } else {
//         setError(null)
//       }

//       setFiles((prev) => [...prev, ...validFiles])
//     }
//   }

//   const handleChange = (e) => {
//     if (e.target.files && e.target.files.length > 0) {
//       const selectedFiles = Array.from(e.target.files)
//       const validFiles = selectedFiles.filter(validateFile)

//       if (validFiles.length !== selectedFiles.length) {
//         setError("Some files were skipped. Only PDF, DOC, or DOCX files are supported.")
//       } else {
//         setError(null)
//       }

//       setFiles((prev) => [...prev, ...validFiles])
//     }
//   }

//   const handleClick = () => {
//     if (uploading) return
//     inputRef.current?.click()
//   }

//   const removeFile = (index) => {
//     setFiles((prev) => prev.filter((_, i) => i !== index))
//     setError(null)
//   }

//   const clearAllFiles = () => {
//     setFiles([])
//     setError(null)
//   }

//   const getStageMessage = (stage) => {
//     const stageMessages = {
//       upload: "Files uploaded successfully",
//       processing: "Starting processing...",
//       processing_multiple: "Processing multiple files...",
//       converting_docx_to_pdf: "Converting pages to images...",
//       conversion_to_image_all_pages: "Completed Converting pages to images...",
//       parsing_all_pages_with_vision: "Analyzing document with AI...",
//       extraction: "Extracting text from document...",
//       parsing: "Processing resume data...",
//       completion: "Finalizing results...",
//       completed: "Processing completed!",
//       failed: "Processing failed",
//     }

//     // Handle dynamic file processing messages
//     if (stage.includes("processing_file_")) {
//       const match = stage.match(/processing_file_(\d+)_of_(\d+)/)
//       if (match) {
//         return `Processing file ${match[1]} of ${match[2]}...`
//       }
//     }

//     return stageMessages[stage] || "Processing..."
//   }

//   const simulateProgress = (currentProgress, targetProgress, duration = 2000) => {
//     const steps = 20
//     const stepSize = (targetProgress - currentProgress) / steps
//     const stepDuration = duration / steps

//     let step = 0
//     const interval = setInterval(() => {
//       step++
//       const newProgress = Math.min(currentProgress + stepSize * step, targetProgress)
//       setUploadProgress(Math.round(newProgress))

//       if (step >= steps || newProgress >= targetProgress) {
//         clearInterval(interval)
//       }
//     }, stepDuration)

//     return interval
//   }

//   const pollProgress = useCallback(
//     async (taskId) => {
//       try {
//         const response = await axios.get(`/resume/progress/${taskId}`)
//         const progressData = response.data

//         console.log("Progress data:", progressData) // Debug log

//         // Get backend progress directly
//         let targetProgress = progressData.progress || 0

//         // If backend doesn't provide progress, simulate based on stage
//         if (!progressData.progress || progressData.progress === 0) {
//           const stageProgress = {
//             upload: 10,
//             processing: 15,
//             processing_multiple: 20,
//             converting_docx_to_pdf: 25,
//             conversion_to_image_all_pages: 40,
//             parsing_all_pages_with_vision: 70,
//             extraction: 50,
//             parsing: 80,
//             completion: 95,
//             completed: 100,
//             failed: 0,
//           }

//           targetProgress = stageProgress[progressData.stage] || 10
//         }

//         // Update progress immediately
//         setUploadProgress(targetProgress)
//         setCurrentStage(progressData.stage || "processing")

//         // Update batch processing info if available
//         if (progressData.total_files) {
//           setTotalFiles(progressData.total_files)
//           setProcessedFiles(progressData.processed_files || 0)
//         }

//         if (progressData.status === "completed" && progressData.data) {
//           // Processing completed successfully
//           setUploading(false)
//           setUploadProgress(100)
//           setCurrentStage("completed")

//           // Navigate to preview with the processed data
//           setTimeout(() => {
//             navigate("/preview", {
//               state: {
//                 jsonData: Array.isArray(progressData.data) ? progressData.data[0] : progressData.data,
//                 allData: progressData.data,
//                 taskId: taskId,
//                 isMultiple: Array.isArray(progressData.data) && progressData.data.length > 1,
//               },
//             })
//           }, 1000)
//         } else if (progressData.status === "failed") {
//           // Processing failed
//           setUploading(false)
//           setError(progressData.error || "Processing failed")
//           setTaskId(null)
//           setUploadProgress(0)
//           setCurrentStage("")
//           setPollCount(0)
//           setTotalFiles(0)
//           setProcessedFiles(0)
//         } else if (progressData.status === "processing" || progressData.status === "pending") {
//           // Continue polling every 1.5 seconds
//           setTimeout(() => pollProgress(taskId), 1500)
//         }
//       } catch (err) {
//         console.error("Error polling progress:", err)

//         // Increment poll count for this specific call
//         const currentCount = pollCount + 1
//         setPollCount(currentCount)

//         // If it's a network error, continue polling a few more times
//         if (currentCount < 10) {
//           setTimeout(() => pollProgress(taskId), 2000)
//           return
//         }

//         setError("Failed to check processing status")
//         setUploading(false)
//         setTaskId(null)
//         setUploadProgress(0)
//         setCurrentStage("")
//         setPollCount(0)
//         setTotalFiles(0)
//         setProcessedFiles(0)
//       }
//     },
//     [navigate], // Remove pollCount and uploadProgress from dependencies
//   )

//   const handleUpload = async () => {
//     if (files.length === 0) {
//       setError("Please select at least one file.")
//       return
//     }

//     setUploading(true)
//     setError(null)
//     setUploadProgress(0)
//     setCurrentStage("uploading")
//     setPollCount(0)
//     setProcessedFiles(0)

//     try {
//       const formData = new FormData()

//       // Determine if single or multiple upload
//       const isMultiple = files.length > 1

//       if (isMultiple) {
//         // Multiple file upload
//         files.forEach((file) => {
//           formData.append("files", file)
//         })
//         setTotalFiles(files.length)

//         // Simulate upload progress
//         simulateProgress(0, 10, 1000)

//         const response = await axios.post("/resume/upload-multiple", formData, {
//           headers: { "Content-Type": "multipart/form-data" },
//         })

//         const uploadResponse = response.data
//         setTotalFiles(uploadResponse.total_files || files.length)

//         if (uploadResponse.task_id) {
//           setTaskId(uploadResponse.task_id)
//           setCurrentStage("processing_multiple")
//           setUploadProgress(15)

//           // Start polling for progress updates
//           setTimeout(() => pollProgress(uploadResponse.task_id), 1000)
//         }
//       } else {
//         // Single file upload
//         formData.append("file", files[0])
//         setTotalFiles(1)

//         // Simulate upload progress
//         simulateProgress(0, 10, 1000)

//         const response = await axios.post("/resume/upload", formData, {
//           headers: { "Content-Type": "multipart/form-data" },
//         })

//         const uploadResponse = response.data

//         if (uploadResponse.task_id) {
//           setTaskId(uploadResponse.task_id)
//           setCurrentStage("processing")
//           setUploadProgress(15)

//           // Start polling for progress updates
//           setTimeout(() => pollProgress(uploadResponse.task_id), 1000)
//         } else {
//           // Fallback for direct response (if backend returns data immediately)
//           setUploadProgress(100)
//           navigate("/preview", { state: { jsonData: uploadResponse } })
//         }
//       }
//     } catch (err) {
//       console.error(err)
//       setError(err.response?.data?.detail || err.message || "Upload failed. Try again.")
//       setUploading(false)
//       setTaskId(null)
//       setUploadProgress(0)
//       setCurrentStage("")
//       setPollCount(0)
//       setTotalFiles(0)
//       setProcessedFiles(0)
//     }
//   }

//   return (
//     <Card className="w-full max-w-md">
//       <CardHeader>
//         <CardTitle>Upload Files</CardTitle>
//         <CardDescription>Upload one or more documents to preview and download</CardDescription>
//       </CardHeader>

//       <CardContent>
//         <div
//           className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center cursor-pointer select-none
//             ${dragActive ? "border-primary bg-primary/5" : "border-gray-300 bg-white"}`}
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
//             multiple
//           />
//           <div className="flex flex-col items-center justify-center space-y-2">
//             <div className="rounded-full bg-primary/10 p-3">
//               {files.length > 0 ? (
//                 <div className="flex items-center gap-1">
//                   <File className="h-6 w-6 text-primary" />
//                   <span className="text-sm font-medium text-primary">{files.length}</span>
//                 </div>
//               ) : (
//                 <Plus className="h-6 w-6 text-primary" />
//               )}
//             </div>
//             <div className="text-sm font-medium">
//               {files.length > 0 ? (
//                 <span>
//                   {files.length} file{files.length > 1 ? "s" : ""} selected
//                 </span>
//               ) : (
//                 <>
//                   Drag & drop your files here or <span className="text-primary underline">browse</span>
//                 </>
//               )}
//             </div>
//             <div className="text-xs text-gray-500">Supports PDF, DOC, and DOCX files</div>
//           </div>
//         </div>

//         {/* File List */}
//         {files.length > 0 && (
//           <div className="mt-4 space-y-2">
//             <div className="flex justify-between items-center">
//               <span className="text-sm font-medium">Selected Files:</span>
//               <Button
//                 variant="ghost"
//                 size="sm"
//                 onClick={clearAllFiles}
//                 disabled={uploading}
//                 className="text-red-500 hover:text-red-700"
//               >
//                 Clear All
//               </Button>
//             </div>
//             <div className="max-h-32 overflow-y-auto space-y-1">
//               {files.map((file, index) => (
//                 <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded text-sm">
//                   <span className="truncate flex-1">{file.name}</span>
//                   <Button
//                     variant="ghost"
//                     size="sm"
//                     onClick={() => removeFile(index)}
//                     disabled={uploading}
//                     className="ml-2 h-6 w-6 p-0 text-red-500 hover:text-red-700"
//                   >
//                     <X className="h-4 w-4" />
//                   </Button>
//                 </div>
//               ))}
//             </div>
//           </div>
//         )}

//         {uploading && (
//           <div className="mt-4 space-y-2">
//             <div className="flex justify-between text-sm">
//               <span className="text-gray-600">{currentStage ? getStageMessage(currentStage) : "Processing..."}</span>
//               <span className="text-gray-600">{uploadProgress}%</span>
//             </div>
//             {totalFiles > 1 && (
//               <div className="text-xs text-gray-500">
//                 Files processed: {processedFiles} / {totalFiles}
//               </div>
//             )}
//             <Progress value={uploadProgress} className="h-2 bg-gray-200" />
//             <div className="flex justify-center pt-2">
//               <div className="animate-spin h-5 w-5 border-2 border-t-transparent border-blue-600 rounded-full" />
//             </div>
//           </div>
//         )}

//         {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
//       </CardContent>

//       <CardFooter>
//         <Button
//           className="w-full bg-black text-white hover:bg-black/90"
//           onClick={handleUpload}
//           disabled={uploading || files.length === 0}
//         >
//           <Upload className="mr-2 h-4 w-4" />
//           {uploading ? "Uploading..." : `Upload ${files.length} File${files.length > 1 ? "s" : ""}`}
//         </Button>
//       </CardFooter>
//     </Card>
//   )
// }










