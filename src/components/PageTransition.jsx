"use client"

import { useEffect, useState } from "react"

export default function PageTransition({ children }) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return <div className={`page-transition ${isVisible ? "page-enter-active" : "page-enter"}`}>{children}</div>
}
