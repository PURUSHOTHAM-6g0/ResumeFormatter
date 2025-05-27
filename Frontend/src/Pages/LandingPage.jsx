import React from "react";
import { Button } from "@/components/ui/button";
import { FileText, Upload, Download } from "lucide-react";
import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-black">
      <div className="w-full max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl text-white">Resume Extractor</span>
          </div>
          <nav className="flex items-center gap-4">
            {/* Login button as ghost with white text */}
            <Button variant="ghost" className="text-white hover:bg-gray-900" to="/login">
              Login
            </Button>
            {/* Register button as solid black */}
            <Button variant="default" className="!bg-black !text-white hover:!bg-gray-900" to="/register">
              Register
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-b from-white to-gray-50">
        <div className="container mx-auto px-4 flex flex-col items-center text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Manage Your Files <span className="text-primary">Effortlessly</span>
          </h1>
          <p className="mt-6 text-xl text-gray-600 max-w-3xl">
            Upload, preview, and download your documents with our simple and intuitive file management system.
          </p>
          <div className="mt-10 flex flex-wrap gap-4 justify-center">
            {/* Register button black */}
            <Button to="/register" size="lg" variant="default" className="!bg-black !text-white hover:!bg-gray-900 h-12 px-8">
              Get Started
            </Button>
            {/* Login button outlined with black text */}
            <Button to="/login" size="lg" variant="outline" className="text-black h-12 px-8">
              Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center p-6 rounded-lg border bg-white shadow-sm">
              <div className="p-3 rounded-full bg-primary/10 mb-4">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Easy Upload</h3>
              <p className="text-gray-600">
                Quickly upload your documents with our simple drag-and-drop interface or file browser.
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-6 rounded-lg border bg-white shadow-sm">
              <div className="p-3 rounded-full bg-primary/10 mb-4">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">File Preview</h3>
              <p className="text-gray-600">
                Preview your documents before downloading to ensure you have the right file.
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-6 rounded-lg border bg-white shadow-sm">
              <div className="p-3 rounded-full bg-primary/10 mb-4">
                <Download className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Multiple Formats</h3>
              <p className="text-gray-600">
                Download your files in different formats including PDF and DOCX to suit your needs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary/5">
        <div className="container mx-auto px-4 flex flex-col items-center text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Get Started?</h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl">
            Join thousands of users who trust FileManager for their document management needs.
          </p>
          <Button to="/register" size="lg" variant="default" className="!bg-black !text-white h-12 px-8">
            Create Free Account
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t mt-auto">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <FileText className="h-5 w-5 text-primary" />
            <span className="font-semibold">Resume Extractor</span>
          </div>
          <p className="text-sm text-gray-500">© 2025 FileManager. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
