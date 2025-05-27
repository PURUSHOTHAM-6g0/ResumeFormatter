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
import { FileText, Home ,UserPlus } from "lucide-react"
import HomeIcon from "@mui/icons-material/Home"

export default function RegisterPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!username || !password) {
      setError("All fields are required")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    try {
      await axios.post("/auth/register", { username, password })
      setSuccess("Registration successful! You can now login.")
      setUsername("")
      setPassword("")
      setConfirmPassword("")
    } catch {
      setError("Registration failed. Try a different username.")
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Navbar */}
      <header className="bg-black border-b border-gray-800">
      <div className="w-full max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="/" className="flex items-center gap-2 text-white">
            <FileText className="h-6 w-6 text-white" />
            <span className="font-bold text-xl">Resume Extractor</span>
          </a>
          <div className="flex gap-2">
            <Button
              asChild
              variant="outline"
              className="text-white border-white hover:bg-white hover:text-black"
            >
              <a href="/" className="flex items-center gap-1">
                <HomeIcon className="w-5 h-5" />
                Home
              </a>
            </Button>

            <Button
              asChild
              variant="outline"
              className="text-white border-white hover:bg-white hover:text-black"
            >
              <a href="/login">Login</a>
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-grow flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Create an account</CardTitle>
            <CardDescription>
              Enter your details below to create your account
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
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  placeholder="Confirm Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button
                type="submit"
                className="w-full !bg-black !text-white hover:!bg-gray-900 flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Register
              </Button>
              <div className="text-center text-sm">
                Already have an account?{" "}
                <a href="/login" className="text-primary underline">
                  Login
                </a>
              </div>
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  )
}
