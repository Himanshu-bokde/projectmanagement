"use client"

import { useState, useEffect } from "react"

export default function Toast({ message, type = "success", duration = 3000, onClose }) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onClose, 300) // Wait for fade out animation
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const getIcon = () => {
    switch (type) {
      case "success":
        return "✅"
      case "error":
        return "❌"
      case "warning":
        return "⚠️"
      case "info":
        return "ℹ️"
      default:
        return "✅"
    }
  }

  return (
    <div className={`toast toast-${type} ${isVisible ? "toast-visible" : "toast-hidden"}`}>
      <span className="toast-icon">{getIcon()}</span>
      <span className="toast-message">{message}</span>
      <button onClick={() => setIsVisible(false)} className="toast-close">
        ✕
      </button>
    </div>
  )
}
