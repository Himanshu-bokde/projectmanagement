"use client"

import { useEffect, useRef } from "react"

export default function BarChart({ data }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!data || data.length === 0) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    const { width, height } = canvas

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Chart settings
    const padding = 60
    const chartWidth = width - 2 * padding
    const chartHeight = height - 2 * padding
    const barWidth = chartWidth / data.length - 20
    const maxValue = Math.max(...data.map((d) => d.total)) || 1

    // Detect theme for label color
    const isDark = document.body.classList.contains('dark')
    const labelColor = isDark ? '#fff' : '#000'
    const valueColor = isDark ? '#fff' : '#000'

    // Draw bars
    data.forEach((item, index) => {
      const x = padding + index * (chartWidth / data.length) + 10
      const barWidth = (chartWidth / data.length) - 20
      const stackY = height - padding

      // Calculate heights
      const maxHeight = item.total || 1
      const completedHeight = (item.completed / maxHeight) * chartHeight
      const inProgressHeight = (item.inProgress / maxHeight) * chartHeight
      const pendingHeight = (item.pending / maxHeight) * chartHeight

      // Draw stacked bars
      // Pending
      ctx.fillStyle = item.colors.pending
      ctx.fillRect(x, stackY - pendingHeight, barWidth, pendingHeight)

      // In Progress
      ctx.fillStyle = item.colors.inProgress
      ctx.fillRect(x, stackY - pendingHeight - inProgressHeight, barWidth, inProgressHeight)

      // Completed
      ctx.fillStyle = item.colors.completed
      ctx.fillRect(x, stackY - pendingHeight - inProgressHeight - completedHeight, barWidth, completedHeight)

      // Draw outline
      ctx.strokeStyle = "#6b7280"
      ctx.lineWidth = 1
      ctx.strokeRect(x, stackY - (pendingHeight + inProgressHeight + completedHeight), barWidth, pendingHeight + inProgressHeight + completedHeight)

      // Draw project name label
      ctx.save()
      ctx.fillStyle = labelColor
      ctx.font = "bold 16px Arial"
      ctx.textAlign = "center"
      ctx.fillText(item.name, x + barWidth / 2, height - padding + 24)
      ctx.restore()

      // Draw quantity breakdown
      ctx.save()
      ctx.fillStyle = valueColor
      ctx.font = "bold 14px Arial"
      ctx.textAlign = "center"
      const totalQuantity = item.total || 0
      const breakdownText = `${item.completed}/${totalQuantity}`
      const percentText = totalQuantity > 0 ? ` (${Math.round((item.completed/totalQuantity)*100)}%)` : " (0%)"
      ctx.fillText(breakdownText + percentText, x + barWidth / 2, height - padding + 44)
      ctx.restore()

      // Legend was removed as it's now shown below the chart
    })

    // Draw axes
    ctx.strokeStyle = "#6b7280"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(padding, padding)
    ctx.lineTo(padding, height - padding)
    ctx.lineTo(width - padding, height - padding)
    ctx.stroke()
  }, [data])

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <canvas ref={canvasRef} width={600} height={400} className="chart-canvas" />
      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 16, marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14 }}>
          <span style={{
            display: "inline-block",
            width: 16,
            height: 16,
            borderRadius: 4,
            background: "#10b981",
            marginRight: 6,
            border: "1px solid #ccc"
          }}></span>
          <span style={{ fontWeight: 600 }}>Completed</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14 }}>
          <span style={{
            display: "inline-block",
            width: 16,
            height: 16,
            borderRadius: 4,
            background: "#f59e0b",
            marginRight: 6,
            border: "1px solid #ccc"
          }}></span>
          <span style={{ fontWeight: 600 }}>In Progress</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14 }}>
          <span style={{
            display: "inline-block",
            width: 16,
            height: 16,
            borderRadius: 4,
            background: "#ef4444",
            marginRight: 6,
            border: "1px solid #ccc"
          }}></span>
          <span style={{ fontWeight: 600 }}>Pending</span>
        </div>
      </div>
    </div>
  )
}
