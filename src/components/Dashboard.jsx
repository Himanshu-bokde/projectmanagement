"use client"

import { useState, useEffect } from "react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "../lib/firebase"
import { useAuth } from "../contexts/AuthContext"
import BarChart from "./charts/BarChart"
import PieChart from "./charts/PieChart"
import { StatCardSkeleton, ChartSkeleton } from "./SkeletonLoader"

export default function Dashboard() {
  const { user } = useAuth()
  const [projects, setProjects] = useState([])
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Move getProjectStatus function before useMemo
  const getProjectStatus = (project) => {
    if (!project.startDate || !project.endDate) return "active"

    const now = new Date()
    const start = new Date(project.startDate)
    const end = new Date(project.endDate)

    // Check for invalid dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return "active"

    if (start > now) return "upcoming"
    if (end < now) return "active"
    return "active"
  }

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  const fetchData = async () => {
    try {
      setError("")
      setLoading(true)

      // Fetch all projects
      const projectsSnapshot = await getDocs(collection(db, "projects"))
      const projectsData = projectsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))

      // Fetch all jobs
      const jobsSnapshot = await getDocs(collection(db, "jobs"))
      const jobsData = jobsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))

      console.log("jobsData",jobsData)

      setProjects(projectsData)
      setJobs(jobsData)
    } catch (error) {
      console.error("Error fetching data:", error)
      setError("Failed to load dashboard data. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const getProjectStats = () => {
    return projects.map((project) => {
      const projectJobs = jobs.filter((job) => job.projectId === project.id)
      const completedJobs = projectJobs.filter((job) => job.status === "completed").length
      const totalJobs = projectJobs.length
      const completionRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0

      return {
        name: project.name,
        completed: completedJobs,
        total: totalJobs,
        completionRate: Math.round(completionRate),
      }
    })
  }

  const getOverallStats = () => {
    const totalJobs = jobs.length
    const completedJobs = jobs.filter((job) => job.status === "completed").length
    const inProgressJobs = jobs.filter((job) => job.status === "in-progress").length
    const pendingJobs = jobs.filter((job) => job.status === "pending").length

    return [
      { name: "Completed", value: completedJobs, color: "#10b981" },
      { name: "In Progress", value: inProgressJobs, color: "#f59e0b" },
      { name: "Pending", value: pendingJobs, color: "#ef4444" },
    ]
  }

  const getRecentActivity = () => {
    // Get recent projects (last 5)
    const recentProjects = [...projects]
      .sort((a, b) => {
        const aDate = a.createdAt?.seconds ? new Date(a.createdAt.seconds * 1000) : new Date(a.createdAt || 0)
        const bDate = b.createdAt?.seconds ? new Date(b.createdAt.seconds * 1000) : new Date(b.createdAt || 0)
        return bDate - aDate
      })
      .slice(0, 5)

    return recentProjects
  }

  if (loading) {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <div className="dashboard-title-section">
            <div className="skeleton-title"></div>
            <div className="skeleton-subtitle"></div>
          </div>
        </div>

        <div className="stats-grid">
          {Array.from({ length: 4 }).map((_, index) => (
            <StatCardSkeleton key={index} />
          ))}
        </div>

        <div className="dashboard-content">
          <div className="charts-section">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard">
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h2>Unable to Load Dashboard</h2>
          <p>{error}</p>
          <button onClick={fetchData} className="btn btn-primary">
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const projectStats = getProjectStats()
  const overallStats = getOverallStats()
  const recentActivity = getRecentActivity()
  const totalJobs = jobs.length
  const completedJobs = jobs.filter((job) => job.status === "completed").length
  const inProgressJobs = jobs.filter((job) => job.status === "in-progress").length
  const pendingJobs = jobs.filter((job) => job.status === "pending").length

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="dashboard-title-section">
          <h1>📊 Dashboard</h1>
          <p>Welcome back, {user?.displayName || user?.email?.split("@")[0] || "User"}!</p>
        </div>
        <div className="dashboard-actions">
          <button onClick={fetchData} className="btn btn-secondary btn-sm" title="Refresh Data">
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="stats-grid">
        <div className="stat-card stat-card-primary">
          <div className="stat-icon">📁</div>
          <div className="stat-content">
            <div className="stat-number">{projects.length}</div>
            <div className="stat-label">Total Projects</div>
          </div>
        </div>

        <div className="stat-card stat-card-success">
          <div className="stat-icon">⚡</div>
          <div className="stat-content">
            <div className="stat-number">{totalJobs}</div>
            <div className="stat-label">Total Jobs</div>
          </div>
        </div>

        <div className="stat-card stat-card-completed">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-number">{completedJobs}</div>
            <div className="stat-label">Completed Jobs</div>
          </div>
        </div>

        <div className="stat-card stat-card-progress">
          <div className="stat-icon">🔄</div>
          <div className="stat-content">
            <div className="stat-number">{inProgressJobs}</div>
            <div className="stat-label">In Progress</div>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        {/* Charts Section */}
        <div className="charts-section">
          <div className="chart-container">
            <div className="chart-header">
              <h3>📊 Project Completion Progress</h3>
              <p>Track completion rates across all projects</p>
            </div>
            <div className="chart-wrapper">
              {projectStats.length > 0 ? (
                <BarChart data={projectStats} />
              ) : (
                <div className="chart-empty">
                  <p>No project data available</p>
                </div>
              )}
            </div>
          </div>

          <div className="chart-container">
            <div className="chart-header">
              <h3>🥧 Overall Job Status</h3>
              <p>Distribution of job statuses</p>
            </div>
            <div className="chart-wrapper">
              {overallStats.some((stat) => stat.value > 0) ? (
                <PieChart data={overallStats} />
              ) : (
                <div className="chart-empty">
                  <p>No job data available</p>
                </div>
              )}
            </div>
          </div>
        </div>

     
       
      </div>
    </div>
  )
}
