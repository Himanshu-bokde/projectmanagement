"use client"

import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"

export default function DynamicAuthForm({ config, mode }) {
  const { login, signup } = useAuth()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({})
  const [errors, setErrors] = useState({})
  const [showPasswords, setShowPasswords] = useState({})
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState("")

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field.name]: value }))

    // Clear error when user starts typing
    if (errors[field.name]) {
      setErrors((prev) => ({ ...prev, [field.name]: "" }))
    }
  }

  const validateField = (field, value) => {
    if (field.required && !value.trim()) {
      return `${field.label} is required`
    }

    if (field.validation) {
      const { minLength, maxLength, pattern, message } = field.validation

      if (minLength && value.length < minLength) {
        return message || `${field.label} must be at least ${minLength} characters`
      }

      if (maxLength && value.length > maxLength) {
        return message || `${field.label} must be no more than ${maxLength} characters`
      }

      if (pattern && !new RegExp(pattern).test(value)) {
        return message || `${field.label} format is invalid`
      }
    }

    // Special validation for confirm password
    if (field.name === "confirmPassword" && formData.password !== value) {
      return "Passwords do not match"
    }

    return ""
  }

  const validateForm = () => {
    const newErrors = {}
    let isValid = true

    config.fields.forEach((field) => {
      const value = formData[field.name] || ""
      const error = validateField(field, value)
      if (error) {
        newErrors[field.name] = error
        isValid = false
      }
    })

    setErrors(newErrors)
    return isValid
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitError("")

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      if (mode === "login") {
        await login(formData.email, formData.password)
      } else {
        await signup(formData.email, formData.password, formData.displayName)
      }
      navigate("/dashboard")
    } catch (error) {
      setSubmitError(error.message || "An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const togglePasswordVisibility = (fieldName) => {
    setShowPasswords((prev) => ({ ...prev, [fieldName]: !prev[fieldName] }))
  }

  const renderField = (field) => {
    const isPasswordField = field.type === "password"
    const showPassword = showPasswords[field.name]
    const inputType = isPasswordField && showPassword ? "text" : field.type

    return (
      <div key={field.id} className="form-group">
        <label htmlFor={field.id} className="form-label">
          {field.label}
        </label>
        <div className="input-container">
          <input
            id={field.id}
            name={field.name}
            type={inputType}
            placeholder={field.placeholder}
            value={formData[field.name] || ""}
            onChange={(e) => handleInputChange(field, e.target.value)}
            className={`form-input ${errors[field.name] ? "error" : ""}`}
            required={field.required}
          />
          {isPasswordField && (
            <button type="button" className="password-toggle" onClick={() => togglePasswordVisibility(field.name)}>
              {showPassword ? "👁️" : "👁️‍🗨️"}
            </button>
          )}
        </div>
        {errors[field.name] && <p className="error-message">{errors[field.name]}</p>}
      </div>
    )
  }

  return (
    <div className="auth-card">
      <div className="auth-header">
        <h1 className="auth-title">{config.title}</h1>
        <p className="auth-subtitle">{config.subtitle}</p>
      </div>
      <div className="auth-content">
        <form onSubmit={handleSubmit} className="auth-form">
          {config.fields.map(renderField)}

          {submitError && <div className="alert alert-error">{submitError}</div>}

          <button type="submit" className="submit-button" disabled={loading}>
            {loading && <span className="spinner">⏳</span>}
            {config.submitText}
          </button>
        </form>

        <div className="auth-alternative">
          {config.alternativeText}{" "}
          <Link to={config.alternativeLink} className="auth-link">
            {config.alternativeLinkText}
          </Link>
        </div>
      </div>
    </div>
  )
}
