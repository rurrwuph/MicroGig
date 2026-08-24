import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import WorkList from './components/WorkList';
import PostJob from './components/PostJob';
import MyAssignments from './components/MyAssignments';
import Wallet from './components/Wallet';
import Profile from './components/Profile';
import PublicProfile from './components/PublicProfile';
import Footer from './components/Footer';

// Auth guard: redirect to /login if not logged in
const Protected = ({ user, children }) =>
  user ? children : <Navigate to="/login" replace />;

function App() {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user')) || null;
    } catch {
      return null;
    }
  });

  // Theme state: default to 'dark'
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('microgig_theme') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('microgig_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Wrapped setUser that also keeps localStorage in sync
  const updateUser = (updatedUser) => {
    if (updatedUser) {
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } else {
      localStorage.clear();
    }
    setUser(updatedUser);
  };

  const isClient = user?.role === 'ROLE_CLIENT';

  return (
    <Router>
      <ToastProvider>
        <Navbar
          user={user}
          setUser={updateUser}
          theme={theme}
          toggleTheme={toggleTheme}
        />

        <Routes>
          {/* Public */}
          <Route
            path="/login"
            element={!user ? <Login setUser={updateUser} /> : <Navigate to="/dashboard" replace />}
          />

          {/* Protected — all roles */}
          <Route path="/dashboard" element={
            <Protected user={user}><Dashboard user={user} setUser={updateUser} /></Protected>
          } />
          <Route path="/jobs" element={
            <Protected user={user}><WorkList user={user} setUser={updateUser} /></Protected>
          } />
          <Route path="/my-assignments" element={
            <Protected user={user}><MyAssignments user={user} setUser={updateUser} /></Protected>
          } />
          <Route path="/wallet" element={
            <Protected user={user}><Wallet user={user} setUser={updateUser} /></Protected>
          } />
          <Route path="/profile" element={
            <Protected user={user}><Profile user={user} setUser={updateUser} /></Protected>
          } />
          <Route path="/user/:username" element={
            <Protected user={user}><PublicProfile currentUser={user} /></Protected>
          } />

          {/* Client-only routes */}
          <Route path="/post-job" element={
            <Protected user={user}>
              {isClient ? <PostJob user={user} setUser={updateUser} /> : <Navigate to="/dashboard" replace />}
            </Protected>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
        </Routes>

        <Footer />
      </ToastProvider>
    </Router>
  );
}

export default App;
