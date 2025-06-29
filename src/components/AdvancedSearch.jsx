"use client"

import { useState } from "react"

export default function AdvancedSearch({ onSearch, onClose }) {
  const [searchCriteria, setSearchCriteria] = useState({
    name: "",
    description: "",
    startDateFrom: "",
    startDateTo: "",
    endDateFrom: "",
    endDateTo: "",
    status: "all",
    createdBy: "",
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSearch(searchCriteria)
    onClose()
  }

  const clearAll = () => {
    setSearchCriteria({
      name: "",
      description: "",
      startDateFrom: "",
      startDateTo: "",
      endDateFrom: "",
      endDateTo: "",
      status: "all",
      createdBy: "",
    })
  }

  return (
    <div className="modal-overlay">
      <div className="modal modal-lg">
        <div className="modal-header">
          <h2>🔍 Advanced Search</h2>
          <button onClick={onClose} className="modal-close">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="advanced-search-grid">
            <div className="form-group">
              <label>Project Name</label>
              <input
                type="text"
                value={searchCriteria.name}
                onChange={(e) => setSearchCriteria({ ...searchCriteria, name: e.target.value })}
                placeholder="Search by project name..."
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <input
                type="text"
                value={searchCriteria.description}
                onChange={(e) => setSearchCriteria({ ...searchCriteria, description: e.target.value })}
                placeholder="Search in description..."
              />
            </div>

            <div className="form-group">
              <label>Status</label>
              <select
                value={searchCriteria.status}
                onChange={(e) => setSearchCriteria({ ...searchCriteria, status: e.target.value })}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="upcoming">Upcoming</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="form-group">
              <label>Created By</label>
              <input
                type="text"
                value={searchCriteria.createdBy}
                onChange={(e) => setSearchCriteria({ ...searchCriteria, createdBy: e.target.value })}
                placeholder="Search by creator..."
              />
            </div>

            <div className="form-group">
              <label>Start Date From</label>
              <input
                type="date"
                value={searchCriteria.startDateFrom}
                onChange={(e) => setSearchCriteria({ ...searchCriteria, startDateFrom: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Start Date To</label>
              <input
                type="date"
                value={searchCriteria.startDateTo}
                onChange={(e) => setSearchCriteria({ ...searchCriteria, startDateTo: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>End Date From</label>
              <input
                type="date"
                value={searchCriteria.endDateFrom}
                onChange={(e) => setSearchCriteria({ ...searchCriteria, endDateFrom: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>End Date To</label>
              <input
                type="date"
                value={searchCriteria.endDateTo}
                onChange={(e) => setSearchCriteria({ ...searchCriteria, endDateTo: e.target.value })}
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={clearAll} className="btn btn-secondary">
              Clear All
            </button>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Search Projects
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
