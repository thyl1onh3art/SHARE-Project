import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import FinancialRecords from './components/FinancialRecords';
import SharedAccounts from './components/SharedAccounts';
import Invitations from './components/Invitations';
import EventCountdown from './components/EventCountdown';
import SharedGallery from './components/SharedGallery';
import Profile from './components/Profile';
import Settings from './components/Settings';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/financial-records" 
                element={
                  <ProtectedRoute>
                    <FinancialRecords />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/shared-accounts" 
                element={
                  <ProtectedRoute>
                    <SharedAccounts />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/invitations" 
                element={
                  <ProtectedRoute>
                    <Invitations />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/events" 
                element={
                  <ProtectedRoute>
                    <EventCountdown />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/gallery" 
                element={
                  <ProtectedRoute>
                    <SharedGallery />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/settings" 
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;