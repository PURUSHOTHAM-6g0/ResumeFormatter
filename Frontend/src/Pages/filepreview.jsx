"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { PDFDownloadLink, BlobProvider } from "@react-pdf/renderer"
import { useLocation, useNavigate } from "react-router-dom"
import ResumePDF from "./ResumePreview"
import { generateResumeDocx } from "./DocxGenerator"

import FileOpenIcon from "@mui/icons-material/FolderOpen"
import HomeIcon from "@mui/icons-material/Home"
import NavigateNextIcon from "@mui/icons-material/NavigateNext"
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore"

// MUI Icons for download buttons
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf"
import DescriptionIcon from "@mui/icons-material/Description"

// Enhanced data validation function
const validateResumeData = (data) => {
  if (!data || typeof data !== "object") {
    return {
      name: "Unknown",
      email: "Not available",
      mobile: "Not available",
      skills: [],
      education: "Not available",
      professional_experience: [],
      certifications: [],
      experience_data: [],
      summary: "Not available",
      filename: "Unknown",
    }
  }

  // Validate skills array
  let validatedSkills = []
  if (Array.isArray(data.skills)) {
    validatedSkills = data.skills.filter((skill) => {
      if (!skill || typeof skill !== "object") return false
      const entries = Object.entries(skill)
      return entries.length > 0 && entries[0][0] && entries[0][1]
    })
  }

  // Validate certifications array
  let validatedCertifications = []
  if (Array.isArray(data.certifications)) {
    validatedCertifications = data.certifications.filter(
      (cert) => cert && typeof cert === "string" && cert.trim() !== "" && cert !== "Not available",
    )
  }

  // Validate professional experience array
  let validatedProfExp = []
  if (Array.isArray(data.professional_experience)) {
    validatedProfExp = data.professional_experience.filter(
      (exp) => exp && typeof exp === "string" && exp.trim() !== "" && exp !== "Not available",
    )
  }

  // Validate experience data array
  let validatedExpData = []
  if (Array.isArray(data.experience_data)) {
    validatedExpData = data.experience_data.filter((exp) => exp && typeof exp === "object")
  }

  return {
    name: data.name && typeof data.name === "string" ? data.name.trim() : "Unknown",
    email: data.email && typeof data.email === "string" ? data.email.trim() : "Not available",
    mobile: data.mobile && typeof data.mobile === "string" ? data.mobile.trim() : "Not available",
    skills: validatedSkills,
    education: data.education && typeof data.education === "string" ? data.education.trim() : "Not available",
    professional_experience: validatedProfExp,
    certifications: validatedCertifications,
    experience_data: validatedExpData,
    summary: data.summary && typeof data.summary === "string" ? data.summary.trim() : "Not available",
    filename: data.filename && typeof data.filename === "string" ? data.filename.trim() : "Unknown",
  }
}

