"use client"

import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { db } from "../lib/firebase"
import LoadingSpinner from "./LoadingSpinner"
import { sanitizeForFirestore, validateRequiredFields, parseNumericField } from "../utils/firestoreUtils"

export default function JobDetail() {
  const { projectId, jobId } = useParams()
  const [job, setJob] = useState(null)
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editingJob, setEditingJob] = useState(false)
  const [editJobData, setEditJobData] = useState({
    name: "",
    description: "",
    unitWeight: "",
    quantity: "",
  })
  const [selectedSubJobIndex, setSelectedSubJobIndex] = useState(0)

  useEffect(() => {
    fetchJobAndProject()
  }, [jobId, projectId])

  const fetchJobAndProject = async () => {
    try {
      // Fetch job details
      const jobDoc = await getDoc(doc(db, "jobs", jobId))
      if (jobDoc.exists()) {
        setJob({ id: jobDoc.id, ...jobDoc.data() })
      }

      // Fetch project details
      const projectDoc = await getDoc(doc(db, "projects", projectId))
      if (projectDoc.exists()) {
        setProject({ id: projectDoc.id, ...projectDoc.data() })
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleEditJob = () => {
    setEditJobData({
      name: job.name,
      description: job.description,
      unitWeight: job.unitWeight.toString(),
      quantity: job.quantity.toString(),
    })
    setEditingJob(true)
  }

  const handleUpdateJobInfo = async (e) => {
    e.preventDefault()

    const { isValid, errors } = validateRequiredFields(editJobData, ["name"])
    if (!isValid) {
      console.error("Validation errors:", errors)
      return
    }

    try {
      const unitWeight = parseNumericField(editJobData.unitWeight)
      const quantity = parseNumericField(editJobData.quantity)

      const jobData = sanitizeForFirestore(
        {
          name: editJobData.name,
          description: editJobData.description,
          unitWeight,
          quantity,
          totalWeight: unitWeight * quantity,
          updatedAt: new Date(),
        },
        ["description"],
      )

      await updateDoc(doc(db, "jobs", jobId), jobData)

      setJob({
        ...job,
        name: editJobData.name,
        description: editJobData.description,
        unitWeight,
        quantity,
        totalWeight: unitWeight * quantity,
      })

      setEditingJob(false)
    } catch (error) {
      console.error("Error updating job:", error)
    }
  }

  const cancelJobEdit = () => {
    setEditingJob(false)
    setEditJobData({ name: "", description: "", unitWeight: "", quantity: "" })
  }

  const handleStepToggle = async (stepIndex) => {
    if (!job) return

    // Use subJobs if present, else fallback to steps (for backward compatibility)
    const hasSubJobs = Array.isArray(job.subJobs) && job.subJobs.length > 0
    if (hasSubJobs) {
      // Sequential validation for sub-job steps
      if (stepIndex > 0) {
        const prevStepsCompleted = job.subJobs[selectedSubJobIndex].steps.slice(0, stepIndex).every((s) => s.completed)
        if (!prevStepsCompleted) {
          alert("Please complete previous steps in order before marking this step as complete.")
          return
        }
      }
      // Update steps for selected sub-job
      const updatedSubJobs = job.subJobs.map((subJob, idx) => {
        if (idx !== selectedSubJobIndex) return subJob
        const updatedSteps = [...subJob.steps]
        const step = updatedSteps[stepIndex]
        step.completed = !step.completed
        step.completedAt = step.completed ? new Date().toISOString() : null
        return { ...subJob, steps: updatedSteps }
      })
      // Check if all sub-jobs are completed
      const allSubJobsCompleted = updatedSubJobs.every(
        (sub) => Array.isArray(sub.steps) && sub.steps.length > 0 && sub.steps.every((s) => s.completed)
      )
      // Check if any step is completed in any sub-job
      const anyStepCompleted = updatedSubJobs.some(
        (sub) => Array.isArray(sub.steps) && sub.steps.some((s) => s.completed)
      )
      let status = "pending"
      if (allSubJobsCompleted) {
        status = "completed"
      } else if (anyStepCompleted) {
        status = "in-progress"
      }
      try {
        await updateDoc(doc(db, "jobs", jobId), {
          subJobs: updatedSubJobs,
          status: status,
          updatedAt: new Date(),
        })
        setJob({ ...job, subJobs: updatedSubJobs, status })
      } catch (error) {
        console.error("Error updating step:", error)
      }
    } else {
      // Fallback: old jobs with top-level steps
      if (stepIndex > 0) {
        const prevStepsCompleted = job.steps.slice(0, stepIndex).every((s) => s.completed)
        if (!prevStepsCompleted) {
          alert("Please complete previous steps in order before marking this step as complete.")
          return
        }
      }
      const updatedSteps = [...job.steps]
      const step = updatedSteps[stepIndex]
      step.completed = !step.completed
      step.completedAt = step.completed ? new Date().toISOString() : null
      // Update job status based on completed steps
      const completedSteps = updatedSteps.filter((s) => s.completed).length
      const totalSteps = updatedSteps.length
      let status = "pending"
      if (completedSteps === totalSteps) {
        status = "completed"
      } else if (completedSteps > 0) {
        status = "in-progress"
      }
      try {
        await updateDoc(doc(db, "jobs", jobId), {
          steps: updatedSteps,
          status: status,
          updatedAt: new Date(),
        })
        setJob({ ...job, steps: updatedSteps, status })
      } catch (error) {
        console.error("Error updating step:", error)
      }
    }
  }

  if (loading) {
    return <LoadingSpinner size="large" text="Loading job details..." />
  }

  if (!job || !project) {
    return <div className="error-message">Job or Project not found</div>
  }

  // Use subJobs if present, else fallback to steps (for backward compatibility)
  const hasSubJobs = Array.isArray(job.subJobs) && job.subJobs.length > 0
  const subJobs = hasSubJobs ? job.subJobs : null
  const steps = hasSubJobs ? subJobs[selectedSubJobIndex]?.steps || [] : job.steps || []

  const completedSteps = steps.filter((step) => step.completed).length
  const progressPercentage = steps.length > 0 ? (completedSteps / steps.length) * 100 : 0

  return (
    <div className="job-detail">
      <div className="job-detail-header">
        <div>
          <div className="job-title-section">
            {/* <h1>⚡ {job.name}</h1>
            <button onClick={handleEditJob} className="btn btn-sm btn-secondary">
              ✏️ Edit Job
            </button> */}
          </div>
          <p>Project: {project.name}</p>
          <p>{job.description}</p>
        </div>
        <Link to={`/projects/${projectId}`} className="btn btn-secondary">
          ← Back to Project
        </Link>
      </div>

      <div className="job-info-grid">
        <div className="job-info-card">
          <h3>📊 Job Information</h3>
          <div className="info-item">
            <strong>Unit Weight:</strong> {job.unitWeight} kg
          </div>
          <div className="info-item">
            <strong>Quantity:</strong> {job.quantity}
          </div>
          <div className="info-item">
            <strong>Total Weight:</strong> {job.totalWeight} kg
          </div>
          <div className="info-item">
            <strong>Status:</strong> <span className={`status-badge status-${job.status}`}>{job.status}</span>
          </div>
        </div>

        <div className="progress-card">
          <h3>📈 Progress</h3>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progressPercentage}%` }}></div>
          </div>
          <p>
            {completedSteps} of {steps.length} steps completed ({Math.round(progressPercentage)}%)
          </p>
        </div>
      </div>

      <div className="steps-section">
        {hasSubJobs && (
          <div className="subjobs-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: 16 }}>
            {subJobs.map((subJob, idx) => (
              <button
                key={idx}
                className={`subjob-btn${selectedSubJobIndex === idx ? ' active' : ''}`}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: 6,
                  border: selectedSubJobIndex === idx ? '2px solid #7c3aed' : '1px solid #ccc',
                  background: selectedSubJobIndex === idx ? '#ede9fe' : '#fff',
                  fontWeight: selectedSubJobIndex === idx ? 'bold' : 'normal',
                  cursor: 'pointer',
                  minWidth: 80,
                  transition: 'all 0.2s',
                }}
                onClick={() => setSelectedSubJobIndex(idx)}
              >
                {subJob.name}
              </button>
            ))}
          </div>
        )}
        <h3>📋 Job Steps</h3>
        <div className="steps-list">
          {steps.map((step, index) => (
            <div key={index} className={`step-item ${step.completed ? "completed" : ""}`}>
              <div className="step-checkbox">
                <input
                  type="checkbox"
                  checked={step.completed}
                  onChange={() => handleStepToggle(index)}
                  id={`step-${index}`}
                />
                <label htmlFor={`step-${index}`} className="step-label">
                  {step.name}
                </label>
              </div>
              {step.completed && step.completedAt && (
                <div className="step-date">Completed: {new Date(step.completedAt).toLocaleString()}</div>
              )}
            </div>
          ))}
        </div>
      </div>
      {editingJob && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Edit Job Information</h2>
              <button onClick={cancelJobEdit} className="modal-close">
                ✕
              </button>
            </div>
            <form onSubmit={handleUpdateJobInfo} className="modal-form">
              <div className="form-group">
                <label>Job Name</label>
                <input
                  type="text"
                  value={editJobData.name}
                  onChange={(e) => setEditJobData({ ...editJobData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={editJobData.description}
                  onChange={(e) => setEditJobData({ ...editJobData, description: e.target.value })}
                  rows="3"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Unit Weight (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editJobData.unitWeight}
                    onChange={(e) => setEditJobData({ ...editJobData, unitWeight: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Quantity</label>
                  <input
                    type="number"
                    value={editJobData.quantity}
                    onChange={(e) => setEditJobData({ ...editJobData, quantity: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>
                  Total Weight:{" "}
                  {(
                    (Number.parseFloat(editJobData.unitWeight) || 0) * (Number.parseInt(editJobData.quantity) || 0)
                  ).toFixed(2)}{" "}
                  kg
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={cancelJobEdit} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Update Job
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
