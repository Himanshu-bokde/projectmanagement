"use client"

import { useState } from "react"

export default function EditableField({
  value,
  onSave,
  type = "text",
  placeholder = "",
  multiline = false,
  className = "",
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (editValue.trim() === value.trim()) {
      setIsEditing(false)
      return
    }

    setLoading(true)
    try {
      await onSave(editValue.trim())
      setIsEditing(false)
    } catch (error) {
      console.error("Error saving:", error)
      setEditValue(value) // Reset on error
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setEditValue(value)
    setIsEditing(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !multiline) {
      e.preventDefault()
      handleSave()
    } else if (e.key === "Escape") {
      handleCancel()
    }
  }

  if (isEditing) {
    return (
      <div className={`editable-field editing ${className}`}>
        {multiline ? (
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="editable-input"
            rows="3"
            disabled={loading}
            autoFocus
          />
        ) : (
          <input
            type={type}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="editable-input"
            disabled={loading}
            autoFocus
          />
        )}
        <div className="editable-actions">
          <button onClick={handleSave} className="btn btn-sm btn-primary" disabled={loading}>
            {loading ? "⏳" : "✓"}
          </button>
          <button onClick={handleCancel} className="btn btn-sm btn-secondary" disabled={loading}>
            ✕
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`editable-field ${className}`}>
      <span className="editable-value">{value || placeholder}</span>
      <button onClick={() => setIsEditing(true)} className="editable-edit-btn" title="Click to edit">
        ✏️
      </button>
    </div>
  )
}
