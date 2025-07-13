"use client"
 
import { useState, useEffect } from "react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "../lib/firebase"
import { useAuth } from "../contexts/AuthContext"
import { useNavigate } from "react-router-dom"
import BarChart from "./charts/BarChart"
import PieChart from "./charts/PieChart"
import { StatCardSkeleton, ChartSkeleton } from "./SkeletonLoader"

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  
  // State for project and step selection
  const [selectedProjectId, setSelectedProjectId] = useState("")
  const [selectedStep, setSelectedStep] = useState("")
  const [stepOptions, setStepOptions] = useState([])
  const [jobCount, setJobCount] = useState(null)

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

  // Helper to check if a job is completed (status or all sub-jobs' steps)
  const isJobCompleted = (job) => {
    if (Array.isArray(job.subJobs) && job.subJobs.length > 0) {
      return job.subJobs.every(
        (sub) => Array.isArray(sub.steps) && sub.steps.length > 0 && sub.steps.every((s) => s.completed)
      )
    }
    return job.status === "completed"
  }

  // Helper to check if a job is in progress (any sub-job step is completed, but not all)
  const isJobInProgress = (job) => {
    if (Array.isArray(job.subJobs) && job.subJobs.length > 0) {
      const allCompleted = isJobCompleted(job)
      const anyStep = job.subJobs.some(
        (sub) => Array.isArray(sub.steps) && sub.steps.some((s) => s.completed)
      )
      return anyStep && !allCompleted
    }
    return job.status === "in-progress"
  }

  // Helper to check if a job is pending (no steps completed)
  const isJobPending = (job) => {
    if (Array.isArray(job.subJobs) && job.subJobs.length > 0) {
      const anyStep = job.subJobs.some(
        (sub) => Array.isArray(sub.steps) && sub.steps.some((s) => s.completed)
      )
      return !anyStep
    }
    return job.status === "pending"
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

  // Update steps when project changes
  useEffect(() => {
    console.log("Selected Project ID:", selectedProjectId);
    if (!selectedProjectId) {
      setStepOptions([]);
      setSelectedStep("");
      return;
    }
    
    // Find all steps in jobs for selected project
    const projectJobs = jobs.filter(job => job.projectId === selectedProjectId);
    console.log("Project Jobs:", projectJobs);

    const stepsSet = new Set();
    projectJobs.forEach(job => {
      console.log("Processing job:", job);
      if (job.steps && Array.isArray(job.steps)) {
        // Direct steps on job
        job.steps.forEach(step => {
          if (step.name) stepsSet.add(step.name);
        });
      }
      // Steps in subJobs
      if (Array.isArray(job.subJobs)) {
        job.subJobs.forEach(sub => {
          if (Array.isArray(sub.steps)) {
            sub.steps.forEach(step => {
              if (step.name) stepsSet.add(step.name);
            });
          }
        });
      }
    });
    
    const steps = Array.from(stepsSet);
    console.log("Found steps:", steps);
    setStepOptions(steps);
    setSelectedStep("");
  }, [selectedProjectId, jobs]);

  // Handler for showing job count
  const handleShowJobCount = () => {
    if (!selectedProjectId || !selectedStep) {
      setJobCount(null);
      return;
    }
    // Count jobs in selected project where selected step is completed
    const projectJobs = jobs.filter(job => job.projectId === selectedProjectId);
    let completedCount = 0;
    let totalCount = 0;
    
    projectJobs.forEach(job => {
      if (Array.isArray(job.subJobs)) {
        job.subJobs.forEach(sub => {
          if (Array.isArray(sub.steps)) {
            const stepObj = sub.steps.find(step => step.name === selectedStep);
            if (stepObj) {
              totalCount++;
              if (stepObj.completed) {
                completedCount++;
              }
            }
          }
        });
      }
    });
    setJobCount({ completed: completedCount, total: totalCount });
  };

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
  const completedJobs = jobs.filter(isJobCompleted).length
  const inProgressJobs = jobs.filter(isJobInProgress).length
  const pendingJobs = jobs.filter(isJobPending).length

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
        <div 
          className="stat-card stat-card-primary cursor-pointer hover:shadow-lg transition-all"
          onClick={() => navigate('/projects')}
          role="button"
          title="Go to Projects"
        >
          <div className="stat-icon">📁</div>
          <div className="stat-content">
            <div className="stat-number">{projects.length}</div>
            <div className="stat-label">Total Projects</div>
          </div>
        </div>

        {/* <div className="stat-card stat-card-success">
          <div className="stat-icon">⚡</div>
          <div className="stat-content">
            <div className="stat-number">{totalJobs}</div>
            <div className="stat-label">Total Jobs</div>
          </div>
        </div> */}

        {/* <div className="stat-card stat-card-completed">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-number">{completedJobs}</div>
            <div className="stat-label">Completed Jobs</div>
          </div>
        </div> */}

        {/* <div className="stat-card stat-card-progress">
          <div className="stat-icon">🔄</div>
          <div className="stat-content">
            <div className="stat-number">{inProgressJobs}</div>
            <div className="stat-label">In Progress</div>
          </div>
        </div> */}
      </div>

      {/* Project & Step Selection */}
      <div className="activity-section" style={{ marginBottom: "2rem" }}>
        <div className="activity-header">
          <h3>🔎 Job Completion by Project & Step</h3>
          <p>Select a project and step to see how many jobs are completed.</p>
        </div>
        <div className="filters-row" style={{ padding: "1.5rem" }}>
          <div className="filter-group">
            <label htmlFor="project-select">Project</label>
            <select
              id="project-select"
              value={selectedProjectId}
              onChange={(e) => {
                console.log("Selected project:", e.target.value);
                setSelectedProjectId(e.target.value);
              }}
              required
              className="form-group"
              style={{ minWidth: "180px" }}
            >
              <option value="">Select Project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label htmlFor="step-select">Step</label>
            <select
              id="step-select"
              value={selectedStep}
              onChange={(e) => setSelectedStep(e.target.value)}
              required
              className="form-group"
              style={{ minWidth: "180px" }}
              disabled={!selectedProjectId}
            >
              {!selectedProjectId ? (
                <option value="">Select a project first</option>
              ) : stepOptions.length === 0 ? (
                <option value="">No steps found</option>
              ) : (
                <>
                  <option value="">Select Step</option>
                  {stepOptions.map((step, idx) => (
                    <option key={idx} value={step}>
                      {step}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleShowJobCount}
            disabled={!selectedProjectId || !selectedStep}
            style={{ marginTop: "24px" }}
          >
            Show Completed Jobs
          </button>
          {jobCount !== null && (
            <div style={{ marginLeft: "16px", fontWeight: 600, fontSize: "1.1rem" }}>
              <span style={{ color: "var(--success-color)" }}>
                Completed Jobs: {jobCount.completed} / {jobCount.total}
              </span>
              {jobCount.total > 0 && (
                <span style={{ marginLeft: "8px", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                  ({Math.round((jobCount.completed / jobCount.total) * 100)}%)
                </span>
              )}
            </div>
          )}
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
