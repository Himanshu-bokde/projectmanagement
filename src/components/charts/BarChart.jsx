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

    // Draw bars
    data.forEach((item, index) => {
      const x = padding + index * (chartWidth / data.length) + 10
      const barHeight = (item.completed / maxValue) * chartHeight
      const y = height - padding - barHeight

      // Draw completed bar
      ctx.fillStyle = "#10b981"
      ctx.fillRect(x, y, barWidth, barHeight)

      // Draw total bar outline
      const totalBarHeight = (item.total / maxValue) * chartHeight
      const totalY = height - padding - totalBarHeight
      ctx.strokeStyle = "#6b7280"
      ctx.lineWidth = 2
      ctx.strokeRect(x, totalY, barWidth, totalBarHeight)

      // Draw labels
      ctx.fillStyle = "#374151"
      ctx.font = "12px Arial"
      ctx.textAlign = "center"
      ctx.fillText(item.name, x + barWidth / 2, height - padding + 20)
      ctx.fillText(`${item.completed}/${item.total}`, x + barWidth / 2, height - padding + 35)
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

  return <canvas ref={canvasRef} width={600} height={400} className="chart-canvas" />
}
