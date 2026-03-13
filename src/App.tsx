/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ProfileSetup from './pages/ProfileSetup';
import Dashboard from './pages/Dashboard';
import Discover from './pages/Discover';
import MessagesPage from './pages/MessagesPage';
import ProfilePage from './pages/ProfilePage';
import Simulation from './pages/Simulation';
import CollaborationPage from './pages/CollaborationPage';
import NotificationsPage from './pages/NotificationsPage';
import FriendsPage from './pages/FriendsPage';

function AppContent() {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  const isMessagesPage = location.pathname.startsWith('/messages');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] text-white font-sans selection:bg-indigo-500/30">
      {!isMessagesPage && <Navbar />}
      <main className={`${!isMessagesPage ? 'container mx-auto px-4 py-8' : ''}`}>
        <Routes>
          <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Landing />} />
          <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
          <Route path="/signup" element={user ? <Navigate to="/dashboard" /> : <Signup />} />
          
          <Route 
            path="/profile-setup" 
            element={user ? <ProfileSetup /> : <Navigate to="/login" />} 
          />
          
          <Route 
            path="/dashboard" 
            element={
              user ? (
                profile?.profileComplete ? <Dashboard /> : <Navigate to="/profile-setup" />
              ) : <Navigate to="/login" />
            } 
          />

          <Route 
            path="/discover" 
            element={
              user ? (
                profile?.profileComplete ? <Discover /> : <Navigate to="/profile-setup" />
              ) : <Navigate to="/login" />
            } 
          />

          <Route 
            path="/compare/:uid" 
            element={
              user ? (
                profile?.profileComplete ? <Dashboard /> : <Navigate to="/profile-setup" />
              ) : <Navigate to="/login" />
            } 
          />
          
          <Route 
            path="/messages" 
            element={user ? <MessagesPage /> : <Navigate to="/login" />} 
          />
          
          <Route 
            path="/messages/:receiverId" 
            element={user ? <MessagesPage /> : <Navigate to="/login" />} 
          />
          
          <Route 
            path="/chat/:receiverId" 
            element={<Navigate to="/messages/:receiverId" />} 
          />
          
          <Route 
            path="/profile/:uid" 
            element={user ? <ProfilePage /> : <Navigate to="/login" />} 
          />
          
          <Route 
            path="/profile" 
            element={user ? <ProfilePage /> : <Navigate to="/login" />} 
          />
          
          <Route path="/simulation" element={<Simulation />} />
          <Route 
            path="/collab" 
            element={user ? <CollaborationPage /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/notifications" 
            element={user ? <NotificationsPage /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/friends" 
            element={user ? <FriendsPage /> : <Navigate to="/login" />} 
          />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}


