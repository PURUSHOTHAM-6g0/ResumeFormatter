import React, { useState } from "react"
import axios from "../api/axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { FileText, Home } from "lucide-react" // ✅ Add Home icon here

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!username || !password) {
      setError("Username and password are required")
      return
    }

    try {
      const res = await axios.post("/auth/login", { username, password })
      localStorage.setItem("token", res.data.access_token)
      setSuccess("Login successful! Redirecting...")
      setTimeout(() => {
        window.location.href = "/upload"
      }, 1000)
    } catch {
      setError("Invalid username or password.")
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Navbar */}
      <header className="bg-black border-b border-gray-800">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2 text-white">
            <FileText className="h-6 w-6 text-white" />
            <span className="font-bold text-xl">FileManager</span>
          </a>

          {/* Right buttons */}
          <div className="flex gap-2">
            <Button asChild variant="outline" className="text-white border-white hover:bg-white hover:text-black">
              <a href="/" className="flex items-center gap-1">
                <Home className="w-4 h-4" />
                Home
              </a>
            </Button>
            <Button 
              asChild
              variant="outline"
              className="text-white border-white hover:bg-white hover:text-black">
            <a href="/register">Register</a>
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-grow flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Login</CardTitle>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-green-50 text-green-600 p-3 rounded-md text-sm">
                  {success}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="Enter Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  placeholder="Enter Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button
                type="submit"
                className="w-full !bg-black !text-white hover:!bg-gray-900"
              >
                Login
              </Button>
              <div className="text-center text-sm">
                Don't have an account?{" "}
                <a href="/register" className="text-primary underline">
                  Register
                </a>
              </div>
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  )
}
