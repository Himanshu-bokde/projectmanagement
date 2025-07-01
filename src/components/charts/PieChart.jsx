"use client"

import { useEffect, useRef } from "react"

export default function PieChart({ data }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!data || data.length === 0) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    const { width, height } = canvas

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    const centerX = width / 2
    const centerY = height / 2
    const radius = Math.min(width, height) / 2 - 40

    const total = data.reduce((sum, item) => sum + item.value, 0)
    if (total === 0) return

    let currentAngle = -Math.PI / 2

    // Draw pie slices
    data.forEach((item, index) => {
      const sliceAngle = (item.value / total) * 2 * Math.PI

      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle)
      ctx.closePath()
      ctx.fillStyle = item.color
      ctx.fill()
      ctx.strokeStyle = "#ffffff"
      ctx.lineWidth = 2
      ctx.stroke()

      // Draw labels further out and avoid overlap for small slices
      const labelAngle = currentAngle + sliceAngle / 2
      let labelRadius = radius + 40 // increased from 20 to 40
      let labelX = centerX + Math.cos(labelAngle) * labelRadius
      let labelY = centerY + Math.sin(labelAngle) * labelRadius
      const percent = item.value / total

      // Clamp label positions to stay within canvas
      const margin = 20
      labelX = Math.max(margin, Math.min(width - margin, labelX))
      labelY = Math.max(margin, Math.min(height - margin, labelY))

      ctx.fillStyle = "#374151"
      ctx.font = "12px Arial"
      ctx.textAlign = "center"
      // Abbreviate long status names for better fit
      let labelName = item.name
      if (labelName.toLowerCase() === "inprogress" || labelName.toLowerCase() === "in progress") labelName = "InProg"
      if (labelName.toLowerCase() === "pending") labelName = "Pend"

      if (percent > 0.12) {
        ctx.fillText(`${labelName}`, labelX, labelY)
        ctx.fillText(`${item.value}`, labelX, labelY + 15)
      } else {
        ctx.fillText(`${item.value}`, labelX, labelY)
      }

      currentAngle += sliceAngle
    })
  }, [data])

  return <canvas ref={canvasRef} width={400} height={400} className="chart-canvas" />
}
