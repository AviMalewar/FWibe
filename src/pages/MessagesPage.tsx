import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth, UserProfile } from '../hooks/useAuth';
import { db, storage } from '../firebase/firebaseConfig';
import { collection, query, where, getDocs, addDoc, onSnapshot, orderBy, Timestamp, doc, getDoc, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Send, Search, MoreVertical, ArrowLeft, User, Zap, Sparkles, MessageSquare, Image as ImageIcon, Camera, Loader2, X, Users } from 'lucide-react';

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text?: string;
  imageUrl?: string;
  createdAt: Timestamp;
  status: 'sent' | 'delivered' | 'read';
}

export default function MessagesPage() {
  const { user, profile } = useAuth();
  const { receiverId } = useParams();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<UserProfile[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversations (Friends only)
  useEffect(() => {
    const fetchConversations = async () => {
      if (!user || !profile?.friends) {
        setLoading(false);
        return;
      }
      try {
        const convos: UserProfile[] = [];
        for (const friendId of profile.friends) {
          const userRef = doc(db, "users", friendId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            convos.push({ uid: userSnap.id, ...userSnap.data() } as UserProfile);
          }
        }
        setConversations(convos);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [user, profile]);

  // Fetch selected user profile
  useEffect(() => {
    const fetchSelectedUser = async () => {
      if (!receiverId) {
        setSelectedUser(null);
        return;
      }
      try {
        const userRef = doc(db, "users", receiverId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setSelectedUser({ uid: userSnap.id, ...userSnap.data() } as UserProfile);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchSelectedUser();
  }, [receiverId]);

  // Real-time message listener
  useEffect(() => {
    if (!user || !receiverId) {
      setMessages([]);
      return;
    }

    const messagesRef = collection(db, "messages");
    const q = query(
      messagesRef,
      where("participants", "array-contains", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (
          (data.senderId === user.uid && data.receiverId === receiverId) ||
          (data.senderId === receiverId && data.receiverId === user.uid)
        ) {
          msgs.push({ id: doc.id, ...data } as Message);
        }
      });
      msgs.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return aTime - bTime;
      });
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [user, receiverId]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !receiverId || (!newMessage.trim() && !imageFile)) return;

    setUploading(true);
    setError(null);
    try {
      let imageUrl = '';
      if (imageFile) {
        try {
          const imageRef = ref(storage, `chats/${user.uid}/${Date.now()}_${imageFile.name}`);
          
          const uploadPromise = uploadBytes(imageRef, imageFile);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Image upload timed out. Please check your connection.")), 30000)
          );
          
          const uploadResult = await Promise.race([uploadPromise, timeoutPromise]) as any;
          imageUrl = await getDownloadURL(uploadResult.ref);
        } catch (err: any) {
          console.error("Chat image upload failed:", err);
          throw new Error(`Image upload failed: ${err.message || 'Unknown error'}`);
        }
      }

      await addDoc(collection(db, "messages"), {
        senderId: user.uid,
        receiverId: receiverId,
        participants: [user.uid, receiverId],
        text: newMessage.trim() || null,
        imageUrl: imageUrl || null,
        createdAt: Timestamp.now(),
        status: 'sent'
      });

      setNewMessage('');
      setImageFile(null);
      setImagePreview(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to send message. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="h-screen flex bg-[#030712] overflow-hidden">
      {/* Sidebar */}
      <div className={`w-full md:w-80 lg:w-96 flex-shrink-0 border-r border-white/10 flex flex-col glass-card rounded-none ${receiverId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-8 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center shadow-lg shadow-accent-blue/20">
              <Zap className="w-6 h-6 text-white fill-current" />
            </div>
            <h1 className="text-2xl font-display font-black tracking-tighter text-white uppercase tracking-widest">HANGOUT</h1>
          </div>
          <button onClick={() => navigate('/dashboard')} className="p-3 rounded-xl hover:bg-white/5 text-white/30 hover:text-white transition-all">
            <ArrowLeft className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-accent-blue transition-colors" />
            <input 
              type="text" 
              placeholder="Search friends..." 
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-accent-blue/50 transition-all font-medium"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-accent-blue"></div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-20 px-6">
              <Users className="w-12 h-12 text-white/10 mx-auto mb-4" />
              <p className="text-white/30 text-xs font-black uppercase tracking-widest">No friends yet. Connect with students in Discover!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map((convo) => (
                <button
                  key={convo.uid}
                  onClick={() => navigate(`/messages/${convo.uid}`)}
                  className={`w-full p-5 rounded-[1.5rem] flex items-center gap-5 transition-all group relative overflow-hidden ${
                    receiverId === convo.uid 
                      ? 'bg-gradient-to-r from-accent-blue/20 to-accent-purple/20 border border-accent-blue/30' 
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white/10 border border-white/10 shadow-xl">
                      <img 
                        src={convo.profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${convo.gender === 'female' ? 'female-' : 'male-'}${convo.uid}`} 
                        alt={convo.name} 
                        className="w-full h-full object-cover transition-transform group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-4 border-[#030712] shadow-lg" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-display font-black text-white text-base uppercase tracking-wider">{convo.name}</span>
                      <span className="text-[9px] text-white/20 font-black tracking-[0.2em] uppercase">Active</span>
                    </div>
                    <p className="text-xs text-accent-blue font-black uppercase tracking-widest">Neural Match Found</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col bg-[#030712] relative ${!receiverId ? 'hidden md:flex' : 'flex'}`}>
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="h-24 px-8 border-b border-white/10 flex items-center justify-between backdrop-blur-xl bg-[#030712]/60 z-10">
              <div className="flex items-center gap-5">
                <button onClick={() => navigate('/messages')} className="md:hidden p-3 rounded-xl hover:bg-white/5 text-white/30">
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="w-12 h-12 rounded-2xl overflow-hidden bg-white/10 border border-white/10 shadow-2xl">
                  <img 
                    src={selectedUser.profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedUser.gender === 'female' ? 'female-' : 'male-'}${selectedUser.uid}`} 
                    alt={selectedUser.name} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <h2 className="font-display font-black text-xl text-white leading-none mb-2 uppercase tracking-widest">{selectedUser.name}</h2>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-lg" />
                    <span className="text-[10px] font-black tracking-[0.2em] uppercase text-emerald-500">Online</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="hidden lg:flex items-center gap-3 px-6 py-2.5 rounded-2xl bg-accent-blue/10 border border-accent-blue/20 backdrop-blur-md">
                  <Sparkles className="w-4 h-4 text-accent-blue" />
                  <span className="text-[10px] font-black tracking-[0.2em] text-accent-blue uppercase">98% Neural Match</span>
                </div>
                <button className="p-3 rounded-2xl hover:bg-white/5 text-white/30 hover:text-white transition-all">
                  <MoreVertical className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-accent-blue/5 via-transparent to-transparent">
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-sm font-bold flex items-center justify-between animate-in fade-in slide-in-from-top-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    {error}
                  </div>
                  <button onClick={() => setError(null)} className="p-1 hover:bg-white/5 rounded-lg transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              {messages.map((msg) => {
                const isMe = msg.senderId === user?.uid;
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[70%] p-4 md:p-6 rounded-[2rem] text-sm font-medium leading-relaxed shadow-2xl relative ${
                      isMe 
                        ? 'bg-gradient-to-br from-accent-blue to-accent-purple text-white rounded-tr-none shadow-accent-blue/20' 
                        : 'bg-white/5 border border-white/10 text-white rounded-tl-none backdrop-blur-md'
                    }`}>
                      {msg.imageUrl && (
                        <div className="mb-4 rounded-2xl overflow-hidden border border-white/10">
                          <img src={msg.imageUrl} alt="Shared" className="w-full h-auto max-h-96 object-cover" />
                        </div>
                      )}
                      {msg.text && <p>{msg.text}</p>}
                      <div className="flex items-center justify-between mt-3">
                        <div className={`text-[9px] font-black tracking-[0.2em] uppercase ${isMe ? 'text-white/40' : 'text-white/20'}`}>
                          {msg.createdAt?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {isMe && (
                          <div className="text-[9px] font-black text-accent-blue uppercase tracking-widest">
                            {msg.status || 'sent'}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-8 border-t border-white/10 backdrop-blur-xl bg-[#030712]/60">
              <AnimatePresence>
                {imagePreview && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="mb-6 relative w-32 h-32 rounded-2xl overflow-hidden border-2 border-accent-blue shadow-2xl"
                  >
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <button 
                      onClick={() => { setImagePreview(null); setImageFile(null); }}
                      className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white hover:bg-black/80"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSendMessage} className="flex items-center gap-5">
                <div className="flex items-center gap-2">
                  <label className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/40 hover:text-accent-blue transition-all cursor-pointer">
                    <input type="file" className="hidden" onChange={handleImageSelect} accept="image/*" />
                    <ImageIcon className="w-6 h-6" />
                  </label>
                </div>
                <div className="flex-1 relative group">
                  <input 
                    type="text" 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..." 
                    className="w-full bg-white/5 border border-white/10 rounded-[2rem] py-5 px-8 text-white focus:outline-none focus:border-accent-blue/50 focus:ring-8 focus:ring-accent-blue/5 transition-all font-medium"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={uploading || (!newMessage.trim() && !imageFile)}
                  className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-accent-blue to-accent-purple disabled:opacity-50 disabled:cursor-not-allowed text-white flex items-center justify-center shadow-2xl shadow-accent-blue/30 transition-all hover:scale-110 active:scale-90 group"
                >
                  {uploading ? <Loader2 className="w-7 h-7 animate-spin" /> : <Send className="w-7 h-7 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-accent-blue/5 via-transparent to-transparent blur-3xl" />
            <div className="w-32 h-32 rounded-[3rem] bg-white/5 border border-white/10 flex items-center justify-center mb-10 relative shadow-2xl">
              <MessageSquare className="w-14 h-14 text-white/5" />
              <div className="absolute -top-3 -right-3 w-12 h-12 rounded-2xl bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center shadow-2xl shadow-accent-blue/30 animate-bounce">
                <Zap className="w-6 h-6 text-white fill-current" />
              </div>
            </div>
            <h2 className="text-5xl font-display font-black tracking-tighter text-white mb-6 uppercase tracking-widest">Your Inbox</h2>
            <p className="text-white/30 text-lg max-w-sm mx-auto mb-12 leading-relaxed font-medium">
              Select a friend from the sidebar to start chatting using our secure neural link.
            </p>
            <button 
              onClick={() => navigate('/discover')}
              className="gradient-btn px-12 py-5 text-lg"
            >
              Discover Friends
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
