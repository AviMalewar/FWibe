import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../firebase/firebaseConfig';
import { collection, query, where, orderBy, onSnapshot, Timestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Bell, Zap, MessageSquare, UserPlus, Heart, Star, Check, X } from 'lucide-react';
import { acceptConnectionRequest, declineConnectionRequest } from '../services/socialService';

interface Notification {
  id: string;
  userId: string;
  type: 'match' | 'message' | 'collab' | 'system' | 'connection_request' | 'connection_accepted';
  title: string;
  message: string;
  fromId?: string;
  requestId?: string;
  read: boolean;
  actioned?: boolean;
  createdAt: Timestamp;
}

export default function NotificationsPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const notificationsRef = collection(db, "notifications");
    const q = query(
      notificationsRef,
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: Notification[] = [];
      snapshot.forEach((doc) => {
        fetched.push({ id: doc.id, ...doc.data() } as Notification);
      });
      fetched.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });
      setNotifications(fetched);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const markAsRead = async (id: string, actioned?: boolean) => {
    try {
      const notifRef = doc(db, "notifications", id);
      const updateData: any = { read: true };
      if (actioned !== undefined) {
        updateData.actioned = actioned;
      }
      await updateDoc(notifRef, updateData);
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'match': return <Heart className="w-6 h-6 text-pink-500" />;
      case 'message': return <MessageSquare className="w-6 h-6 text-accent-blue" />;
      case 'collab': return <UserPlus className="w-6 h-6 text-accent-purple" />;
      case 'connection_request': return <UserPlus className="w-6 h-6 text-accent-blue" />;
      case 'connection_accepted': return <Check className="w-6 h-6 text-emerald-500" />;
      default: return <Zap className="w-6 h-6 text-accent-blue" />;
    }
  };

  const handleAccept = async (notif: Notification) => {
    console.log('handleAccept called', { notif, user });
    if (!user || !notif.requestId || !notif.fromId) {
      console.error('Missing data for accept', { user, requestId: notif.requestId, fromId: notif.fromId });
      return;
    }
    try {
      await acceptConnectionRequest(notif.requestId, notif.fromId, user.uid, profile?.name || 'Someone');
      await markAsRead(notif.id, true);
      navigate(`/profile/${notif.fromId}`);
    } catch (err) {
      console.error('Error accepting request', err);
    }
  };

  const handleDecline = async (notif: Notification) => {
    if (!notif.requestId) return;
    try {
      await declineConnectionRequest(notif.requestId);
      await markAsRead(notif.id, true);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] pt-24 pb-20 px-4 md:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center shadow-lg shadow-accent-blue/20 relative">
                <Bell className="w-7 h-7 text-white" />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-[#030712]">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </div>
              <span className="text-xs font-black tracking-[0.4em] text-accent-blue uppercase">Neural Center</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-display font-black tracking-tighter text-white uppercase leading-none">
              NOTIFI<span className="gradient-text">CATIONS</span>
            </h1>
          </motion.div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-40">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-accent-blue"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="glass-card p-20 text-center">
            <div className="w-24 h-24 rounded-[2.5rem] bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-8">
              <Bell className="w-12 h-12 text-white/10" />
            </div>
            <h2 className="text-3xl font-display font-black text-white mb-4 uppercase tracking-widest">Quiet in the Matrix</h2>
            <p className="text-white/30 text-lg font-medium">You're all caught up. New signals will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {notifications.map((notif, index) => (
                <motion.div
                  key={notif.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={async () => {
                    if (!notif.read) {
                      await markAsRead(notif.id);
                    }
                    if (notif.fromId) {
                      navigate(`/profile/${notif.fromId}`);
                    }
                  }}
                  className={`glass-card p-6 flex items-start gap-6 group transition-all relative overflow-hidden cursor-pointer ${!notif.read ? 'border-accent-blue/30 bg-accent-blue/5' : 'hover:bg-white/5'}`}
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${!notif.read ? 'bg-accent-blue/20' : 'bg-white/5'}`}>
                    {getIcon(notif.type)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xl font-display font-black text-white uppercase tracking-wider">{notif.title}</h3>
                      <span className="text-[10px] text-white/20 font-black tracking-[0.2em] uppercase">
                        {notif.createdAt?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-white/40 font-medium text-lg leading-relaxed mb-4">
                      {notif.message}
                    </p>
                    {notif.type === 'connection_request' && !notif.actioned ? (
                      <div className="flex items-center gap-4 mt-4">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleAccept(notif); }}
                          className="px-6 py-2 rounded-xl bg-accent-blue text-white font-black text-[10px] tracking-widest uppercase hover:scale-105 transition-transform flex items-center gap-2"
                        >
                          <Check className="w-4 h-4" />
                          Accept
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDecline(notif); }}
                          className="px-6 py-2 rounded-xl bg-white/5 text-white/40 font-black text-[10px] tracking-widest uppercase hover:bg-white/10 hover:text-white transition-colors flex items-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          Decline
                        </button>
                      </div>
                    ) : !notif.read && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); markAsRead(notif.id); }}
                        className="flex items-center gap-2 text-[10px] font-black text-accent-blue uppercase tracking-[0.2em] hover:text-white transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        Mark as read
                      </button>
                    )}
                  </div>

                  {!notif.read && (
                    <div className="absolute top-6 right-6 w-2 h-2 rounded-full bg-accent-blue shadow-lg shadow-accent-blue/50" />
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
