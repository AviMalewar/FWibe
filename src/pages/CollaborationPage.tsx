import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../firebase/firebaseConfig';
import { collection, query, orderBy, onSnapshot, addDoc, Timestamp, where } from 'firebase/firestore';
import { Plus, Users, Calendar, Clock, Sparkles, Zap, MessageSquare, Share2 } from 'lucide-react';

interface CollaborationPost {
  id: string;
  authorId: string;
  authorName: string;
  authorImage: string;
  title: string;
  description: string;
  lookingFor: string;
  deadline: string;
  createdAt: Timestamp;
  tags: string[];
}

export default function CollaborationPage() {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<CollaborationPost[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState({
    title: '',
    description: '',
    lookingFor: '',
    deadline: '',
    tags: ''
  });

  useEffect(() => {
    const postsRef = collection(db, "collaboration_posts");
    const q = query(postsRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedPosts: CollaborationPost[] = [];
      snapshot.forEach((doc) => {
        fetchedPosts.push({ id: doc.id, ...doc.data() } as CollaborationPost);
      });
      setPosts(fetchedPosts);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    try {
      await addDoc(collection(db, "collaboration_posts"), {
        authorId: user.uid,
        authorName: profile.name || 'Anonymous',
        authorImage: profile.profileImage || '',
        title: newPost.title,
        description: newPost.description,
        lookingFor: newPost.lookingFor,
        deadline: newPost.deadline,
        tags: newPost.tags.split(',').map(t => t.trim()).filter(t => t),
        createdAt: Timestamp.now()
      });
      setIsModalOpen(false);
      setNewPost({ title: '', description: '', lookingFor: '', deadline: '', tags: '' });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] pt-24 pb-20 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center shadow-lg shadow-accent-blue/20">
                <Users className="w-7 h-7 text-white" />
              </div>
              <span className="text-xs font-black tracking-[0.4em] text-accent-blue uppercase">Neural Network</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-display font-black tracking-tighter text-white uppercase leading-none">
              COLLAB <span className="gradient-text">HUB</span>
            </h1>
            <p className="text-white/40 text-lg mt-6 max-w-xl font-medium">
              Find the perfect partners for your next big project. Connect with developers, designers, and visionaries.
            </p>
          </motion.div>

          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsModalOpen(true)}
            className="gradient-btn px-8 py-4 flex items-center gap-3 text-lg"
          >
            <Plus className="w-6 h-6" />
            Create Post
          </motion.button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-40">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-accent-blue"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <AnimatePresence mode="popLayout">
              {posts.map((post, index) => (
                <motion.div
                  key={post.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.1 }}
                  className="glass-card p-8 group hover:border-accent-blue/30 transition-all relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-accent-blue/10 to-transparent blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="flex items-start justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl overflow-hidden border border-white/10 shadow-xl">
                        <img 
                          src={post.authorImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.authorName}`} 
                          alt={post.authorName} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div>
                        <h3 className="text-white font-display font-black uppercase tracking-wider">{post.authorName}</h3>
                        <p className="text-[10px] text-white/20 font-black tracking-[0.2em] uppercase">
                          {post.createdAt?.toDate?.()?.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-accent-purple" />
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{post.deadline}</span>
                    </div>
                  </div>

                  <h2 className="text-3xl font-display font-black text-white mb-4 uppercase tracking-tight group-hover:text-accent-blue transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-white/40 mb-8 line-clamp-3 font-medium leading-relaxed text-lg">
                    {post.description}
                  </p>

                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
                    <div className="flex items-center gap-3 mb-3">
                      <Sparkles className="w-5 h-5 text-accent-blue" />
                      <span className="text-[10px] font-black text-accent-blue uppercase tracking-[0.2em]">Looking For</span>
                    </div>
                    <p className="text-white text-lg font-bold">{post.lookingFor}</p>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-8">
                    {post.tags?.map((tag, i) => (
                      <span key={i} className="px-4 py-1.5 rounded-full bg-accent-blue/10 border border-accent-blue/20 text-[10px] font-black text-accent-blue uppercase tracking-widest">
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-4 pt-8 border-t border-white/10">
                    <button className="flex-1 gradient-btn py-4 flex items-center justify-center gap-3 group/btn">
                      <Zap className="w-5 h-5 fill-current" />
                      Apply Now
                    </button>
                    <button className="p-4 rounded-2xl bg-white/5 border border-white/10 text-white/30 hover:text-white hover:bg-white/10 transition-all">
                      <Share2 className="w-6 h-6" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Create Post Modal */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsModalOpen(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-xl"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-2xl glass-card p-10 overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-accent-blue via-accent-purple to-accent-pink" />
                
                <h2 className="text-4xl font-display font-black text-white mb-8 uppercase tracking-tighter">CREATE <span className="gradient-text">POST</span></h2>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-3">Project Title</label>
                    <input
                      required
                      type="text"
                      value={newPost.title}
                      onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-accent-blue/50 transition-all font-medium"
                      placeholder="e.g. Looking for 2 React developers"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-3">Description</label>
                    <textarea
                      required
                      rows={4}
                      value={newPost.description}
                      onChange={(e) => setNewPost({ ...newPost, description: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-accent-blue/50 transition-all font-medium resize-none"
                      placeholder="Tell us about your project..."
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-3">Looking For</label>
                      <input
                        required
                        type="text"
                        value={newPost.lookingFor}
                        onChange={(e) => setNewPost({ ...newPost, lookingFor: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-accent-blue/50 transition-all font-medium"
                        placeholder="e.g. Frontend, UI/UX"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-3">Deadline</label>
                      <input
                        required
                        type="text"
                        value={newPost.deadline}
                        onChange={(e) => setNewPost({ ...newPost, deadline: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-accent-blue/50 transition-all font-medium"
                        placeholder="e.g. 3 days"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-3">Tags (comma separated)</label>
                    <input
                      type="text"
                      value={newPost.tags}
                      onChange={(e) => setNewPost({ ...newPost, tags: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-accent-blue/50 transition-all font-medium"
                      placeholder="react, hackathon, web"
                    />
                  </div>
                  
                  <div className="flex gap-4 pt-6">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-[2] gradient-btn py-4"
                    >
                      Post Collaboration
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
