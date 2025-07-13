"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, Link } from "react-router-dom"
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, getDoc, updateDoc, writeBatch } from "firebase/firestore"
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
  const [showCsvModal, setShowCsvModal] = useState(false)
  const [csvFile, setCsvFile] = useState(null)
  const [csvError, setCsvError] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef(null)
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
      setLoading(false
      )
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
        name: `${newJob.name}-${i + 1}`,
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
      let updatedSubJobs
      const newQuantity = Number(quantity)
      // Always rebuild subJobs array to match new quantity and name
      if (Array.isArray(jobs.find((j) => j.id === editingJob)?.subJobs)) {
        const oldSubJobs = jobs.find((j) => j.id === editingJob)?.subJobs || []
        updatedSubJobs = Array.from({ length: newQuantity }, (_, i) => {
          const existing = oldSubJobs[i]
          return {
            name: `${editJob.name}-${i + 1}`,
            steps:
              existing && Array.isArray(existing.steps)
                ? existing.steps.map((step) => ({ ...step }))
                : [
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
          }
        })
      } else {
        // If no subJobs exist, create from scratch
        updatedSubJobs = Array.from({ length: newQuantity }, (_, i) => ({
          name: `${editJob.name}-${i + 1}`,
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
      }

      const jobData = sanitizeForFirestore(
        {
          ...editJob,
          unitWeight,
          quantity,
          totalWeight: unitWeight * quantity,
          updatedAt: new Date(),
          subJobs: updatedSubJobs,
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

  // Helper to check if a job is completed (status or all sub-jobs' steps)
  const isJobCompleted = (job) => {
    if (Array.isArray(job.subJobs) && job.subJobs.length > 0) {
      return job.subJobs.every(
        (sub) => Array.isArray(sub.steps) && sub.steps.length > 0 && sub.steps.every((s) => s.completed)
      )
    }
    return job.status === "completed"
  }

  const handleCsvFileChange = (e) => {
    const file = e.target.files[0]
    if (file && file.type === "text/csv") {
      setCsvFile(file)
      setCsvError("")
    } else {
      setCsvError("Please select a valid CSV file")
      setCsvFile(null)
    }
  }

  const downloadSampleCsv = () => {
    const sampleData = `Part Mark,Description,Qty,Unit Weight
C1,Column Section 1,2,1250.50
B1,Beam Section 1,4,850.75
G1,Girder Type 1,3,2100.25`

    const blob = new Blob([sampleData], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "sample_jobs.csv"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const processInChunks = async (jobs, chunkSize = 50) => {
    const batches = []
    for (let i = 0; i < jobs.length; i += chunkSize) {
      batches.push(jobs.slice(i, i + chunkSize))
    }

    let processed = 0
    for (const batch of batches) {
      const batchBatch = writeBatch(db)
      
      batch.forEach((job) => {
        const jobRef = doc(collection(db, "jobs"))
        batchBatch.set(jobRef, job)
      })

      await batchBatch.commit()
      processed += batch.length
      setUploadProgress(Math.round((processed / jobs.length) * 100))
    }
  }

  const handleUploadCsv = async (e) => {
    e.preventDefault()
    
    // Prevent double submission
    if (isUploading) {
      return
    }
    
    if (!csvFile) {
      setCsvError("Please select a CSV file first")
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    setCsvError("")

    try {
      const text = await csvFile.text()
      const lines = text.split("\n").filter((line) => line.trim() !== "")
      const headers = lines[0].split(",").map((header) => header.trim())

      // Map CSV headers to our field names
      const headerMap = {
        "Part Mark": "name",
        "Description": "description",
        "Qty": "quantity",
        "Unit Weight": "unitWeight"
      }

      // Check for required headers
      const requiredHeaders = ["Part Mark", "Description", "Qty", "Unit Weight"]
      const hasRequiredHeaders = requiredHeaders.every(header => headers.includes(header))
      if (!hasRequiredHeaders) {
        setCsvError("CSV file is missing required columns. Required columns are: Part Mark, Description, Qty, Unit Weight")
        setIsUploading(false)
        return
      }

      // Process each line
      const jobsToImport = lines.slice(1).map(line => {
        const values = line.split(",").map(value => value.trim())
        const jobData = {}
        headers.forEach((header, index) => {
          if (headerMap[header]) {
            jobData[headerMap[header]] = values[index]
          }
        })
        return jobData
      })

      // Validate and prepare all jobs first
      const validJobs = []
      for (const job of jobsToImport) {
        const { isValid, errors } = validateRequiredFields(job, ["name"])
        if (isValid) {
          const unitWeight = parseNumericField(job.unitWeight)
          const quantity = parseNumericField(job.quantity)
          const subJobs = Array.from({ length: quantity }, (_, i) => ({
            name: `${job.name}-${i + 1}`,
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
              { name: "Ready For Dispatch - RFD", completed: false, completedAt: null }
            ]
          }))

          validJobs.push(sanitizeForFirestore({
            ...job,
            projectId,
            userId: user.uid,
            unitWeight,
            quantity,
            totalWeight: unitWeight * quantity,
            status: "pending",
            createdAt: new Date(),
            subJobs
          }, ["description"]))
        }
      }

      if (validJobs.length === 0) {
        setCsvError("No valid jobs found in the CSV file")
        setIsUploading(false)
        return
      }

      // Process in chunks
      await processInChunks(validJobs)

      setCsvFile(null)
      setShowCsvModal(false)
      fetchProjectAndJobs()
      setToastMsg(`Successfully imported ${validJobs.length} jobs!`)
      setTimeout(() => setToastMsg(""), 3000)
    } catch (error) {
      console.error("Error importing jobs:", error)
      setCsvError("Error importing jobs. Please check the console for details.")
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

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
            <button onClick={() => setShowCsvModal(true)} className="btn btn-secondary">
              📤 Upload CSV
            </button>
          </div>
        </div>

        {/* Project Jobs Progress Bar */}
        <div className="project-progress-bar" style={{ margin: "1rem 0" }}>
          {jobs.length > 0 && (() => {
            const completedCount = jobs.filter(isJobCompleted).length
            const percent = Math.round((completedCount / jobs.length) * 100)
            return (
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
                    {completedCount} of {jobs.length} jobs completed ({percent}%)
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
                      width: `${percent}%`,
                      background: "linear-gradient(90deg, #a78bfa, #7c3aed)",
                      height: "100%",
                      borderRadius: 8,
                      transition: "width 0.4s",
                    }}
                  ></div>
                </div>
              </div>
            )
          })()}
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

      {showCsvModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Upload Jobs from CSV</h2>
              <button onClick={() => setShowCsvModal(false)} className="modal-close">
                ✕
              </button>
            </div>
            <div className="modal-content" style={{ padding: "1.5rem" }}>
              <div className="csv-upload-section">
                {/* <div className="info-box" style={{ 
                  background: "#f3f4f6", 
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  padding: "1.25rem",
                  marginBottom: "1.5rem"
                }}>
                  <h3 style={{ 
                    fontSize: "1.1rem", 
                    marginBottom: "0.75rem",
                    color: "#374151"
                  }}>📋 CSV File Requirements</h3>
                  <p style={{ marginBottom: "1rem", color: "#4b5563" }}>
                    Your CSV file should include these columns:
                  </p>
                  <ul style={{ 
                    listStyle: "none",
                    padding: "0",
                    margin: "0",
                    display: "grid",
                    gap: "0.5rem"
                  }}>
                    <li style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ color: "#059669" }}>✓</span> Part Mark (Job Name)
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ color: "#059669" }}>✓</span> Description
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ color: "#059669" }}>✓</span> Qty
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ color: "#059669" }}>✓</span> Unit Weight
                    </li>
                  </ul>
                </div> */}

                <div className="upload-actions" style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                  alignItems: "center",
                  background: "#ffffff",
                  padding: "1.5rem",
                  borderRadius: "8px",
                  border: "2px dashed #e5e7eb"
                }}>
                  <button 
                    onClick={downloadSampleCsv} 
                    className="btn btn-secondary btn-sm"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.5rem 1rem"
                    }}
                  >
                    <span>📥</span>
                    <span>Download Sample CSV</span>
                  </button>

                  <div className="file-upload-container" style={{
                    width: "100%",
                    textAlign: "center"
                  }}>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCsvFileChange}
                      ref={fileInputRef}
                      style={{ display: "none" }}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="btn btn-primary"
                      style={{
                        width: "100%",
                        padding: "1rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.5rem"
                      }}
                    >
                      <span>📎</span>
                      <span>Select CSV File</span>
                    </button>
                    {csvFile && (
                      <div style={{ 
                        marginTop: "0.75rem",
                        padding: "0.5rem",
                        background: "#f3f4f6",
                        borderRadius: "4px",
                        fontSize: "0.9rem"
                      }}>
                        <span>Selected file: </span>
                        <span style={{ fontWeight: "500" }}>{csvFile.name}</span>
                      </div>
                    )}
                  </div>
                </div>

                {csvError && (
                  <div className="error-message" style={{
                    marginTop: "1rem",
                    padding: "0.75rem",
                    background: "#fee2e2",
                    border: "1px solid #fca5a5",
                    borderRadius: "6px",
                    color: "#dc2626"
                  }}>
                    ⚠️ {csvError}
                  </div>
                )}
              </div>
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowCsvModal(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleUploadCsv}
                className="btn btn-primary"
                disabled={!csvFile}
              >
                {isUploading ? "Uploading..." : "Upload and Import"}
              </button>
            </div>
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
