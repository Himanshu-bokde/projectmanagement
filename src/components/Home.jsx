"use client"
import { Link } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"

export default function Home() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner">⏳</div>
      </div>
    )
  }

  if (user) {
    return (
      <div className="home-container">
        <div className="home-card">
          <div className="home-header">
            <h1 className="home-title">Welcome back, {user.displayName || user.email}!</h1>
            <p className="home-subtitle">You are already signed in</p>
          </div>
          <div className="home-content">
            <Link to="/dashboard" className="primary-button">
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="home-container">
      <div className="home-card">
        <div className="home-header">
          <h1 className="home-title">Firebase Auth Demo</h1>
          <p className="home-subtitle">Please sign in or create an account to continue</p>
        </div>
        <div className="home-content">
          <Link to="/login" className="primary-button">
            Sign In
          </Link>
          <Link to="/signup" className="secondary-button">
            Create Account
          </Link>
        </div>
      </div>
    </div>
  )
}
