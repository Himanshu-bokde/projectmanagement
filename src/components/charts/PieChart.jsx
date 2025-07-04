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
    // Track label positions to avoid overlap
    const labelPositions = []

    // For leader lines and label collision avoidance
    const leftLabels = []
    const rightLabels = []
    const leaderLineLength = 30
    const labelMargin = 10
    const minLabelSpacing = 22

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
      currentAngle += sliceAngle
    })

    // Draw labels and leader lines
    currentAngle = -Math.PI / 2
    data.forEach((item, index) => {
      const sliceAngle = (item.value / total) * 2 * Math.PI
      const labelAngle = currentAngle + sliceAngle / 2
      const isRight = Math.cos(labelAngle) >= 0
      const baseRadius = radius + leaderLineLength
      let labelX = centerX + Math.cos(labelAngle) * baseRadius
      let labelY = centerY + Math.sin(labelAngle) * baseRadius
      // Store for collision avoidance
      if (isRight) {
        rightLabels.push({ index, labelAngle, labelX, labelY, item })
      } else {
        leftLabels.push({ index, labelAngle, labelX, labelY, item })
      }
      currentAngle += sliceAngle
    })

    // Helper to space labels vertically
    function spaceLabels(labels, isRight) {
      labels.sort((a, b) => a.labelY - b.labelY)
      for (let i = 1; i < labels.length; i++) {
        if (labels[i].labelY - labels[i - 1].labelY < minLabelSpacing) {
          labels[i].labelY = labels[i - 1].labelY + minLabelSpacing
        }
      }
      // Clamp to canvas
      labels.forEach(l => {
        if (l.labelY < labelMargin) l.labelY = labelMargin
        if (l.labelY > height - labelMargin) l.labelY = height - labelMargin
        // Move labelX further out for left/right
        l.labelX = isRight
          ? centerX + radius + leaderLineLength + 40
          : centerX - radius - leaderLineLength - 40
      })
    }
    spaceLabels(leftLabels, false)
    spaceLabels(rightLabels, true)

    // Draw labels (no leader lines)
    function drawLabel(label) {
      const { labelX, labelY, item } = label
      // Draw label
      ctx.save()
      ctx.font = "bold 13px Arial"
      ctx.textAlign = labelX > centerX ? "left" : "right"
      ctx.textBaseline = "middle"
      ctx.fillStyle = "#22223b"
      ctx.shadowColor = "#fff"
      ctx.shadowBlur = 2
      // Abbreviate long status names for better fit
      let labelName = item.name
      if (labelName.toLowerCase() === "completed") labelName = "Complet"
      if (labelName.toLowerCase() === "inprogress" || labelName.toLowerCase() === "in progress") labelName = "InProg"
      if (labelName.toLowerCase() === "pending") labelName = "Pend"
      ctx.fillText(`${labelName}: ${item.value}`, labelX, labelY)
      ctx.restore()
    }
    leftLabels.forEach(drawLabel)
    rightLabels.forEach(drawLabel)
  }, [data])

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <canvas ref={canvasRef} width={400} height={400} className="chart-canvas" />
      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 16, marginTop: 16 }}>
        {data.map((item, idx) => (
          <div key={idx} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14 }}>
            <span style={{
              display: "inline-block",
              width: 16,
              height: 16,
              borderRadius: 4,
              background: item.color,
              marginRight: 6,
              border: "1px solid #ccc"
            }}></span>
            <span style={{ fontWeight: 600 }}>{item.name}</span>
            <span style={{ color: "#666", marginLeft: 4 }}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
