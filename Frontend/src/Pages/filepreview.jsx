import React, { useState, useEffect } from "react"
import { PDFDownloadLink, BlobProvider } from "@react-pdf/renderer"
import { useLocation, useNavigate } from "react-router-dom"
import ResumePDF from "./ResumePreview"
import { generateResumeDocx } from "./DocxGenerator"

import FileOpenIcon from "@mui/icons-material/FolderOpen"
import HomeIcon from "@mui/icons-material/Home"

// MUI Icons for download buttons
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf"
import DescriptionIcon from "@mui/icons-material/Description"

export default function PreviewPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [jsonData, setJsonData] = useState(null)
  const [downloadingDocx, setDownloadingDocx] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (location.state?.jsonData) {
      setJsonData(location.state.jsonData)
    } else {
      navigate("/")
    }
  }, [location, navigate])

  const handleDownloadDocx = async () => {
    if (!jsonData) return
    setDownloadingDocx(true)
    try {
      await generateResumeDocx(jsonData)
    } catch (err) {
      setError(err.message || "DOCX download error")
      console.error(err)
    } finally {
      setDownloadingDocx(false)
    }
  }

  if (!jsonData) return null

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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">File Preview</h1>
        <p className="text-muted-foreground mb-6">
          Preview and download your resume
        </p>

        <div className="bg-white border rounded-xl shadow-sm p-6">
          {/* Download Buttons */}
          <div className="text-center mb-6">
            <p className="text-sm text-gray-500 mb-4">
              Your resume is ready for download.
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              {/* PDF Download Button */}
              <PDFDownloadLink
                document={<ResumePDF data={jsonData} />}
                fileName={`${jsonData.name || "resume"}.pdf`}
              >
                {({ loading }) => (
                  <button
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-800 shadow-sm transition hover:bg-gray-100 disabled:opacity-50"
                  >
                    <PictureAsPdfIcon fontSize="small" />
                    {loading ? "Preparing PDF..." : "Download PDF"}
                  </button>
                )}
              </PDFDownloadLink>

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

            {error && (
              <p className="text-red-500 text-sm mt-4 font-medium">{error}</p>
            )}
          </div>

          {/* PDF Preview */}
          <div className="border border-gray-200 rounded-lg overflow-hidden h-[600px] bg-gray-50">
            <BlobProvider document={<ResumePDF data={jsonData} />}>
              {({ url, loading }) =>
                loading ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="animate-spin h-6 w-6 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                  </div>
                ) : (
                  <iframe
                    src={url}
                    title="PDF Preview"
                    width="100%"
                    height="100%"
                    className="border-none"
                  />
                )
              }
            </BlobProvider>
          </div>
        </div>
      </main>
    </div>
  )
}
