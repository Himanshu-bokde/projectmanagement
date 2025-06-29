"use client"

export function ProjectCardSkeleton() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-header">
        <div className="skeleton-title"></div>
        <div className="skeleton-button"></div>
      </div>
      <div className="skeleton-text"></div>
      <div className="skeleton-text short"></div>
      <div className="skeleton-dates">
        <div className="skeleton-date"></div>
        <div className="skeleton-date"></div>
      </div>
      <div className="skeleton-button-full"></div>
    </div>
  )
}

export function JobRowSkeleton() {
  return (
    <tr className="skeleton-row">
      <td>
        <div className="skeleton-cell"></div>
      </td>
      <td>
        <div className="skeleton-cell short"></div>
      </td>
      <td>
        <div className="skeleton-cell short"></div>
      </td>
      <td>
        <div className="skeleton-cell short"></div>
      </td>
      <td>
        <div className="skeleton-badge"></div>
      </td>
      <td>
        <div className="skeleton-actions"></div>
      </td>
    </tr>
  )
}

export function StatCardSkeleton() {
  return (
    <div className="skeleton-stat-card">
      <div className="skeleton-stat-title"></div>
      <div className="skeleton-stat-number"></div>
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div className="skeleton-chart">
      <div className="skeleton-chart-title"></div>
      <div className="skeleton-chart-content"></div>
    </div>
  )
}
