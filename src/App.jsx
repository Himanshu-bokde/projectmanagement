import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider } from "./contexts/AuthContext"
import { ThemeProvider } from "./contexts/ThemeContext"
import Navbar from "./components/Navbar"
import Dashboard from "./components/Dashboard"
import Projects from "./components/Projects"
import BatchPage from "./components/BatchPage"
import ProjectDetail from "./components/ProjectDetail"
import JobDetail from "./components/JobDetail"
import Login from "./components/Login"
import Signup from "./components/Signup"
import ProtectedRoute from "./components/ProtectedRoute"
import "./App.css"

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="app">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <Navbar />
                    <main className="main-content">
                      <Routes>
                        <Route path="/" element={<Navigate to="/dashboard" />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/projects" element={<Projects />} />
                        <Route path="/projects/:projectId" element={<ProjectDetail />} />
                        <Route path="/projects/:projectId/batches" element={<BatchPage />} />
                        <Route path="/projects/:projectId/batches/:batchId/jobs" element={<ProjectDetail isBatchJobs={true} />} />
                        <Route path="/projects/:projectId/jobs/:jobId" element={<JobDetail />} />
                      </Routes>
                    </main>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
