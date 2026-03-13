import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth, UserProfile } from '../hooks/useAuth';
import { db } from '../firebase/firebaseConfig';
import { collection, query, where, getDocs, limit, onSnapshot } from 'firebase/firestore';
import { Search, User, Sparkles, MessageSquare, Music, Film, Gamepad2, Heart, Zap, Globe, Code, UserPlus, Check, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { sendConnectionRequest, toggleFavorite } from '../services/socialService';

export default function Discover() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [connectionRequests, setConnectionRequests] = useState<any[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!user) return;
      try {
        const usersRef = collection(db, "users");
        // Fetch all students who have completed profiles
        const q = query(usersRef, where("profileComplete", "==", true), limit(100));
        const querySnapshot = await getDocs(q);
        
        const allUsers: UserProfile[] = [];
        querySnapshot.forEach((doc) => {
          if (doc.id !== user.uid) {
            allUsers.push({ uid: doc.id, ...doc.data() } as UserProfile);
          }
        });

        setUsers(allUsers);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();

    // Listen for connection requests to show status
    if (user) {
      const q = query(collection(db, 'connectionRequests'), where('fromId', '==', user.uid));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setConnectionRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsubscribe();
    }
  }, [user]);

  const getConnectionStatus = (targetId: string) => {
    if (profile?.friends?.includes(targetId)) return 'connected';
    const request = connectionRequests.find(r => r.toId === targetId);
    if (request) return request.status;
    return null;
  };

  const handleConnect = async (targetId: string) => {
    if (!user) return;
    try {
      await sendConnectionRequest(user.uid, targetId, profile?.name || 'Someone');
    } catch (err) {
      console.error(err);
    }
  };

  const handleFavorite = async (targetId: string) => {
    if (!user || !profile) return;
    const isFavorite = profile.favorites?.includes(targetId);
    try {
      await toggleFavorite(user.uid, targetId, !!isFavorite);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const searchStr = `${u.name} ${u.college} ${u.goals?.join(' ')} ${u.skills?.join(' ')}`.toLowerCase();
      return searchStr.includes(searchQuery.toLowerCase());
    });
  }, [users, searchQuery]);

  const getInterestIcon = (interest: string) => {
    const lower = interest.toLowerCase();
    if (lower.includes('music') || lower.includes('song')) return <Music className="w-3 h-3" />;
    if (lower.includes('movie') || lower.includes('film') || lower.includes('cinema')) return <Film className="w-3 h-3" />;
    if (lower.includes('game') || lower.includes('gaming')) return <Gamepad2 className="w-3 h-3" />;
    if (lower.includes('code') || lower.includes('dev') || lower.includes('tech')) return <Code className="w-3 h-3" />;
    if (lower.includes('travel') || lower.includes('world')) return <Globe className="w-3 h-3" />;
    return <Sparkles className="w-3 h-3" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-40">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-accent-blue"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] pt-24 pb-20 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center shadow-lg shadow-accent-blue/20">
                <Globe className="w-7 h-7 text-white" />
              </div>
              <span className="text-xs font-black tracking-[0.4em] text-accent-blue uppercase">Campus Network</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-display font-black tracking-tighter text-white uppercase leading-none">
              MEET YOUR <span className="gradient-text">PEERS.</span>
            </h1>
            <p className="text-white/40 text-lg mt-6 max-w-xl font-medium">
              Discover students across campus. Connect to build your network and vibe with like-minded peers.
            </p>
          </motion.div>

          {/* Search Bar */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full md:w-96 relative group"
          >
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-accent-blue transition-colors" />
            <input 
              type="text" 
              placeholder="Search by name, course, or vibe..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-14 pr-8 text-white focus:outline-none focus:border-accent-blue/50 focus:ring-8 focus:ring-accent-blue/5 transition-all font-medium"
            />
          </motion.div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          <AnimatePresence mode="popLayout">
            {filteredUsers.map((u, idx) => {
              const status = getConnectionStatus(u.uid);
              const isFavorite = profile?.favorites?.includes(u.uid);

              const myInterests = [...(profile?.music || []), ...(profile?.hobbies || [])];
              const userInterests = [...(u.music || []), ...(u.hobbies || [])];
              const matchedFactors = userInterests.filter(item => myInterests.includes(item));
              const displayFactors = matchedFactors.length > 0 ? matchedFactors : userInterests;

              return (
                <motion.div
                  key={u.uid}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group relative glass-card p-6 hover:border-accent-purple/40 transition-all hover:shadow-[0_0_30px_rgba(124,58,237,0.1)] overflow-hidden"
                >
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all z-30 flex flex-col items-center justify-center gap-4 p-8">
                    <button 
                      onClick={() => navigate(`/profile/${u.uid}`)}
                      className="w-full py-4 rounded-2xl bg-white text-black font-black text-xs tracking-widest uppercase hover:scale-105 transition-transform"
                    >
                      View Profile
                    </button>
                    
                    {status === 'connected' ? (
                      <button 
                        onClick={() => navigate(`/messages/${u.uid}`)}
                        className="w-full py-4 rounded-2xl bg-gradient-to-r from-accent-blue to-accent-purple text-white font-black text-xs tracking-widest uppercase hover:scale-105 transition-transform flex items-center justify-center gap-2"
                      >
                        <MessageSquare className="w-4 h-4" />
                        Chat Now
                      </button>
                    ) : status === 'pending' ? (
                      <button 
                        disabled
                        className="w-full py-4 rounded-2xl bg-white/10 text-white/40 font-black text-xs tracking-widest uppercase flex items-center justify-center gap-2"
                      >
                        <Clock className="w-4 h-4" />
                        Pending
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleConnect(u.uid)}
                        className="w-full py-4 rounded-2xl bg-accent-blue text-white font-black text-xs tracking-widest uppercase hover:scale-105 transition-transform flex items-center justify-center gap-2"
                      >
                        <UserPlus className="w-4 h-4" />
                        Add Friend
                      </button>
                    )}
                  </div>

                  {/* Card Content */}
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-6">
                      <div className="w-20 h-20 rounded-3xl overflow-hidden bg-white/10 border border-white/10 shadow-2xl">
                        <img 
                          src={u.profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.gender === 'female' ? 'female-' : 'male-'}${u.uid}`} 
                          alt={u.name} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="flex flex-col items-end">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFavorite(u.uid);
                          }}
                          className={`p-2 rounded-xl transition-all ${isFavorite ? 'bg-accent-pink/20 text-accent-pink' : 'bg-white/5 text-white/20 hover:text-white/40'}`}
                        >
                          <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
                        </button>
                      </div>
                    </div>

                    <div className="mb-6">
                      <h3 className="text-2xl font-display font-black text-white leading-tight mb-1 uppercase tracking-tight">{u.name}</h3>
                      <p className="text-accent-blue text-[10px] font-black uppercase tracking-widest mb-1">{u.college || 'General Course'}</p>
                      <p className="text-white/30 text-[9px] font-black uppercase tracking-[0.2em]">Year 2 • Student</p>
                    </div>

                    <div className="mb-6">
                      <p className="text-white/50 text-xs italic font-medium leading-relaxed line-clamp-2">
                        "{u.goals?.[0] || 'Passionate student looking to vibe and collaborate on cool projects.'}"
                      </p>
                    </div>

                    {/* Matched Factors */}
                    <div className="space-y-3 mb-6">
                      <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">{matchedFactors.length > 0 ? 'Matched Factors' : 'Interests'}</p>
                      <div className="flex flex-wrap gap-2">
                        {displayFactors.slice(0, 3).map((item) => (
                          <div key={item} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[9px] font-bold uppercase tracking-widest ${matchedFactors.includes(item) ? 'bg-accent-blue/10 border-accent-blue/30 text-accent-blue' : 'bg-white/5 border-white/10 text-white/60'}`}>
                            {getInterestIcon(item)}
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Quick Connect Button (Mobile/Direct) */}
                    <div className="mb-6">
                      {status === 'connected' ? (
                        <button 
                          onClick={() => navigate(`/messages/${u.uid}`)}
                          className="w-full py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-black text-[10px] tracking-widest uppercase flex items-center justify-center gap-2"
                        >
                          <Check className="w-3 h-3" />
                          Friends
                        </button>
                      ) : status === 'pending' ? (
                        <button 
                          disabled
                          className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white/30 font-black text-[10px] tracking-widest uppercase flex items-center justify-center gap-2"
                        >
                          <Clock className="w-3 h-3" />
                          Pending
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleConnect(u.uid)}
                          className="w-full py-3 rounded-xl bg-accent-blue/10 border border-accent-blue/20 text-accent-blue hover:bg-accent-blue hover:text-white transition-all font-black text-[10px] tracking-widest uppercase flex items-center justify-center gap-2"
                        >
                          <UserPlus className="w-3 h-3" />
                          Add Friend
                        </button>
                      )}
                    </div>

                    {/* Footer Badges */}
                    <div className="flex items-center justify-between pt-6 border-t border-white/10">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-accent-pink/10 flex items-center justify-center">
                          <Heart className="w-3 h-3 text-accent-pink fill-current" />
                        </div>
                        <span className="text-[9px] font-black text-accent-pink uppercase tracking-widest">POP</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-accent-blue/10 flex items-center justify-center">
                          <Zap className="w-3 h-3 text-accent-blue fill-current" />
                        </div>
                        <span className="text-[9px] font-black text-accent-blue uppercase tracking-widest">MIX</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {filteredUsers.length === 0 && !loading && (
          <div className="text-center py-40 glass-card border-dashed">
            <User className="w-20 h-20 text-white/10 mx-auto mb-8" />
            <h3 className="text-3xl font-display font-black text-white mb-4 uppercase tracking-widest">No Peers Found</h3>
            <p className="text-white/40 text-lg font-medium max-w-xs mx-auto">Try adjusting your search query to find more students.</p>
          </div>
        )}
      </div>
    </div>
  );
}
