"use client"

import { createContext, useContext, useState } from "react"
import LoadingSpinner from "../components/LoadingSpinner"

const LoadingContext = createContext()

export function useLoading() {
  const context = useContext(LoadingContext)
  if (!context) {
    throw new Error("useLoading must be used within a LoadingProvider")
  }
  return context
}

export function LoadingProvider({ children }) {
  const [isLoading, setIsLoading] = useState(false)
  const [loadingText, setLoadingText] = useState("Loading...")

  const showLoading = (text = "Loading...") => {
    setLoadingText(text)
    setIsLoading(true)
  }

  const hideLoading = () => {
    setIsLoading(false)
  }

  return (
    <LoadingContext.Provider value={{ isLoading, showLoading, hideLoading, loadingText }}>
      {children}
      {isLoading && (
        <div className="global-loading-overlay">
          <LoadingSpinner size="large" text={loadingText} />
        </div>
      )}
    </LoadingContext.Provider>
  )
}