export default function PreviewPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [jsonData, setJsonData] = useState(null)
  const [allData, setAllData] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isMultiple, setIsMultiple] = useState(false)
  const [downloadingDocx, setDownloadingDocx] = useState(false)
  const [error, setError] = useState(null)
  const [pdfError, setPdfError] = useState(null)
  const [pdfKey, setPdfKey] = useState(0) // Force PDF re-render

  // Memoize the current resume data to prevent unnecessary re-renders
  const currentResumeData = useMemo(() => {
    if (!jsonData) return null
    return validateResumeData(jsonData)
  }, [jsonData])

  // Memoize the PDF component to prevent recreation on every render
  const pdfComponent = useMemo(() => {
    if (!currentResumeData) return null
    try {
      return <ResumePDF data={currentResumeData} />
    } catch (error) {
      console.error("Error creating PDF component:", error)
      return null
    }
  }, [currentResumeData, pdfKey])

  useEffect(() => {
    if (location.state?.jsonData) {
      const { jsonData, allData, isMultiple } = location.state

      try {
        console.log("Raw jsonData:", jsonData)
        console.log("Raw allData:", allData)

        // Validate and clean the data
        const validatedJsonData = validateResumeData(jsonData)
        console.log("Validated jsonData:", validatedJsonData)

        setJsonData(validatedJsonData)

        // Ensure allData is properly initialized as an array
        if (Array.isArray(allData)) {
          const validatedAllData = allData.map((item, index) => {
            console.log(`Validating item ${index}:`, item)
            return validateResumeData(item)
          })
          console.log("Validated allData:", validatedAllData)
          setAllData(validatedAllData)
          setIsMultiple(validatedAllData.length > 1)
        } else if (jsonData) {
          // If allData is not provided but jsonData is, use jsonData as the only item
          setAllData([validatedJsonData])
          setIsMultiple(false)
        }

        setCurrentIndex(0)
        setPdfError(null)
        setPdfKey(0)
      } catch (err) {
        console.error("Error processing resume data:", err)
        setError("Error processing resume data: " + err.message)
      }
    } else {
      navigate("/")
    }
  }, [location, navigate])

  const handleDownloadDocx = async () => {
    if (!currentResumeData) return
    setDownloadingDocx(true)
    try {
      await generateResumeDocx(currentResumeData)
    } catch (err) {
      setError(err.message || "DOCX download error")
      console.error(err)
    } finally {
      setDownloadingDocx(false)
    }
  }

  const switchToFile = useCallback(
    (newIndex) => {
      if (!allData || newIndex < 0 || newIndex >= allData.length) return

      try {
        console.log(`Switching to file ${newIndex}:`, allData[newIndex])
        const newData = validateResumeData(allData[newIndex])
        console.log("Validated new data:", newData)

        setCurrentIndex(newIndex)
        setJsonData(newData)
        setPdfError(null)
        setError(null)
        // Force PDF component recreation with a new key
        setPdfKey((prev) => prev + 1)
      } catch (err) {
        console.error("Error switching file:", err)
        setError("Error loading file: " + err.message)
      }
    },
    [allData],
  )

  const handleNext = useCallback(() => {
    if (currentIndex < allData.length - 1) {
      switchToFile(currentIndex + 1)
    }
  }, [currentIndex, allData.length, switchToFile])

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      switchToFile(currentIndex - 1)
    }
  }, [currentIndex, switchToFile])

  if (!jsonData || !currentResumeData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-gray-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading resume data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Navbar */}
      <header className="bg-black border-b border-gray-800">
        <div className="w-full max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div
            className="flex items-center gap-2 text-white cursor-pointer select-none"
            onClick={() => navigate("/upload")}
          >
            <FileOpenIcon className="h-6 w-6" />
            <span className="font-bold text-xl">Resume Extractor</span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => navigate("/upload")}
              className="inline-flex items-center gap-1 rounded-md border border-white px-3 py-1 text-white hover:bg-white hover:text-black transition"
            >
              <HomeIcon className="w-5 h-5" />
              Home
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto py-10 px-4 flex-1">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-gray-900">File Preview</h1>
          {isMultiple && (
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <NavigateBeforeIcon className="w-4 h-4" />
                Previous
              </button>
              <span className="text-sm text-gray-600">
                {currentIndex + 1} of {allData.length}
              </span>
              <button
                onClick={handleNext}
                disabled={currentIndex === allData.length - 1}
                className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <NavigateNextIcon className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mb-6">
          <p className="text-muted-foreground">
            Preview and download your resume{isMultiple ? "s" : ""}
            {isMultiple && (
              <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                {currentResumeData.filename || `Resume ${currentIndex + 1}`}
              </span>
            )}
          </p>
        </div>

        <div className="bg-white border rounded-xl shadow-sm p-6">
          {/* Download Buttons */}
          <div className="text-center mb-6">
            <p className="text-sm text-gray-500 mb-4">Your resume is ready for download.</p>

            <div className="flex flex-wrap justify-center gap-4">
              {/* PDF Download Button */}
              {pdfComponent && (
                <PDFDownloadLink
                  key={`pdf-download-${pdfKey}`} // Force recreation with key
                  document={pdfComponent}
                  fileName={`${currentResumeData.name || currentResumeData.filename || "resume"}.pdf`}
                >
                  {({ loading, error: downloadError }) => (
                    <button
                      disabled={loading || !!downloadError}
                      className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-800 shadow-sm transition hover:bg-gray-100 disabled:opacity-50"
                    >
                      <PictureAsPdfIcon fontSize="small" />
                      {loading ? "Preparing PDF..." : downloadError ? "PDF Error" : "Download PDF"}
                    </button>
                  )}
                </PDFDownloadLink>
              )}

              {/* DOCX Download Button */}
              <button
                onClick={handleDownloadDocx}
                disabled={downloadingDocx}
                className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-800 shadow-sm transition hover:bg-gray-100 disabled:opacity-50"
              >
                <DescriptionIcon fontSize="small" />
                {downloadingDocx ? "Preparing DOCX..." : "Download DOCX"}
              </button>
            </div>

            {(error || pdfError) && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-700 text-sm font-medium">{error || pdfError}</p>
              </div>
            )}
          </div>

          {/* PDF Preview */}
          <div className="border border-gray-200 rounded-lg overflow-hidden h-[600px] bg-gray-50">
            {pdfComponent ? (
              <BlobProvider key={`pdf-preview-${pdfKey}`} document={pdfComponent}>
                {({ url, loading, error: blobError }) => {
                  if (blobError) {
                    console.error("PDF Blob Error:", blobError)
                    setPdfError(`PDF Preview Error: ${blobError.message}`)
                    return (
                      <div className="h-full flex items-center justify-center flex-col">
                        <div className="text-red-500 text-center max-w-md">
                          <p className="text-lg font-semibold mb-2">PDF Preview Error</p>
                          <p className="text-sm mb-2">Unable to generate PDF preview for this file.</p>
                          <p className="text-xs text-gray-600 mb-4">
                            File: {currentResumeData.filename || `Resume ${currentIndex + 1}`}
                          </p>
                          <p className="text-xs text-red-600 bg-red-50 p-2 rounded">Error: {blobError.message}</p>
                        </div>
                      </div>
                    )
                  }

                  if (loading) {
                    return (
                      <div className="h-full flex items-center justify-center">
                        <div className="text-center">
                          <div className="animate-spin h-6 w-6 border-2 border-gray-400 border-t-transparent rounded-full mx-auto mb-2"></div>
                          <p className="text-sm text-gray-600">Generating PDF preview...</p>
                        </div>
                      </div>
                    )
                  }

                  return (
                    <iframe
                      src={url}
                      title="PDF Preview"
                      width="100%"
                      height="100%"
                      className="border-none"
                      onError={(e) => {
                        console.error("Iframe error:", e)
                        setPdfError("Failed to load PDF preview")
                      }}
                    />
                  )
                }}
              </BlobProvider>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-red-500 text-center">
                  <p className="text-lg font-semibold mb-2">PDF Generation Error</p>
                  <p className="text-sm">Unable to create PDF component for this file.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}













