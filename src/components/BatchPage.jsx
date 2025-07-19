
import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useParams, Link } from "react-router-dom";
import { sanitizeForFirestore, validateRequiredFields } from "../utils/firestoreUtils";

export default function BatchPage() {
  const { projectId } = useParams();
  const [batches, setBatches] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newBatch, setNewBatch] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    totalWeight: "",
    quantity: "",
  });
  const [editBatch, setEditBatch] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchBatches();
  }, [projectId]);

  const fetchBatches = async () => {
    try {
      setError("");
      setLoading(true);
      const q = query(collection(db, "batches"), where("projectId", "==", projectId));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBatches(data);
    } catch (err) {
      setError("Failed to load batches: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    const { isValid, errors } = validateRequiredFields(newBatch, ["name"]);
    if (!isValid) {
      setError("Please fill in all required fields");
      return;
    }
    try {
      const batchData = sanitizeForFirestore({
        ...newBatch,
        projectId,
        createdAt: new Date(),
      }, ["startDate", "endDate", "description"]);
      await addDoc(collection(db, "batches"), batchData);
      setNewBatch({ name: "", description: "", startDate: "", endDate: "" });
      setShowModal(false);
      fetchBatches();
    } catch (err) {
      setError("Failed to create batch: " + err.message);
    }
  };

  return (
    <div className="project-detail">
      <div className="projects-header">
        <div>
          <h1>📦 Batches</h1>
        </div>
        <Link to="/projects" className="btn btn-secondary">
          ← Back to Projects
        </Link>
      </div>

      <div className="jobs-section">
        <div className="jobs-header">
          <h2>📦 Batch List</h2>
          <div className="jobs-actions">
            <button onClick={() => setShowModal(true)} className="btn btn-primary">
              ➕ Create Batch
            </button>
          </div>
        </div>
        {error && <div className="error-message">{error}</div>}
        <div className="jobs-table">
          <table>
            <thead>
              <tr>
                <th>Batch Name</th>
                <th>Description</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Total Weight </th>
                <th>Quantity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {batches.length === 0 && !loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center' }}>No batches found.</td></tr>
              ) : (
                batches.map(batch => (
                  <tr key={batch.id}>
                    <td>{batch.name}</td>
                    <td>{batch.description || "No description"}</td>
                    <td>{batch.startDate || "Not set"}</td>
                    <td>{batch.endDate || "Not set"}</td>
                    <td>{batch.totalWeight || 0}</td>
                    <td>{batch.quantity || 0}</td>
                    <td>
                      <Link to={`/projects/${projectId}/batches/${batch.id}/jobs`} className="btn btn-secondary btn-sm">View Jobs</Link>
                      <button className="btn btn-primary btn-sm" style={{marginLeft: 8}} onClick={() => { setEditBatch(batch); setShowEditModal(true); }}>Edit</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Create New Batch</h2>
              <button onClick={() => { setShowModal(false); setError(""); }} className="modal-close">✕</button>
            </div>
            <form onSubmit={handleCreateBatch} className="modal-form">
              {error && <div className="error-message">{error}</div>}
              <div className="form-group">
                <label>Batch Name *</label>
                <input type="text" value={newBatch.name} onChange={e => setNewBatch({ ...newBatch, name: e.target.value })} required placeholder="Enter batch name" />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={newBatch.description} onChange={e => setNewBatch({ ...newBatch, description: e.target.value })} rows="3" placeholder="Enter batch description (optional)" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Start Date</label>
                  <input type="date" value={newBatch.startDate} onChange={e => setNewBatch({ ...newBatch, startDate: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input type="date" value={newBatch.endDate} onChange={e => setNewBatch({ ...newBatch, endDate: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Total Weight </label>
                  <input type="number" value={newBatch.totalWeight} onChange={e => setNewBatch({ ...newBatch, totalWeight: e.target.value })} min="0" step="any" placeholder="Enter total weight" />
                </div>
                <div className="form-group">
                  <label>Quantity</label>
                  <input type="number" value={newBatch.quantity} onChange={e => setNewBatch({ ...newBatch, quantity: e.target.value })} min="0" step="1" placeholder="Enter quantity" />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => { setShowModal(false); setError(""); }} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Create Batch</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Batch Modal */}
      {showEditModal && editBatch && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Edit Batch</h2>
              <button onClick={() => { setShowEditModal(false); setEditBatch(null); setError(""); }} className="modal-close">✕</button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                const batchRef = collection(db, "batches");
                // Find the doc to update
                const q = query(batchRef, where("projectId", "==", projectId), where("name", "==", editBatch.name));
                const snapshot = await getDocs(q);
                if (!snapshot.empty) {
                  const docId = snapshot.docs[0].id;
                  await import("firebase/firestore").then(({ updateDoc, doc }) =>
                    updateDoc(doc(db, "batches", docId), {
                      ...editBatch,
                      totalWeight: Number(editBatch.totalWeight) || 0,
                      quantity: Number(editBatch.quantity) || 0,
                    })
                  );
                  setShowEditModal(false);
                  setEditBatch(null);
                  fetchBatches();
                }
              } catch (err) {
                setError("Failed to update batch: " + err.message);
              }
            }} className="modal-form">
              {error && <div className="error-message">{error}</div>}
              <div className="form-group">
                <label>Batch Name *</label>
                <input type="text" value={editBatch.name} onChange={e => setEditBatch({ ...editBatch, name: e.target.value })} required placeholder="Enter batch name" />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={editBatch.description} onChange={e => setEditBatch({ ...editBatch, description: e.target.value })} rows="3" placeholder="Enter batch description (optional)" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Start Date</label>
                  <input type="date" value={editBatch.startDate} onChange={e => setEditBatch({ ...editBatch, startDate: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input type="date" value={editBatch.endDate} onChange={e => setEditBatch({ ...editBatch, endDate: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Total Weight </label>
                  <input type="number" value={editBatch.totalWeight} onChange={e => setEditBatch({ ...editBatch, totalWeight: e.target.value })} min="0" step="any" placeholder="Enter total weight" />
                </div>
                <div className="form-group">
                  <label>Quantity</label>
                  <input type="number" value={editBatch.quantity} onChange={e => setEditBatch({ ...editBatch, quantity: e.target.value })} min="0" step="1" placeholder="Enter quantity" />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => { setShowEditModal(false); setEditBatch(null); setError(""); }} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
