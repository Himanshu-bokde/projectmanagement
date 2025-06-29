"use client"

import { useEffect } from "react"

export default function FilterToast({ message, show, onHide, type = "info" }) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onHide()
      }, 3000) // Increased duration for better UX
      return () => clearTimeout(timer)
    }
  }, [show, onHide])

  if (!show) return null

  const getIcon = () => {
    switch (type) {
      case "success":
        return "✅"
      case "error":
        return "❌"
      case "warning":
        return "⚠️"
      case "info":
      default:
        return "ℹ️"
    }
  }

  return (
    <div className={`filter-toast filter-toast-${type}`}>
      <span className="toast-icon">{getIcon()}</span>
      <span className="toast-message">{message}</span>
      <button onClick={onHide} className="toast-close" aria-label="Close notification">
        ✕
      </button>
    </div>
  )
}
