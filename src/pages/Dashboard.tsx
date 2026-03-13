import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth, UserProfile } from '../hooks/useAuth';
import { db } from '../firebase/firebaseConfig';
import { collection, query, where, getDocs, limit, onSnapshot } from 'firebase/firestore';
import { Zap, MessageSquare, User, Sparkles, Heart, UserPlus, Clock, Lock, Check, Grid, Share2, ThumbsUp, MessageCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { sendConnectionRequest, toggleFavorite, getFeed, toggleLike, addComment, Post } from '../services/socialService';

export default function Dashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectionRequests, setConnectionRequests] = useState<any[]>([]);
  const [feedPosts, setFeedPosts] = useState<Post[]>([]);

  useEffect(() => {
    const fetchMatches = async () => {
      if (!user || !profile) return;
      
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("profileComplete", "==", true), limit(50));
        const querySnapshot = await getDocs(q);
        
        const otherUsers: UserProfile[] = [];
        querySnapshot.forEach((doc) => {
          if (doc.id !== user.uid) {
            otherUsers.push({ uid: doc.id, ...doc.data() } as UserProfile);
          }
        });

        // Improved match score calculation
        const scoredMatches = otherUsers.map(other => {
          let score = 35; // Base "Vibe" potential
          const categories = ['skills', 'music', 'movies', 'hobbies', 'goals'];
          const commonVibeKeywords: string[] = [];
          const potentialVibes: string[] = [];
          let hasCommonInterests = false;
          
          categories.forEach(cat => {
            const myInterests = (profile as any)[cat] || [];
            const otherInterests = (other as any)[cat] || [];
            const common = myInterests.filter((i: string) => 
              otherInterests.some((oi: string) => oi.toLowerCase() === i.toLowerCase())
            );
            const different = otherInterests.filter((i: string) => 
              !myInterests.some((mi: string) => mi.toLowerCase() === i.toLowerCase())
            );
            
            if (common.length > 0) {
              score += common.length * 15;
              hasCommonInterests = true;
              commonVibeKeywords.push(...common.slice(0, 2));
            }
            if (different.length > 0) potentialVibes.push(...different.slice(0, 1));
          });

          // Bonus for having any common interests
          if (hasCommonInterests) score += 15;

          // Academic & Location matches
          if (other.college && profile.college && other.college.toLowerCase() === profile.college.toLowerCase()) score += 20;
          if (other.course && profile.course && other.course.toLowerCase() === profile.course.toLowerCase()) score += 15;
          if (other.year && profile.year && other.year === profile.year) score += 10;
          if (other.location && profile.location && other.location.toLowerCase() === profile.location.toLowerCase()) score += 10;
          
          // Personality & Lifestyle
          if (other.personality && profile.personality && other.personality === profile.personality) score += 15;
          if (other.availability && profile.availability && other.availability === profile.availability) score += 5;

          // Small random "Chemistry" factor (0-10%)
          const chemistry = Math.floor(Math.random() * 11);
          score += chemistry;
          
          return { 
            ...other, 
            matchScore: Math.min(score, 99), 
            commonVibeKeywords: [...new Set(commonVibeKeywords)],
            potentialVibes: [...new Set(potentialVibes)].slice(0, 3)
          };
        }).sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

        setMatches(scoredMatches);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();

    if (user) {
      const q = query(collection(db, 'connectionRequests'), where('fromId', '==', user.uid));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setConnectionRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      
      const unsubscribeFeed = getFeed((posts) => {
        setFeedPosts(posts);
      });

      return () => {
        unsubscribe();
        unsubscribeFeed();
      };
    }
  }, [user, profile]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-blue"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 mb-16"
      >
        <div>
          <h1 className="text-5xl md:text-6xl font-display font-black tracking-tighter text-white mb-4 leading-tight uppercase">
            Your Top <span className="gradient-text">Matches.</span>
          </h1>
          <p className="text-white/50 text-lg max-w-xl font-medium">Based on your unique vibe and shared interests.</p>
        </div>
        <div className="flex items-center gap-6 p-6 glass-card rounded-3xl">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-blue via-accent-purple to-accent-pink flex items-center justify-center shadow-lg shadow-accent-purple/20">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase">Vibe Score</span>
            <span className="text-2xl font-black text-white">98% Match</span>
          </div>
        </div>
      </motion.div>

      {matches.length === 0 ? (
        <div className="text-center py-32 glass-card border-dashed">
          <User className="w-20 h-20 text-white/10 mx-auto mb-8" />
          <h3 className="text-2xl font-bold text-white mb-4 uppercase tracking-widest">No matches yet</h3>
          <p className="text-white/40 max-md mx-auto font-medium">Try updating your profile with more interests or checking back later as more students join.</p>
        </div>
      ) : (
        <div className="space-y-20">
          {/* AI Suggestions Section */}
          <section className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-accent-purple/10 border border-accent-purple/20 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-accent-purple" />
              </div>
              <div>
                <h2 className="text-2xl font-display font-black text-white tracking-tight uppercase tracking-widest">AI Suggestions</h2>
                <p className="text-white/30 text-[10px] font-black uppercase tracking-widest">Hand-picked for your goals</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="glass-card p-8 border-accent-purple/20 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4">
                  <div className="px-3 py-1 rounded-full bg-accent-purple/20 text-accent-purple text-[10px] font-black uppercase tracking-widest">Recommended</div>
                </div>
                <div className="flex items-start gap-6">
                  <div className="w-20 h-20 rounded-3xl overflow-hidden bg-white/10 border border-white/10">
                    <img src={matches[0].profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${matches[0].gender === 'female' ? 'female-' : 'male-'}${matches[0].uid}`} alt={matches[0].name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex-1 space-y-4">
                    <div>
                      <h4 className="text-xl font-bold text-white uppercase tracking-tight">{matches[0].name}</h4>
                      <p className="text-accent-purple text-[10px] font-black uppercase tracking-widest">{matches[0].college}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Why this match?</p>
                      <ul className="space-y-1">
                        {matches[0].commonVibeKeywords && matches[0].commonVibeKeywords.length > 0 ? (
                          matches[0].commonVibeKeywords.slice(0, 2).map((keyword: string, i: number) => (
                            <li key={i} className="text-xs text-white/60 flex items-center gap-2 font-medium">
                              <div className="w-1 h-1 rounded-full bg-accent-purple" />
                              Shared interest in {keyword}
                            </li>
                          ))
                        ) : (
                          <li className="text-xs text-white/60 flex items-center gap-2 font-medium">
                            <div className="w-1 h-1 rounded-full bg-accent-purple" />
                            High overall vibe compatibility
                          </li>
                        )}
                        {matches[0].college === profile?.college && (
                          <li className="text-xs text-white/60 flex items-center gap-2 font-medium">
                            <div className="w-1 h-1 rounded-full bg-accent-purple" />
                            Same college community
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass-card p-8 border-accent-pink/20 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4">
                  <div className="px-3 py-1 rounded-full bg-accent-pink/20 text-accent-pink text-[10px] font-black uppercase tracking-widest">Collaboration</div>
                </div>
                <div className="flex items-start gap-6">
                  <div className="w-20 h-20 rounded-3xl bg-accent-pink/10 border border-accent-pink/20 flex items-center justify-center">
                    <Zap className="w-10 h-10 text-accent-pink" />
                  </div>
                  <div className="flex-1 space-y-4">
                    <div>
                      <h4 className="text-xl font-bold text-white uppercase tracking-tight">Hackathon Team</h4>
                      <p className="text-accent-pink text-[10px] font-black uppercase tracking-widest">Trending Opportunity</p>
                    </div>
                    <p className="text-xs text-white/60 leading-relaxed font-medium">
                      Based on your {profile?.skills?.[0] || 'React'} skills, you'd be a great fit for the upcoming FinTech Hackathon.
                    </p>
                    <button className="text-[10px] font-black text-accent-pink uppercase tracking-widest hover:underline">View Details</button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Top Matches Grid */}
          <section className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center">
                <Heart className="w-6 h-6 text-accent-blue" />
              </div>
              <div>
                <h2 className="text-2xl font-display font-black text-white tracking-tight uppercase tracking-widest">Top Matches</h2>
                <p className="text-white/30 text-[10px] font-black uppercase tracking-widest">Students with similar vibes</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {matches.map((match, idx) => {
                const status = getConnectionStatus(match.uid);
                const isFavorite = profile?.favorites?.includes(match.uid);
                const isLocked = (match.matchScore || 0) < 15; // Lowered threshold to 15

                return (
                  <motion.div
                    key={match.uid}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    className="group relative p-8 glass-card hover:border-accent-blue/30 transition-all hover:shadow-accent-blue/10"
                  >
                    <div className="absolute top-8 right-8 px-4 py-1.5 rounded-full bg-gradient-to-r from-accent-blue to-accent-purple text-white text-[10px] font-black tracking-widest uppercase shadow-lg shadow-accent-blue/20">
                      {match.matchScore}% Match
                    </div>
                    
                    <Link to={`/profile/${match.uid}`} className="flex items-center gap-6 mb-8 group/link">
                      <div className="w-20 h-20 rounded-3xl overflow-hidden bg-white/10 border border-white/10 shadow-xl group-hover/link:scale-110 transition-transform">
                        <img 
                          src={match.profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${match.gender === 'female' ? 'female-' : 'male-'}${match.uid}`} 
                          alt={match.name} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-white mb-1 uppercase tracking-tight group-hover/link:text-accent-blue transition-colors">{match.name}</h3>
                        <p className="text-accent-blue text-xs font-black uppercase tracking-widest">{match.college || 'University'}</p>
                      </div>
                    </Link>

                    <div className="space-y-6 mb-10">
                      <div className="space-y-2">
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Matched Factors</p>
                        <div className="flex flex-wrap gap-2">
                          {(match.commonVibeKeywords || []).slice(0, 4).map((item: string) => (
                            <span key={item} className="px-4 py-1.5 rounded-xl bg-accent-blue/10 border border-accent-blue/20 text-[10px] font-bold text-accent-blue uppercase tracking-widest">
                              {item}
                            </span>
                          ))}
                          {(!match.commonVibeKeywords || match.commonVibeKeywords.length === 0) && (
                            <span className="text-white/20 text-[10px] font-bold uppercase tracking-widest italic">Exploring vibes...</span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Potential Vibes</p>
                        <div className="flex flex-wrap gap-2">
                          {(match.potentialVibes || []).map((item: string) => (
                            <span key={item} className="px-4 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold text-white/40 uppercase tracking-widest">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Neural Vibe Analysis</p>
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                          <p className="text-xs text-white/60 leading-relaxed font-medium">
                            {match.commonVibeKeywords && match.commonVibeKeywords.length > 0 ? (
                              <>
                                High compatibility in <span className="text-accent-blue font-bold">{match.commonVibeKeywords[0]}</span> and <span className="text-accent-purple font-bold">{match.commonVibeKeywords[1] || match.skills?.[0] || 'shared goals'}</span>. Both are currently focused on <span className="text-accent-pink font-bold">{match.goals?.[0] || 'growth'}</span>.
                              </>
                            ) : (
                              <>
                                Strong potential for connection based on <span className="text-accent-blue font-bold">{match.college || 'campus'}</span> vibes. You both value <span className="text-accent-pink font-bold">{match.goals?.[0] || 'personal growth'}</span>.
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {isLocked ? (
                        <button 
                          disabled
                          className="flex-1 py-4 rounded-2xl bg-white/5 text-white/20 text-sm font-bold border border-white/10 flex items-center justify-center gap-2 cursor-not-allowed"
                        >
                          <Lock className="w-5 h-5" />
                          Chat Locked
                        </button>
                      ) : (
                        <Link 
                          to={`/messages/${match.uid}`}
                          className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-accent-blue to-accent-purple text-white text-sm font-bold shadow-lg shadow-accent-blue/20 transition-all flex items-center justify-center gap-2 hover:scale-105 active:scale-95"
                        >
                          <MessageSquare className="w-5 h-5" />
                          Chat
                        </Link>
                      )}

                      {status === 'connected' ? (
                        <div className="p-4 rounded-2xl bg-accent-blue/10 border border-accent-blue/20 text-accent-blue">
                          <Check className="w-6 h-6" />
                        </div>
                      ) : status === 'pending' ? (
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-white/40">
                          <Clock className="w-6 h-6" />
                        </div>
                      ) : (
                        <button 
                          onClick={() => handleConnect(match.uid)}
                          className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all hover:scale-105 active:scale-95"
                        >
                          <UserPlus className="w-6 h-6" />
                        </button>
                      )}

                      <button 
                        onClick={() => handleFavorite(match.uid)}
                        className={`p-4 rounded-2xl border transition-all hover:scale-105 active:scale-95 ${isFavorite ? 'bg-accent-pink/20 border-accent-pink/30 text-accent-pink' : 'bg-white/5 border-white/10 text-white/20 hover:text-white/40'}`}
                      >
                        <Heart className={`w-6 h-6 ${isFavorite ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>

          {/* Campus Feed Section */}
          <section className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center">
                <Grid className="w-6 h-6 text-accent-blue" />
              </div>
              <div>
                <h2 className="text-2xl font-display font-black text-white tracking-tight uppercase tracking-widest">Campus Feed</h2>
                <p className="text-white/30 text-[10px] font-black uppercase tracking-widest">Latest vibes from everyone</p>
              </div>
            </div>

            <div className="max-w-2xl mx-auto w-full space-y-8">
              {feedPosts.length === 0 ? (
                <div className="py-20 text-center glass-card border-dashed">
                  <Grid className="w-16 h-16 text-white/10 mx-auto mb-6" />
                  <p className="text-white/40 font-black uppercase tracking-widest">No posts yet.</p>
                </div>
              ) : (
                feedPosts.map((post) => (
                  <div key={post.id} className="glass-card p-8 space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 cursor-pointer" onClick={() => navigate(`/profile/${post.authorId}`)}>
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/10">
                          <img src={post.authorImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.authorGender === 'female' ? 'female-' : 'male-'}${post.authorId}`} alt={post.authorName} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white uppercase tracking-tight hover:text-accent-blue transition-colors">{post.authorName}</h4>
                          <p className="text-[10px] text-white/20 font-black uppercase tracking-widest">
                            {post.createdAt?.toDate?.()?.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <button className="text-white/20 hover:text-white transition-colors">
                        <Share2 className="w-5 h-5" />
                      </button>
                    </div>
                    <p className="text-white/80 leading-relaxed">{post.content}</p>
                    {post.imageUrl && (
                      <div className="rounded-2xl overflow-hidden border border-white/10">
                        <img src={post.imageUrl} alt="Post" className="w-full h-auto" referrerPolicy="no-referrer" />
                      </div>
                    )}
                    <div className="flex items-center gap-6 pt-4 border-t border-white/5">
                      <button 
                        onClick={() => user && toggleLike(post.id, user.uid, (post.likes || []).includes(user.uid))}
                        className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors ${
                          user && (post.likes || []).includes(user.uid) ? 'text-accent-pink' : 'text-white/20 hover:text-white/40'
                        }`}
                      >
                        <ThumbsUp className={`w-5 h-5 ${user && (post.likes || []).includes(user.uid) ? 'fill-current' : ''}`} />
                        {(post.likes || []).length} Likes
                      </button>
                      <button 
                        onClick={() => {
                          const comment = prompt('Enter your comment:');
                          if (comment && user && profile) {
                            addComment(post.id, user.uid, profile.name || 'Anonymous', comment);
                          }
                        }}
                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-white/40 transition-colors"
                      >
                        <MessageCircle className="w-5 h-5" />
                        {post.comments?.length || 0} Comments
                      </button>
                    </div>

                    {/* Comments List */}
                    {post.comments && post.comments.length > 0 && (
                      <div className="space-y-4 pt-4">
                        {post.comments.map((comment) => (
                          <div key={comment.id} className="flex gap-3 text-sm">
                            <div className="font-bold text-accent-blue uppercase tracking-tight">{comment.userName}:</div>
                            <div className="text-white/60">{comment.content}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
