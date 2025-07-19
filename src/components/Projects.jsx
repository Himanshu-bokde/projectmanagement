"use client"

import { useState, useEffect, useMemo } from "react"
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, query, where } from "firebase/firestore"
import { db } from "../lib/firebase"
import { useAuth } from "../contexts/AuthContext"
import { Link } from "react-router-dom"
import { ProjectCardSkeleton } from "./SkeletonLoader"
import { sanitizeForFirestore, validateRequiredFields } from "../utils/firestoreUtils"
import FilterToast from "./FilterToast"
// import "../components.css"
export default function Projects() {
  const { user } = useAuth()
  const [projects, setProjects] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
  })
  const [loading, setLoading] = useState(true)
  const [editingProject, setEditingProject] = useState(null)
  const [editProject, setEditProject] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
  })

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")
  const [sortBy, setSortBy] = useState("name")
  const [sortOrder, setSortOrder] = useState("asc")
  const [showFilters, setShowFilters] = useState(false)

  const [toastMessage, setToastMessage] = useState("")
  const [showToast, setShowToast] = useState(false)
  const [error, setError] = useState("")

  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")

  const getProjectStatus = (project) => {
    if (!project.startDate || !project.endDate) return "active"

    const now = new Date()
    const start = new Date(project.startDate)
    const end = new Date(project.endDate)

    // Check for invalid dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return "active"

    if (start > now) return "upcoming"
    if (end < now) return "completed"
    return "active"
  }

  useEffect(() => {
    fetchProjects()
  }, [user])

  // Helper to calculate totals for each project
  const getProjectTotals = async (projectId) => {
    const jobsQuery = query(collection(db, "jobs"), where("projectId", "==", projectId))
    const jobsSnapshot = await getDocs(jobsQuery)
    let totalWeight = 0
    let totalQty = 0
    let totalJobs = jobsSnapshot.size
    jobsSnapshot.forEach((doc) => {
      const job = doc.data()
      totalWeight += Number(job.totalWeight || 0)
      totalQty += Number(job.quantity || 0)
    })
    return { totalWeight, totalQty, totalJobs }
  }

  // Fetch projects and attach totals
  const fetchProjects = async () => {
    try {
      setError("")
      console.log("Fetching projects...")

      const querySnapshot = await getDocs(collection(db, "projects"))
      console.log("Query snapshot size:", querySnapshot.size)

      const projectsData = await Promise.all(
        querySnapshot.docs.map(async (doc) => {
          const data = doc.data()
          const { totalWeight, totalQty, totalJobs } = await getProjectTotals(doc.id)
          return {
            id: doc.id,
            ...data,
            totalWeight,
            totalQty,
            totalJobs,
          }
        }),
      )

      console.log("Total projects fetched:", projectsData.length)
      setProjects(projectsData)
    } catch (error) {
      console.error("Error fetching projects:", error)
      setError("Failed to load projects: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Advanced filtering and searching
  const filteredAndSortedProjects = useMemo(() => {
    console.log("Filtering projects. Total projects:", projects.length)
    console.log("Search term:", searchTerm)
    console.log("Status filter:", statusFilter)
    console.log("Date filter:", dateFilter)

    const filtered = projects.filter((project) => {
      // Text search
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch =
        !searchTerm ||
        project.name.toLowerCase().includes(searchLower) ||
        (project.description && project.description.toLowerCase().includes(searchLower)) ||
        (project.userId && project.userId.toLowerCase().includes(searchLower))

      // Status filter - get current project status
      const projectStatus = getProjectStatus(project)
      const matchesStatus = statusFilter === "all" || projectStatus === statusFilter

      // Date filter
      let matchesDate = true
      if (dateFilter !== "all") {
        const now = new Date()
        const projectStart = project.startDate ? new Date(project.startDate) : null
        const projectEnd = project.endDate ? new Date(project.endDate) : null

        switch (dateFilter) {
          case "active":
            matchesDate = projectStart && projectEnd && projectStart <= now && projectEnd >= now
            break
          case "upcoming":
            matchesDate = projectStart && projectStart > now
            break
          case "completed":
            matchesDate = projectEnd && projectEnd < now
            break
          case "this-month":
            const thisMonth = now.getMonth()
            const thisYear = now.getFullYear()
            matchesDate =
              (projectStart && projectStart.getMonth() === thisMonth && projectStart.getFullYear() === thisYear) ||
              (projectEnd && projectEnd.getMonth() === thisMonth && projectEnd.getFullYear() === thisYear)
            break
          case "this-year":
            const currentYear = now.getFullYear()
            matchesDate =
              (projectStart && projectStart.getFullYear() === currentYear) ||
              (projectEnd && projectEnd.getFullYear() === currentYear)
            break
          default:
            matchesDate = true
        }
      }

      // Custom date range filter
      let matchesCustomDate = true
      if (customStartDate && customEndDate) {
        const projectStart = project.startDate ? new Date(project.startDate) : null
        const projectEnd = project.endDate ? new Date(project.endDate) : null
        const filterStart = new Date(customStartDate)
        const filterEnd = new Date(customEndDate)
        // Check for overlap
        matchesCustomDate =
          projectStart && projectEnd &&
          projectEnd >= filterStart &&
          projectStart <= filterEnd
      }

      const result = matchesSearch && matchesStatus && matchesDate && matchesCustomDate
      console.log(
        `Project ${project.name}: search=${matchesSearch}, status=${matchesStatus}, date=${matchesDate}, result=${result}`,
      )
      return result
    })

    console.log("Filtered projects count:", filtered.length)

    // Sorting
    filtered.sort((a, b) => {
      let aValue, bValue

      switch (sortBy) {
        case "name":
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case "startDate":
          aValue = a.startDate ? new Date(a.startDate) : new Date(0)
          bValue = b.startDate ? new Date(b.startDate) : new Date(0)
          break
        case "endDate":
          aValue = a.endDate ? new Date(a.endDate) : new Date(0)
          bValue = b.endDate ? new Date(b.endDate) : new Date(0)
          break
        case "createdAt":
          aValue = a.createdAt
            ? a.createdAt.seconds
              ? new Date(a.createdAt.seconds * 1000)
              : new Date(a.createdAt)
            : new Date(0)
          bValue = b.createdAt
            ? b.createdAt.seconds
              ? new Date(b.createdAt.seconds * 1000)
              : new Date(b.createdAt)
            : new Date(0)
          break
        case "status":
          aValue = getProjectStatus(a)
          bValue = getProjectStatus(b)
          break
        default:
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1
      return 0
    })

    return filtered
  }, [projects, searchTerm, statusFilter, dateFilter, sortBy, sortOrder, customStartDate, customEndDate])

  const handleCreateProject = async (e) => {
    e.preventDefault()

    const { isValid, errors } = validateRequiredFields(newProject, ["name"])
    if (!isValid) {
      console.error("Validation errors:", errors)
      setError("Please fill in all required fields")
      return
    }

    try {
      const projectData = sanitizeForFirestore(
        {
          ...newProject,
          userId: user.uid,
          createdAt: new Date(),
          status: "active",
        },
        ["startDate", "endDate", "description"],
      )

      console.log("Creating project with data:", projectData)
      await addDoc(collection(db, "projects"), projectData)
      setNewProject({ name: "", description: "", startDate: "", endDate: "" })
      setShowModal(false)
      showFilterToast("Project created successfully!", "success")
      fetchProjects()
    } catch (error) {
      console.error("Error creating project:", error)
      setError("Failed to create project: " + error.message)
    }
  }


const handleDeleteProject = async (projectId) => {
  if (window.confirm("Are you sure you want to delete this project and all its jobs?")) {
    try {
      const jobsQuery = query(collection(db, "jobs"), where("projectId", "==", projectId))
      const jobsSnapshot = await getDocs(jobsQuery)

      const deletePromises = jobsSnapshot.docs.map((jobDoc) => deleteDoc(doc(db, "jobs", jobDoc.id)))
      await Promise.all(deletePromises)

      // Step 2: Delete the project itself
      await deleteDoc(doc(db, "projects", projectId))

      showFilterToast("Project and its jobs deleted successfully!", "success")
      fetchProjects()
    } catch (error) {
      console.error("Error deleting project and jobs:", error)
      setError("Failed to delete project: " + error.message)
    }
  }
}

  const handleEditProject = (project) => {
    setEditProject({
      name: project.name,
      description: project.description || "",
      startDate: project.startDate || "",
      endDate: project.endDate || "",
    })
    setEditingProject(project.id)
  }

  const handleUpdateProject = async (e) => {
    e.preventDefault()

    const { isValid, errors } = validateRequiredFields(editProject, ["name"])
    if (!isValid) {
      console.error("Validation errors:", errors)
      setError("Please fill in all required fields")
      return
    }

    try {
      const projectData = sanitizeForFirestore(
        {
          ...editProject,
          updatedAt: new Date(),
        },
        ["startDate", "endDate", "description"],
      )

      await updateDoc(doc(db, "projects", editingProject), projectData)
      setEditProject({ name: "", description: "", startDate: "", endDate: "" })
      setEditingProject(null)
      showFilterToast("Project updated successfully!", "success")
      fetchProjects()
    } catch (error) {
      console.error("Error updating project:", error)
      setError("Failed to update project: " + error.message)
    }
  }

  const cancelEdit = () => {
    setEditingProject(null)
    setEditProject({ name: "", description: "", startDate: "", endDate: "" })
  }

  const clearFilters = () => {
    setSearchTerm("")
    setStatusFilter("all")
    setDateFilter("all")
    setSortBy("name")
    setSortOrder("asc")
    setShowFilters(false)
    setCustomStartDate("")
    setCustomEndDate("")
    showFilterToast("All filters cleared", "info")
  }

  const showFilterToast = (message, type = "info") => {
    setToastMessage(message)
    setShowToast(true)
  }

  if (loading) {
    return (
      <div className="projects">
        <div className="projects-header">
          <h1>📁 Projects</h1>
          <button className="btn btn-primary" disabled>
            ➕ Create Project
          </button>
        </div>
        <div className="search-filters-skeleton">
          <div className="skeleton-button" style={{ width: "300px", height: "2.5rem" }}></div>
          <div className="skeleton-button" style={{ width: "120px", height: "2.5rem" }}></div>
        </div>
        <div className="projects-grid">
          {Array.from({ length: 6 }).map((_, index) => (
            <ProjectCardSkeleton key={index} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="projects">
      <div className="projects-header">
        <h1>📁 Projects ({projects.length} total)</h1>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          ➕ Create Project
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError("")} style={{ marginLeft: "10px" }}>
            ✕
          </button>
        </div>
      )}

      {/* Search and Filter Section */}
      <div className="search-filters-section">
        <div className="search-bar">
          <div className="search-input-container">
            <input
              type="text"
              placeholder="🔍 Search projects by name, description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input-main"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} className="search-clear-btn">
                ✕
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`filter-toggle-btn ${showFilters ? "active" : ""}`}
          >
            🔧 Filters {showFilters ? "▲" : "▼"}
          </button>
        </div>

        {showFilters && (
          <div className="filters-panel">
            <div className="filters-row">
              <div className="filter-group">
                <label>Status</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              {/* <div className="filter-group">
                <label>Date Range</label>
                <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
                  <option value="all">All Dates</option>
                  <option value="active">Currently Active</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="completed">Completed</option>
                  <option value="this-month">This Month</option>
                  <option value="this-year">This Year</option>
                </select>
              </div> */}

              <div className="filter-group">
                <label>Sort By</label>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="name">Name</option>
                  <option value="startDate">Start Date</option>
                  <option value="endDate">End Date</option>
                  <option value="createdAt">Created Date</option>
                  <option value="status">Status</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Order</label>
                <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </div>
            </div>

            <div className="filters-row">
              <div className="filter-group">
                <label>Custom Date Range</label>
                <div className="date-range-row" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={e => setCustomStartDate(e.target.value)}
                    style={{ minWidth: 0 }}
                  />
                  <span>to</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={e => setCustomEndDate(e.target.value)}
                    style={{ minWidth: 0 }}
                  />
                  {(customStartDate || customEndDate) && (
                    <button type="button" className="btn btn-sm btn-secondary" onClick={() => { setCustomStartDate(""); setCustomEndDate(""); }}>
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="filters-actions">
              <button onClick={clearFilters} className="btn btn-secondary btn-sm">
                Clear All Filters
              </button>
              <span className="results-count">
                {filteredAndSortedProjects.length} of {projects.length} projects
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Filter Chips */}
      <div className="quick-filters">
        <button
          onClick={() => {
            const newStatus = statusFilter === "active" ? "all" : "active"
            setStatusFilter(newStatus)
            const activeCount = projects.filter((p) => getProjectStatus(p) === "active").length
            showFilterToast(
              newStatus === "all" ? "Showing all projects" : `Showing ${activeCount} active projects`,
              "success",
            )
          }}
          className={`filter-chip ${statusFilter === "active" ? "active" : ""}`}
        >
          🟢 Active ({projects.filter((p) => getProjectStatus(p) === "active").length})
        </button>
        <button
          onClick={() => {
            const newStatus = statusFilter === "upcoming" ? "all" : "upcoming"
            setStatusFilter(newStatus)
            const upcomingCount = projects.filter((p) => getProjectStatus(p) === "upcoming").length
            showFilterToast(
              newStatus === "all" ? "Showing all projects" : `Showing ${upcomingCount} upcoming projects`,
              "success",
            )
          }}
          className={`filter-chip ${statusFilter === "upcoming" ? "active" : ""}`}
        >
          🔵 Upcoming ({projects.filter((p) => getProjectStatus(p) === "upcoming").length})
        </button>
        <button
          onClick={() => {
            const newStatus = statusFilter === "completed" ? "all" : "completed"
            setStatusFilter(newStatus)
            const completedCount = projects.filter((p) => getProjectStatus(p) === "completed").length
            showFilterToast(
              newStatus === "all" ? "Showing all projects" : `Showing ${completedCount} completed projects`,
              "success",
            )
          }}
          className={`filter-chip ${statusFilter === "completed" ? "active" : ""}`}
        >
          ✅ Completed ({projects.filter((p) => getProjectStatus(p) === "completed").length})
        </button>
        <button
          onClick={() => {
            const newDateFilter = dateFilter === "this-month" ? "all" : "this-month"
            setDateFilter(newDateFilter)
            const thisMonthCount = projects.filter((p) => {
              const now = new Date()
              const thisMonth = now.getMonth()
              const thisYear = now.getFullYear()
              const projectStart = p.startDate ? new Date(p.startDate) : null
              const projectEnd = p.endDate ? new Date(p.endDate) : null
              return (
                (projectStart && projectStart.getMonth() === thisMonth && projectStart.getFullYear() === thisYear) ||
                (projectEnd && projectEnd.getMonth() === thisMonth && projectEnd.getFullYear() === thisYear)
              )
            }).length
            showFilterToast(
              newDateFilter === "all" ? "Showing all dates" : `Showing ${thisMonthCount} projects from this month`,
              "success",
            )
          }}
          className={`filter-chip ${dateFilter === "this-month" ? "active" : ""}`}
        >
          📅 This Month (
          {
            projects.filter((p) => {
              const now = new Date()
              const thisMonth = now.getMonth()
              const thisYear = now.getFullYear()
              const projectStart = p.startDate ? new Date(p.startDate) : null
              const projectEnd = p.endDate ? new Date(p.endDate) : null
              return (
                (projectStart && projectStart.getMonth() === thisMonth && projectStart.getFullYear() === thisYear) ||
                (projectEnd && projectEnd.getMonth() === thisMonth && projectEnd.getFullYear() === thisYear)
              )
            }).length
          }
          )
        </button>
        <button
          onClick={() => {
            clearFilters()
          }}
          className="filter-chip clear-all"
          style={{
            backgroundColor: "var(--danger-color)",
            color: "white",
            border: "1px solid var(--danger-color)",
          }}
        >
          🗑️ Clear All
        </button>
      </div>

      {/* Projects Grid */}
      <div className="projects-grid">
        {filteredAndSortedProjects.map((project) => {
          const projectStatus = getProjectStatus(project)
          return (
            <div key={project.id} className={`project-card project-status-${projectStatus}`}>
              <div className="project-header">
                <h3>{project.name}</h3>
                <div className="project-actions-header">
                  <button onClick={() => handleEditProject(project)} className="btn-edit">
                    ✏️
                  </button>
                </div>
              </div>
              <p className="project-description">{project.description || "No description"}</p>
              <div className="project-meta">
                <div className="project-dates">
                  <span>📅 Start: {project.startDate || "Not set"}</span>
                  <span>📅 End: {project.endDate || "Not set"}</span>
                </div>
                <div className="project-status-badge">
                  <span className={`status-badge status-${projectStatus}`}>
                    {projectStatus === "active" && "🟢"}
                    {projectStatus === "upcoming" && "🔵"}
                    {projectStatus === "completed" && "✅"}
                    {projectStatus.charAt(0).toUpperCase() + projectStatus.slice(1)}
                  </span>
                </div>
              </div>
              {/* Hover info overlay for project stats */}
              <div className="project-hover-info">
                <div className="project-totals">
                  <div className="project-total-item">
                    <span>📦 Jobs:</span> <strong>{project.totalJobs}</strong>
                  </div>
                  <div className="project-total-item">
                    <span>🔢 Total Qty:</span> <strong>{project.totalQty}</strong>
                  </div>
                  <div className="project-total-item">
                    <span>⚖️ Total Weight:</span> <strong>{project.totalWeight.toLocaleString()} kg</strong>
                  </div>
                </div>
              </div>
              <div className="project-actions">
                <Link to={`/projects/${project.id}`} className="btn btn-secondary">
                  View Jobs
                </Link>
              </div>
            </div>
          )
        })}
      </div>

      {/* Empty States */}
      {filteredAndSortedProjects.length === 0 && projects.length > 0 && (
        <div className="empty-state">
          <h3>No projects match your search</h3>
          <p>Try adjusting your search terms or filters</p>
          <button onClick={clearFilters} className="btn btn-primary">
            Clear Filters
          </button>
        </div>
      )}

      {projects.length === 0 && !loading && (
        <div className="empty-state">
          <h3>No projects yet</h3>
          <p>Create your first project to get started!</p>
          <button onClick={() => setShowModal(true)} className="btn btn-primary">
            Create Project
          </button>
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showModal || editingProject) && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{editingProject ? "Edit Project" : "Create New Project"}</h2>
              <button
                onClick={() => {
                  setShowModal(false)
                  cancelEdit()
                  setError("")
                }}
                className="modal-close"
              >
                ✕
              </button>
            </div>
            <form onSubmit={editingProject ? handleUpdateProject : handleCreateProject} className="modal-form">
              {error && <div className="error-message">{error}</div>}
              <div className="form-group">
                <label>Project Name *</label>
                <input
                  type="text"
                  value={editingProject ? editProject.name : newProject.name}
                  onChange={(e) =>
                    editingProject
                      ? setEditProject({ ...editProject, name: e.target.value })
                      : setNewProject({ ...newProject, name: e.target.value })
                  }
                  required
                  placeholder="Enter project name"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={editingProject ? editProject.description : newProject.description}
                  onChange={(e) =>
                    editingProject
                      ? setEditProject({ ...editProject, description: e.target.value })
                      : setNewProject({ ...newProject, description: e.target.value })
                  }
                  rows="3"
                  placeholder="Enter project description (optional)"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={editingProject ? editProject.startDate : newProject.startDate}
                    onChange={(e) =>
                      editingProject
                        ? setEditProject({ ...editProject, startDate: e.target.value })
                        : setNewProject({ ...newProject, startDate: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={editingProject ? editProject.endDate : newProject.endDate}
                    onChange={(e) =>
                      editingProject
                        ? setEditProject({ ...editProject, endDate: e.target.value })
                        : setNewProject({ ...newProject, endDate: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    cancelEdit()
                    setError("")
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingProject ? "Update Project" : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <FilterToast message={toastMessage} show={showToast} onHide={() => setShowToast(false)} type="success" />
    </div>
  )
}
