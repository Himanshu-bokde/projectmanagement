"use client"

import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, getDoc, updateDoc } from "firebase/firestore"
import { db } from "../lib/firebase"
import { useAuth } from "../contexts/AuthContext"
import { JobRowSkeleton } from "./SkeletonLoader"
import { sanitizeForFirestore, validateRequiredFields, parseNumericField } from "../utils/firestoreUtils"
export default function ProjectDetail() {
  const { projectId } = useParams()
  const { user } = useAuth()
  const [project, setProject] = useState(null)
  const [jobs, setJobs] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [newJob, setNewJob] = useState({
    name: "",
    description: "",
    unitWeight: "",
    quantity: "",
  })
  const [loading, setLoading] = useState(true)
  const [editingJob, setEditingJob] = useState(null)
  const [editJob, setEditJob] = useState({
    name: "",
    description: "",
    unitWeight: "",
    quantity: "",
  })
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordInput, setPasswordInput] = useState("")
  const [jobIdToDelete, setJobIdToDelete] = useState(null)
  const [toastMsg, setToastMsg] = useState("")

  useEffect(() => {
    fetchProjectAndJobs()
  }, [projectId])

  const fetchProjectAndJobs = async () => {
    try {
      // Fetch project details
      const projectDoc = await getDoc(doc(db, "projects", projectId))
      if (projectDoc.exists()) {
        setProject({ id: projectDoc.id, ...projectDoc.data() })
      }

      // Fetch all jobs for this project (remove user filter)
      const q = query(collection(db, "jobs"), where("projectId", "==", projectId))
      const querySnapshot = await getDocs(q)
      const jobsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      setJobs(jobsData)
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateJob = async (e) => {
    e.preventDefault()

    const { isValid, errors } = validateRequiredFields(newJob, ["name"])
    if (!isValid) {
      console.error("Validation errors:", errors)
      return
    }

    try {
      const unitWeight = parseNumericField(newJob.unitWeight)
      const quantity = parseNumericField(newJob.quantity)
      // Create subJobs array with steps for each sub-job
      const subJobs = Array.from({ length: quantity }, (_, i) => ({
        name: `${newJob.name} V${i + 1}`,
        steps: [
          { name: "Raw material inspection", completed: false, completedAt: null },
          { name: "Nesting", completed: false, completedAt: null },
          { name: "Cutting", completed: false, completedAt: null },
          { name: "H Beam", completed: false, completedAt: null },
          { name: "Built up", completed: false, completedAt: null },
          { name: "Fitup", completed: false, completedAt: null },
          { name: "Fitup inspection", completed: false, completedAt: null },
          { name: "Welding", completed: false, completedAt: null },
          { name: "Finishing", completed: false, completedAt: null },
          { name: "Finishing visual inspection", completed: false, completedAt: null },
          { name: "Blasting", completed: false, completedAt: null },
          { name: "Painting", completed: false, completedAt: null },
          { name: "Painting inspection", completed: false, completedAt: null },
          { name: "Ready For Dispatch - RFD", completed: false, completedAt: null },
        ],
      }))
      const jobData = sanitizeForFirestore(
        {
          ...newJob,
          projectId,
          userId: user.uid,
          unitWeight,
          quantity,
          totalWeight: unitWeight * quantity,
          status: "pending",
          createdAt: new Date(),
          subJobs,
        },
        ["description"],
      )

      await addDoc(collection(db, "jobs"), jobData)
      setNewJob({ name: "", description: "", unitWeight: "", quantity: "" })
      setShowModal(false)
      fetchProjectAndJobs()
    } catch (error) {
      console.error("Error creating job:", error)
    }
  }

  const handleDeleteJob = (jobId) => {
    setJobIdToDelete(jobId)
    setShowPasswordModal(true)
    setPasswordInput("")
  }

  const confirmDeleteJob = async (e) => {
    e.preventDefault()
    // Replace 'delete123' with your real password logic
    if (passwordInput !== "delete123") {
      setToastMsg("Incorrect password! Job not deleted.")
      setShowPasswordModal(false)
      setTimeout(() => setToastMsg(""), 3000)
      return
    }
    try {
      await deleteDoc(doc(db, "jobs", jobIdToDelete))
      setToastMsg("Job deleted successfully.")
      setShowPasswordModal(false)
      setTimeout(() => setToastMsg(""), 3000)
      fetchProjectAndJobs()
    } catch (error) {
      setToastMsg("Error deleting job.")
      setShowPasswordModal(false)
      setTimeout(() => setToastMsg(""), 3000)
    }
  }

  const handleEditJob = (job) => {
    setEditJob({
      name: job.name,
      description: job.description,
      unitWeight: job.unitWeight.toString(),
      quantity: job.quantity.toString(),
    })
    setEditingJob(job.id)
  }

  const handleUpdateJob = async (e) => {
    e.preventDefault()

    const { isValid, errors } = validateRequiredFields(editJob, ["name"])
    if (!isValid) {
      console.error("Validation errors:", errors)
      return
    }

    try {
      const unitWeight = parseNumericField(editJob.unitWeight)
      const quantity = parseNumericField(editJob.quantity)

      const jobData = sanitizeForFirestore(
        {
          ...editJob,
          unitWeight,
          quantity,
          totalWeight: unitWeight * quantity,
          updatedAt: new Date(),
        },
        ["description"],
      )

      await updateDoc(doc(db, "jobs", editingJob), jobData)
      setEditJob({ name: "", description: "", unitWeight: "", quantity: "" })
      setEditingJob(null)
      fetchProjectAndJobs()
    } catch (error) {
      console.error("Error updating job:", error)
    }
  }

  const cancelJobEdit = () => {
    setEditingJob(null)
    setEditJob({ name: "", description: "", unitWeight: "", quantity: "" })
  }

  const filteredJobs = jobs.filter((job) => job.name.toLowerCase().includes(searchTerm.toLowerCase()))

  if (loading) {
    return (
      <div className="project-detail">
        <div className="project-detail-header">
          <div>
            <div className="skeleton-title" style={{ width: "300px", height: "2rem", marginBottom: "0.5rem" }}></div>
            <div className="skeleton-text" style={{ width: "200px", height: "1rem" }}></div>
          </div>
          <div className="skeleton-button" style={{ width: "120px", height: "2.5rem" }}></div>
        </div>

        <div className="jobs-section">
          <div className="jobs-header">
            <h2>⚡ Jobs</h2>
            <div className="jobs-actions">
              <div className="skeleton-button" style={{ width: "200px", height: "2.5rem" }}></div>
              <div className="skeleton-button" style={{ width: "100px", height: "2.5rem" }}></div>
            </div>
          </div>

          <div className="jobs-table">
            <table>
              <thead>
                <tr>
                  <th>Job Name</th>
                  <th>Unit Weight (kg)</th>
                  <th>Quantity</th>
                  <th>Total Weight (kg)</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, index) => (
                  <JobRowSkeleton key={index} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  if (!project) {
    return <div className="error-message">Project not found</div>
  }

  return (
    <div className="project-detail">
      <div className="projects-header">
        <div>
          <h1>📁 {project.name}</h1>
          <p>{project.description}</p>
        </div>
        <Link to="/projects" className="btn btn-secondary">
          ← Back to Projects
        </Link>
      </div>

      <div className="jobs-section">
        <div className="jobs-header">
          <h2>⚡ Jobs</h2>
          <div className="search-bar">
            <input
              type="text"
              placeholder="🔍 Search jobs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <button onClick={() => setShowModal(true)} className="btn btn-primary">
              ➕ Add Job
            </button>
          </div>
        </div>

        {/* Project Jobs Progress Bar */}
        <div className="project-progress-bar" style={{ margin: "1rem 0" }}>
          {jobs.length > 0 && (
            <div style={{ width: "100%", maxWidth: 600, margin: "0 auto" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 14,
                  marginBottom: 4,
                }}
              >
                <span>Jobs Progress</span>
                <span>
                  {jobs.filter((j) => j.status === "completed").length} of {jobs.length} jobs completed (
                  {Math.round((jobs.filter((j) => j.status === "completed").length / jobs.length) * 100)}%)
                </span>
              </div>
              <div
                style={{
                  background: "#e5e7eb",
                  borderRadius: 8,
                  height: 16,
                  width: "100%",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${(jobs.filter((j) => j.status === "completed").length / jobs.length) * 100}%`,
                    background: "linear-gradient(90deg, #a78bfa, #7c3aed)",
                    height: "100%",
                    borderRadius: 8,
                    transition: "width 0.4s",
                  }}
                ></div>
              </div>
            </div>
          )}
        </div>

        <div className="jobs-table">
          <table>
            <thead>
              <tr>
                <th>Job Name</th>
                <th>Unit Weight (kg)</th>
                <th>Quantity</th>
                <th>Total Weight (kg)</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs.map((job) => (
                <tr key={job.id}>
                  <td>{job.name}</td>
                  <td>{job.unitWeight}</td>
                  <td>{job.quantity}</td>
                  <td>{job.totalWeight}</td>
                  <td>
                    <span className={`status-badge status-${job.status}`}>{job.status}</span>
                  </td>
                  <td>
                    <div className="table-actions">
                      <Link to={`/projects/${projectId}/jobs/${job.id}`} className="btn btn-sm btn-primary">
                        View
                      </Link>
                      <button onClick={() => handleEditJob(job)} className="btn btn-sm btn-secondary">
                        Edit
                      </button>
                      <button onClick={() => handleDeleteJob(job.id)} className="btn btn-sm btn-danger">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredJobs.length === 0 && (
          <div className="empty-state">
            <h3>No jobs found</h3>
            <p>Add your first job to get started!</p>
          </div>
        )}
      </div>

      {(showModal || editingJob) && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{editingJob ? "Edit Job" : "Add New Job"}</h2>
              <button
                onClick={() => {
                  setShowModal(false)
                  cancelJobEdit()
                }}
                className="modal-close"
              >
                ✕
              </button>
            </div>
            <form onSubmit={editingJob ? handleUpdateJob : handleCreateJob} className="modal-form">
              <div className="form-group">
                <label>Job Name</label>
                <input
                  type="text"
                  value={editingJob ? editJob.name : newJob.name}
                  onChange={(e) =>
                    editingJob
                      ? setEditJob({ ...editJob, name: e.target.value })
                      : setNewJob({ ...newJob, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={editingJob ? editJob.description : newJob.description}
                  onChange={(e) =>
                    editingJob
                      ? setEditJob({ ...editJob, description: e.target.value })
                      : setNewJob({ ...newJob, description: e.target.value })
                  }
                  rows="3"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Unit Weight (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingJob ? editJob.unitWeight : newJob.unitWeight}
                    onChange={(e) =>
                      editingJob
                        ? setEditJob({ ...editJob, unitWeight: e.target.value })
                        : setNewJob({ ...newJob, unitWeight: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Quantity</label>
                  <input
                    type="number"
                    value={editingJob ? editJob.quantity : newJob.quantity}
                    onChange={(e) =>
                      editingJob
                        ? setEditJob({ ...editJob, quantity: e.target.value })
                        : setNewJob({ ...newJob, quantity: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>
                  Total Weight:{" "}
                  {editingJob
                    ? ((Number.parseFloat(editJob.unitWeight) || 0) * (Number.parseInt(editJob.quantity) || 0)).toFixed(
                        2,
                      )
                    : ((Number.parseFloat(newJob.unitWeight) || 0) * (Number.parseInt(newJob.quantity) || 0)).toFixed(
                        2,
                      )}{" "}
                  kg
                </label>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    cancelJobEdit()
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingJob ? "Update Job" : "Add Job"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Enter Password to Delete</h2>
              <button onClick={() => setShowPasswordModal(false)} className="modal-close">
                ✕
              </button>
            </div>
            <form onSubmit={confirmDeleteJob} className="modal-form">
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-danger">
                  Delete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toastMsg && (
        <div className="filter-toast" style={{ position: "fixed", bottom: 20, right: 20, zIndex: 2000 }}>
          {toastMsg}
        </div>
      )}
    </div>
  )
}
