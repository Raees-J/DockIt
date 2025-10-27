import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import UIPreference from './pages/UIPreference';
import FirstTaskGuide from './pages/FirstTaskGuide';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Calendar from './pages/Calendar';
import Reports from './pages/Reports';
import Messages from './pages/Messages';
import Settings from './pages/Settings';
import MainLayout from './components/Layout/MainLayout';
import './App.css';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/login" 
          element={!user ? <Login /> : <Navigate to="/dashboard" />} 
        />
        <Route 
          path="/register" 
          element={!user ? <Register /> : <Navigate to="/dashboard" />} 
        />

        {/* Protected Routes - UI Preference Selection */}
        <Route
          path="/ui-preference"
          element={
            user && !user.uiPreference ? (
              <UIPreference />
            ) : user ? (
              <Navigate to="/dashboard" />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* Protected Routes - First Task Guide */}
        <Route
          path="/first-task"
          element={
            user && user.uiPreference && !user.hasCreatedFirstTask ? (
              <FirstTaskGuide />
            ) : user ? (
              <Navigate to="/dashboard" />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* Protected Routes - Main Application */}
        <Route
          path="/"
          element={
            user ? (
              user.uiPreference ? (
                user.hasCreatedFirstTask ? (
                  <MainLayout />
                ) : (
                  <Navigate to="/first-task" />
                )
              ) : (
                <Navigate to="/ui-preference" />
              )
            ) : (
              <Navigate to="/login" />
            )
          }
        >
          <Route index element={<Navigate to="/dashboard" />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="projects" element={<Projects />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="reports" element={<Reports />} />
          <Route path="messages" element={<Messages />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
