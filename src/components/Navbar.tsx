import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { logout } from '../services/authService';
import { MessageSquare, Users, User, LogOut, Zap, Search, MoreHorizontal, Cpu, Bell, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../firebase/firebaseConfig';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export default function Navbar() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch unread notifications count
  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('read', '==', false)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.docs.length);
    });
    
    return () => unsubscribe();
  }, [user]);

  const handleLogout = async () => {
    await logout();
    setIsMoreOpen(false);
    setIsMenuOpen(false);
    navigate('/');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown and menu on route change
  useEffect(() => {
    setIsMoreOpen(false);
    setIsMenuOpen(false);
  }, [location]);

  const navItems = [
    { to: '/dashboard', label: 'WIBE', icon: Zap, important: true },
    { to: '/discover', label: 'DISCOVER', icon: Search, important: true },
    { to: '/messages', label: 'HANGOUT', icon: MessageSquare, important: true },
    { to: '/friends', label: 'FRIENDS', icon: Users, important: true },
    { to: '/profile', label: 'PROFILE', icon: User, important: true },
    { to: '/collab', label: 'COLLAB', icon: Users, important: false },
    { to: '/notifications', label: 'NOTIFS', icon: Bell, important: false },
    { to: '/simulation', label: 'SIMULATION', icon: Cpu, important: false },
  ];

  const visibleItems = navItems.filter(item => item.important);
  const moreItems = navItems.filter(item => !item.important);

  return (
    <nav className="sticky top-0 z-50 bg-[#030712]/80 backdrop-blur-md border-b border-white/10">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent-blue via-accent-purple to-accent-pink flex items-center justify-center shadow-lg shadow-accent-blue/20 group-hover:scale-110 transition-transform">
            <Zap className="text-white w-7 h-7 fill-current" />
          </div>
          <span className="text-3xl font-black tracking-tighter text-white uppercase">
            wibe
          </span>
        </Link>

        {user && (
          <div className="flex items-center gap-2 md:gap-4">
            {/* Main Nav Items - Desktop */}
            <div className="hidden lg:flex items-center gap-2">
              {visibleItems.map((item) => (
                <Link 
                  key={item.to + item.label}
                  to={item.to} 
                  className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 group ${
                    location.pathname === item.to 
                      ? 'bg-white/10 text-white' 
                      : 'text-white/40 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <item.icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${location.pathname === item.to ? 'text-accent-blue' : ''}`} />
                  <span className="font-black tracking-[0.2em] text-[10px] uppercase">{item.label}</span>
                </Link>
              ))}
            </div>

            {/* More Dropdown - Desktop */}
            <div className="hidden lg:block relative" ref={dropdownRef}>
              <button 
                onClick={() => setIsMoreOpen(!isMoreOpen)}
                className={`p-3 rounded-xl transition-all flex items-center gap-2 relative ${
                  isMoreOpen ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'
                }`}
              >
                <MoreHorizontal className="w-6 h-6" />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#030712]" />
                )}
              </button>

              {isMoreOpen && (
                <div className="absolute right-0 mt-4 w-64 py-3 bg-[#0f111a] border border-white/10 rounded-[2rem] shadow-2xl backdrop-blur-xl z-[60] animate-in fade-in zoom-in duration-200">
                  {moreItems.map((item) => (
                    <Link 
                      key={item.to + item.label + 'more'}
                      to={item.to} 
                      className="flex items-center gap-4 px-6 py-4 text-white/60 hover:text-white hover:bg-white/5 transition-colors group relative"
                    >
                      <div className="relative">
                        <item.icon className="w-5 h-5 group-hover:text-accent-blue transition-colors" />
                        {item.to === '/notifications' && unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#0f111a]" />
                        )}
                      </div>
                      <span className="font-black text-[10px] tracking-[0.2em] uppercase flex-1">{item.label}</span>
                      {item.to === '/notifications' && unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                          {unreadCount}
                        </span>
                      )}
                    </Link>
                  ))}

                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-4 px-6 py-4 text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-colors border-t border-white/5 mt-2"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="font-black text-[10px] tracking-[0.2em] uppercase text-left">LOGOUT</span>
                  </button>
                </div>
              )}
            </div>

            {/* Hamburger Button - Mobile */}
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-3 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all relative"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              {!isMenuOpen && unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#030712]" />
              )}
            </button>
          </div>
        )}

        {!user && (
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-white/70 hover:text-white transition-colors">
              Login
            </Link>
            <Link 
              to="/signup" 
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95"
            >
              Join Now
            </Link>
          </div>
        )}
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-[#030712] border-b border-white/10 overflow-hidden"
          >
            <div className="container mx-auto px-4 py-6 space-y-2">
              {/* Profile Section in Mobile Menu */}
              <div className="px-2 pb-3 mb-3 border-b border-white/5">
                <Link 
                  to="/profile"
                  className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/10 border border-white/10 flex-shrink-0">
                    <img 
                      src={profile?.profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.gender === 'female' ? 'female-' : 'male-'}${user?.uid}`} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-white leading-none truncate">{profile?.name || 'My Profile'}</span>
                    <span className="text-[9px] text-white/40 uppercase tracking-widest mt-1 truncate">View Profile</span>
                  </div>
                </Link>
              </div>

              {/* All Nav Items for Mobile */}
              <div className="grid grid-cols-1 gap-1">
                {navItems.map((item) => (
                  <Link 
                    key={item.to + item.label + 'mobile'}
                    to={item.to} 
                    className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all group ${
                      location.pathname === item.to 
                        ? 'bg-accent-blue/10 text-white' 
                        : 'text-white/40 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="relative">
                      <item.icon className={`w-5 h-5 transition-colors ${location.pathname === item.to ? 'text-accent-blue' : 'group-hover:text-accent-blue'}`} />
                      {item.to === '/notifications' && unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#030712]" />
                      )}
                    </div>
                    <span className="font-black text-[10px] tracking-[0.2em] uppercase flex-1">{item.label}</span>
                    {item.to === '/notifications' && unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </Link>
                ))}
              </div>

              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-4 px-6 py-4 text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-colors border-t border-white/5 mt-4"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-black text-[10px] tracking-[0.2em] uppercase text-left">LOGOUT</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
