"use client"

import { useState, useEffect } from "react"

export default function SavedSearches({ onApplySearch, currentSearch }) {
  const [savedSearches, setSavedSearches] = useState([])
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [searchName, setSearchName] = useState("")

  useEffect(() => {
    const saved = localStorage.getItem("savedProjectSearches")
    if (saved) {
      setSavedSearches(JSON.parse(saved))
    }
  }, [])

  const saveCurrentSearch = () => {
    if (!searchName.trim()) return

    const newSearch = {
      id: Date.now(),
      name: searchName,
      ...currentSearch,
      createdAt: new Date().toISOString(),
    }

    const updated = [...savedSearches, newSearch]
    setSavedSearches(updated)
    localStorage.setItem("savedProjectSearches", JSON.stringify(updated))
    setSearchName("")
    setShowSaveModal(false)
  }

  const deleteSavedSearch = (id) => {
    const updated = savedSearches.filter((search) => search.id !== id)
    setSavedSearches(updated)
    localStorage.setItem("savedProjectSearches", JSON.stringify(updated))
  }

  const hasActiveFilters = () => {
    return (
      currentSearch.searchTerm ||
      currentSearch.statusFilter !== "all" ||
      currentSearch.dateFilter !== "all" ||
      currentSearch.sortBy !== "name" ||
      currentSearch.sortOrder !== "asc"
    )
  }

  return (
    <div className="saved-searches">
      <div className="saved-searches-header">
        <h4>💾 Saved Searches</h4>
        {hasActiveFilters() && (
          <button onClick={() => setShowSaveModal(true)} className="btn btn-sm btn-primary">
            Save Current Search
          </button>
        )}
      </div>

      {savedSearches.length > 0 && (
        <div className="saved-searches-list">
          {savedSearches.map((search) => (
            <div key={search.id} className="saved-search-item">
              <div className="saved-search-info">
                <span className="saved-search-name">{search.name}</span>
                <span className="saved-search-details">
                  {search.searchTerm && `"${search.searchTerm}"`}
                  {search.statusFilter !== "all" && ` • ${search.statusFilter}`}
                  {search.dateFilter !== "all" && ` • ${search.dateFilter}`}
                </span>
              </div>
              <div className="saved-search-actions">
                <button onClick={() => onApplySearch(search)} className="btn btn-sm btn-secondary">
                  Apply
                </button>
                <button onClick={() => deleteSavedSearch(search.id)} className="btn btn-sm btn-danger">
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showSaveModal && (
        <div className="modal-overlay">
          <div className="modal modal-sm">
            <div className="modal-header">
              <h3>Save Search</h3>
              <button onClick={() => setShowSaveModal(false)} className="modal-close">
                ✕
              </button>
            </div>
            <div className="modal-form">
              <div className="form-group">
                <label>Search Name</label>
                <input
                  type="text"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  placeholder="Enter a name for this search..."
                  autoFocus
                />
              </div>
              <div className="search-preview">
                <strong>Current filters:</strong>
                <ul>
                  {currentSearch.searchTerm && <li>Search: "{currentSearch.searchTerm}"</li>}
                  {currentSearch.statusFilter !== "all" && <li>Status: {currentSearch.statusFilter}</li>}
                  {currentSearch.dateFilter !== "all" && <li>Date: {currentSearch.dateFilter}</li>}
                  {currentSearch.sortBy !== "name" && <li>Sort: {currentSearch.sortBy}</li>}
                </ul>
              </div>
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowSaveModal(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button onClick={saveCurrentSearch} className="btn btn-primary" disabled={!searchName.trim()}>
                Save Search
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
