"use client"

import React, { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { useTheme } from "../contexts/ThemeContext"

export default function Navbar() {
  const { user, logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const location = useLocation()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error("Failed to logout:", error)
    }
  }

  const isActive = (path) => location.pathname === path

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-brand">
          <Link to="/dashboard" className="brand-link" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              overflow: 'hidden',
              height: '54px',
              width: '54px',
            }}>
              <img
                src="/image.jpg"
                alt="Keshavam Industries Logo"
                className="navbar-logo"
                style={{ height: '54px', width: '54px', objectFit: 'contain', borderRadius: '50%' }}
              />
            </span>
            {/* <h2 style={{ margin: 0, fontSize: '1.35rem', letterSpacing: '1px' }}>KESHAVAM INDUSTRIES</h2> */}
          </Link>
        </div>

        <div className="nav-links">
          <Link to="/dashboard" className={`nav-link ${isActive("/dashboard") ? "active" : ""}`}>
            <span className="nav-icon">📊</span>
            <span className="nav-text">Dashboard</span>
          </Link>
          <Link to="/projects" className={`nav-link ${isActive("/projects") ? "active" : ""}`}>
            <span className="nav-icon">📁</span>
            <span className="nav-text">Projects</span>
          </Link>
        </div>

        <div className="nav-actions">
          <button onClick={toggleTheme} className="theme-toggle" title="Toggle theme">
            <span className="theme-icon">{isDark ? "☀️" : "🌙"}</span>
          </button>

          <div className="user-menu">
            <div className="user-info">
              <span className="user-avatar">👤</span>
              <div className="user-details">
                <span className="user-name">{user?.displayName || "User"}</span>
                <span className="user-email">{user?.email}</span>
              </div>
            </div>
            <button onClick={handleLogout} className="logout-btn" title="Logout">
              <span className="logout-icon">🚪</span>
              <span className="logout-text">Logout</span>
            </button>
          </div>
        </div>

        {/* Mobile menu button */}
        <div className="mobile-menu">
          <button
            className={`mobile-menu-btn${mobileNavOpen ? " active" : ""}`}
            onClick={() => setMobileNavOpen((open) => !open)}
            aria-label="Open mobile menu"
            aria-expanded={mobileNavOpen}
          >
            <span className="hamburger"></span>
            <span className="hamburger"></span>
            <span className="hamburger"></span>
          </button>
        </div>
      </div>

      {/* Mobile navigation */}
      <div className={`mobile-nav${mobileNavOpen ? " active" : ""}`}>
        <div className="mobile-nav-content">
          <Link to="/dashboard" className={`mobile-nav-link ${isActive("/dashboard") ? "active" : ""}`} onClick={() => setMobileNavOpen(false)}>
            <span className="nav-icon">📊</span>
            <span className="nav-text">Dashboard</span>
          </Link>
          <Link to="/projects" className={`mobile-nav-link ${isActive("/projects") ? "active" : ""}`} onClick={() => setMobileNavOpen(false)}>
            <span className="nav-icon">📁</span>
            <span className="nav-text">Projects</span>
          </Link>

          <div className="mobile-nav-divider"></div>

          <div className="mobile-user-section">
            <div className="mobile-user-info">
              <span className="user-avatar">👤</span>
              <div className="user-details">
                <span className="user-name">{user?.displayName || "User"}</span>
                <span className="user-email">{user?.email}</span>
              </div>
            </div>

            <div className="mobile-actions">
              <button onClick={toggleTheme} className="mobile-theme-toggle">
                <span className="theme-icon">{isDark ? "☀️" : "🌙"}</span>
                <span className="theme-text">{isDark ? "Light Mode" : "Dark Mode"}</span>
              </button>

              <button onClick={handleLogout} className="mobile-logout-btn">
                <span className="logout-icon">🚪</span>
                <span className="logout-text">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
