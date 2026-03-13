import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth, UserProfile } from '../hooks/useAuth';
import { db, storage } from '../firebase/firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs, orderBy, onSnapshot, documentId, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  Zap, MessageSquare, MapPin, Sparkles, Heart, Music, Film, Target, 
  ArrowLeft, Users, Grid, Settings, Camera, Plus, Share2, MessageCircle, ThumbsUp, Loader2, Edit3, Check, UserPlus, Clock, X
} from 'lucide-react';
import { Post, createPost, toggleLike, sendConnectionRequest, toggleFavorite, addComment, removeFriend, acceptConnectionRequest } from '../services/socialService';
import { updateUserProfile } from '../services/authService';

export default function ProfilePage() {
  const { user, profile: myProfile } = useAuth();
  const { uid } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'vibes' | 'friends' | 'feed' | 'photos'>(() => {
    return (sessionStorage.getItem('profileActiveTab') as any) || 'vibes';
  });

  useEffect(() => {
    sessionStorage.setItem('profileActiveTab', activeTab);
  }, [activeTab]);

  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [newPostContent, setNewPostContent] = useState('');
  const [postImageFile, setPostImageFile] = useState<File | null>(null);
  const [postImagePreview, setPostImagePreview] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'pending_sent' | 'pending_received' | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [showFriendsModal, setShowFriendsModal] = useState(false);

  useEffect(() => {
    const targetUid = uid || user?.uid;
    if (!targetUid) return;
    
    console.log("ProfilePage: Target UID:", targetUid);
    
    let unsubscribeFriends: (() => void) | null = null;

    const userRef = doc(db, "users", targetUid);
    const unsubscribeProfile = onSnapshot(userRef, (userSnap) => {
      if (userSnap.exists()) {
        const data = { uid: userSnap.id, ...userSnap.data() } as UserProfile;
        setProfile(data);
        setEditName(data.name || '');
        setEditBio(data.bio || '');
        
        // Fetch friends
        if (data.friends && Array.isArray(data.friends) && data.friends.length > 0) {
          const validFriends = data.friends.filter(id => id && typeof id === 'string' && id.trim() !== '');
          if (validFriends.length > 0) {
            const friendsToFetch = validFriends.slice(0, 30);
            const friendsQuery = query(collection(db, "users"), where(documentId(), "in", friendsToFetch));
            
            if (unsubscribeFriends) unsubscribeFriends();
            
            unsubscribeFriends = onSnapshot(friendsQuery, (friendsSnap) => {
              const friendsData = friendsSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
              setFriends(friendsData);
            });
          } else {
            setFriends([]);
            if (unsubscribeFriends) {
              unsubscribeFriends();
              unsubscribeFriends = null;
            }
          }
        } else {
          setFriends([]);
          if (unsubscribeFriends) {
            unsubscribeFriends();
            unsubscribeFriends = null;
          }
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    }, (err) => {
      console.error("Error fetching profile:", err);
      setLoading(false);
    });

    // Fetch posts
    const postsRef = collection(db, "posts");
    const q = query(postsRef, where("authorId", "==", targetUid));
    const unsubscribePosts = onSnapshot(q, (snapshot) => {
      const fetchedPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
      fetchedPosts.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });
      setPosts(fetchedPosts);
    }, (err) => {
      console.error("Error fetching posts:", err);
    });

    return () => {
      unsubscribeProfile();
      unsubscribePosts();
      if (unsubscribeFriends) unsubscribeFriends();
    };
  }, [uid, user]);

  // Listen for connection status if viewing someone else
  useEffect(() => {
    if (!user || !uid || uid === user.uid) return;

    if (myProfile?.friends?.includes(uid)) {
      setConnectionStatus('connected');
      return;
    }

    const qSent = query(
      collection(db, 'connectionRequests'),
      where('fromId', '==', user.uid),
      where('toId', '==', uid)
    );

    const qReceived = query(
      collection(db, 'connectionRequests'),
      where('fromId', '==', uid),
      where('toId', '==', user.uid)
    );

    let sentStatus: string | null = null;
    let receivedStatus: string | null = null;
    let sentId: string | null = null;
    let receivedId: string | null = null;

    const updateStatus = () => {
      if (sentStatus === 'accepted' || receivedStatus === 'accepted') {
        setConnectionStatus('connected');
      } else if (sentStatus === 'pending') {
        setConnectionStatus('pending_sent');
        setRequestId(sentId);
      } else if (receivedStatus === 'pending') {
        setConnectionStatus('pending_received');
        setRequestId(receivedId);
      } else {
        setConnectionStatus(null);
        setRequestId(null);
      }
    };

    const unsubSent = onSnapshot(qSent, (snapshot) => {
      if (!snapshot.empty) {
        sentStatus = snapshot.docs[0].data().status;
        sentId = snapshot.docs[0].id;
      } else {
        sentStatus = null;
        sentId = null;
      }
      updateStatus();
    });

    const unsubReceived = onSnapshot(qReceived, (snapshot) => {
      if (!snapshot.empty) {
        receivedStatus = snapshot.docs[0].data().status;
        receivedId = snapshot.docs[0].id;
      } else {
        receivedStatus = null;
        receivedId = null;
      }
      updateStatus();
    });

    return () => {
      unsubSent();
      unsubReceived();
    };
  }, [user, uid, myProfile]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    setUploadError(null);
    try {
      console.log("Uploading profile image...");
      const storageRef = ref(storage, `profile_images/${user.uid}`);
      const uploadPromise = uploadBytes(storageRef, file);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Upload timed out. Please check your connection.")), 60000)
      );
      const uploadResult = await Promise.race([uploadPromise, timeoutPromise]) as any;
      const url = await getDownloadURL(uploadResult.ref);
      await updateUserProfile(user.uid, { profileImage: url });
      setProfile(prev => prev ? { ...prev, profileImage: url } : null);
      console.log("Profile image updated successfully");
    } catch (err: any) {
      console.error("Profile image upload failed:", err);
      setUploadError(`Profile image upload failed: ${err.message || 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user || !isEditing) return;
    try {
      await updateUserProfile(user.uid, {
        name: editName,
        bio: editBio
      });
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setPhotoUploading(true);
    setUploadError(null);
    try {
      console.log("Starting photo upload for file:", file.name);
      const photoRef = ref(storage, `user_photos/${user.uid}/${Date.now()}_${file.name}`);
      
      // Add a 60-second timeout to the upload
      const uploadPromise = uploadBytes(photoRef, file);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Upload timed out. Please check your connection.")), 60000)
      );
      
      const uploadResult = await Promise.race([uploadPromise, timeoutPromise]) as any;
      const url = await getDownloadURL(uploadResult.ref);
      
      await updateUserProfile(user.uid, {
        photos: arrayUnion(url)
      });
    } catch (err: any) {
      console.error("Photo upload failed:", err);
      setUploadError(`Photo upload failed: ${err.message || 'Unknown error'}`);
    } finally {
      setPhotoUploading(false);
    }
  };

  const handlePostImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPostImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPostImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreatePost = async () => {
    if (!user || !profile || (!newPostContent.trim() && !postImageFile)) return;
    
    setIsPosting(true);
    setUploadError(null);
    try {
      let imageUrl = '';
      if (postImageFile) {
        try {
          const storageRef = ref(storage, `posts/${user.uid}/${Date.now()}_${postImageFile.name}`);
          const uploadPromise = uploadBytes(storageRef, postImageFile);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Upload timed out. Please check your connection.")), 60000)
          );
          const uploadResult = await Promise.race([uploadPromise, timeoutPromise]) as any;
          imageUrl = await getDownloadURL(uploadResult.ref);
        } catch (err: any) {
          console.error("Post image upload failed:", err);
          throw new Error(`Post image upload failed: ${err.message || 'Unknown error'}`);
        }
      }

      await createPost(user.uid, profile.name, newPostContent, imageUrl, profile.profileImage, profile.gender);
      setNewPostContent('');
      setPostImageFile(null);
      setPostImagePreview(null);
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || 'Failed to create post. Please try again.');
    } finally {
      setIsPosting(false);
    }
  };

  const handleConnect = async () => {
    if (!user || !uid) return;
    try {
      await sendConnectionRequest(user.uid, uid, myProfile?.name || 'Someone');
      setConnectionStatus('pending_sent');
    } catch (err) {
      console.error(err);
    }
  };

  const handleAcceptRequest = async () => {
    if (!user || !profile || !requestId) return;
    try {
      await acceptConnectionRequest(requestId, profile.uid, user.uid, myProfile?.name || 'Someone');
      setConnectionStatus('connected');
    } catch (err) {
      console.error(err);
    }
  };

  const handleFavorite = async () => {
    if (!user || !uid || !myProfile) return;
    const isFavorite = myProfile.favorites?.includes(uid);
    try {
      await toggleFavorite(user.uid, uid, !!isFavorite);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!user) return;
    try {
      await removeFriend(user.uid, friendId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemovePhoto = async (photoUrl: string) => {
    if (!user) return;
    try {
      console.log("Removing photo:", photoUrl);
      await updateUserProfile(user.uid, {
        photos: arrayRemove(photoUrl)
      });
      console.log("Photo removed successfully");
    } catch (err: any) {
      console.error("Failed to remove photo:", err);
      setUploadError(`Failed to remove photo: ${err.message || 'Unknown error'}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-blue"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-white mb-4 uppercase tracking-widest">Profile not found</h2>
        <button onClick={() => navigate('/dashboard')} className="text-accent-blue font-bold uppercase tracking-widest hover:underline">Back to Dashboard</button>
      </div>
    );
  }

  const isOwnProfile = user?.uid === profile.uid;
  const isFavorite = myProfile?.favorites?.includes(profile.uid);

  return (
    <div className="min-h-screen bg-bg pb-20">
      {/* Global Upload Error Banner */}
      <AnimatePresence>
        {uploadError && (
          <motion.div 
            initial={{ opacity: 0, y: -100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -100 }}
            className="fixed top-0 left-0 right-0 z-[100] p-6 bg-red-500 text-white shadow-2xl flex flex-col items-center gap-2"
          >
            <div className="flex items-center gap-4">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="font-bold">{uploadError}</span>
              <button onClick={() => setUploadError(null)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-[10px] uppercase tracking-widest opacity-80">Tip: If this persists, try a smaller image or check your internet connection.</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-5xl mx-auto px-4 py-20">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mb-12"
      >
        <button 
          onClick={() => navigate(-1)} 
          className="absolute -left-20 top-0 p-4 rounded-2xl bg-white/5 border border-white/10 text-white/30 hover:text-white transition-all hidden xl:flex shadow-xl"
        >
          <ArrowLeft className="w-7 h-7" />
        </button>

        {/* Profile Header Card */}
        <div className="p-8 md:p-12 glass-card relative overflow-hidden rounded-[3rem] md:rounded-[4rem]">
          <div className="absolute top-0 right-0 w-96 h-96 bg-accent-blue/10 blur-[120px] rounded-full -z-10" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent-pink/5 blur-[120px] rounded-full -z-10" />
          
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="relative group">
              <div className="w-44 h-44 md:w-52 md:h-52 rounded-[3rem] md:rounded-[3.5rem] overflow-hidden bg-white/10 border-8 border-white/5 shadow-2xl relative">
                <img 
                  src={profile.profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.gender === 'female' ? 'female-' : 'male-'}${profile.uid}`} 
                  alt={profile.name} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                {isOwnProfile && (
                  <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <input type="file" className="hidden" onChange={handleImageUpload} accept="image/*" />
                    {uploading ? <Loader2 className="w-8 h-8 text-white animate-spin" /> : <Camera className="w-8 h-8 text-white" />}
                  </label>
                )}
              </div>
              <div className="absolute -bottom-3 -right-3 w-14 h-14 md:w-16 md:h-16 rounded-3xl bg-gradient-to-br from-accent-blue to-accent-purple border-4 border-[#030712] flex items-center justify-center shadow-2xl shadow-accent-blue/40">
                <Zap className="w-7 h-7 md:w-8 md:h-8 text-white fill-current" />
              </div>
            </div>

            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 mb-6">
                {isEditing ? (
                  <input 
                    type="text" 
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-4xl md:text-6xl font-display font-black tracking-tighter uppercase focus:outline-none focus:border-accent-blue/50"
                  />
                ) : (
                  <h1 className="text-4xl md:text-6xl font-display font-black tracking-tighter text-white uppercase tracking-widest leading-none">
                    {profile.name}
                  </h1>
                )}
                {!isOwnProfile && (
                  <div className="px-6 py-2.5 rounded-full bg-accent-blue/10 border border-accent-blue/20 text-accent-blue text-[10px] font-black tracking-[0.3em] uppercase backdrop-blur-md">
                    98% Neural Match
                  </div>
                )}
              </div>

              {isEditing ? (
                <textarea 
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white/60 mb-6 focus:outline-none focus:border-accent-blue/50 resize-none h-24"
                  placeholder="Tell us about yourself..."
                />
              ) : (
                <p className="text-white/60 text-lg mb-6 max-w-xl font-medium line-clamp-2">
                  {profile.bio || 'No bio yet. Add one to help others get to know you!'}
                </p>
              )}
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 md:gap-8 text-white/30 text-[10px] font-black tracking-[0.2em] uppercase mb-10">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-accent-blue" />
                  {profile.college || 'Campus Student'}
                </div>
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-accent-purple" />
                  {profile.course || 'Vibe Seeker'}
                </div>
                <div 
                  onClick={() => setShowFriendsModal(true)}
                  className="flex items-center gap-3 cursor-pointer hover:text-white/60 transition-colors"
                >
                  <Users className="w-5 h-5 text-accent-pink" />
                  {profile.friends?.length || 0} Friends
                </div>
              </div>

              <div className="flex items-center justify-center md:justify-start gap-4">
                {isOwnProfile ? (
                  <>
                    <button 
                      onClick={isEditing ? handleSaveProfile : () => setIsEditing(true)}
                      className="gradient-btn px-8 py-4 text-xs flex items-center justify-center gap-3"
                    >
                      {isEditing ? <Check className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
                      {isEditing ? 'Save Profile' : 'Edit Profile'}
                    </button>
                    <button className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/40 transition-all hover:scale-110 active:scale-90 shadow-xl">
                      <Settings className="w-6 h-6" />
                    </button>
                  </>
                ) : (
                  <>
                    {connectionStatus === 'connected' ? (
                      <button onClick={() => navigate(`/messages/${profile.uid}`)} className="gradient-btn flex-1 px-10 py-5 text-lg flex items-center justify-center gap-4">
                        <MessageSquare className="w-6 h-6" />
                        Chat Now
                      </button>
                    ) : connectionStatus === 'pending_sent' ? (
                      <button disabled className="flex-1 px-10 py-5 text-lg bg-white/5 border border-white/10 text-white/40 rounded-3xl flex items-center justify-center gap-4 cursor-not-allowed">
                        <Clock className="w-6 h-6" />
                        Pending Request
                      </button>
                    ) : connectionStatus === 'pending_received' ? (
                      <button onClick={handleAcceptRequest} className="gradient-btn flex-1 px-10 py-5 text-lg flex items-center justify-center gap-4">
                        <Check className="w-6 h-6" />
                        Accept Request
                      </button>
                    ) : (
                      <button onClick={handleConnect} className="gradient-btn flex-1 px-10 py-5 text-lg flex items-center justify-center gap-4">
                        <UserPlus className="w-6 h-6" />
                        Add Friend
                      </button>
                    )}
                    <button 
                      onClick={handleFavorite}
                      className={`p-5 rounded-3xl border transition-all hover:scale-110 active:scale-90 shadow-xl ${isFavorite ? 'bg-accent-pink/20 border-accent-pink/30 text-accent-pink' : 'bg-white/5 border-white/10 text-white/20 hover:text-white/40'}`}
                    >
                      <Heart className={`w-8 h-8 ${isFavorite ? 'fill-current' : ''}`} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex items-center justify-center gap-4 mb-12">
        {[
          { id: 'vibes', label: 'Vibes', icon: Sparkles },
          { id: 'photos', label: 'Photos', icon: Camera },
          { id: 'friends', label: 'Friends', icon: Users },
          { id: 'feed', label: 'Feed', icon: Grid },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 ${
              activeTab === tab.id 
                ? 'bg-accent-blue text-white shadow-lg shadow-accent-blue/20' 
                : 'bg-white/5 text-white/40 hover:bg-white/10'
            }`}
          >
            <tab.icon className="w-5 h-5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'vibes' && (
          <motion.div 
            key="vibes"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-10"
          >
            {[
              { id: 'music', label: 'Music Vibe', icon: Music, color: 'text-accent-blue' },
              { id: 'movies', label: 'Movie Taste', icon: Film, color: 'text-accent-purple' },
              { id: 'hobbies', label: 'Hobbies', icon: Heart, color: 'text-accent-pink' },
              { id: 'goals', label: 'Life Goals', icon: Target, color: 'text-accent-blue' },
            ].map((cat, idx) => (
              <div 
                key={cat.id}
                className="p-10 glass-card rounded-[3rem]"
              >
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-xl">
                    <cat.icon className={`w-7 h-7 ${cat.color}`} />
                  </div>
                  <h3 className="text-2xl font-display font-black text-white tracking-tight uppercase tracking-widest">{cat.label}</h3>
                </div>
                
                <div className="flex flex-wrap gap-3">
                  {(profile[cat.id] || []).map((item: string) => (
                    <span key={item} className="px-5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-xs font-black text-white/40 uppercase tracking-widest hover:border-white/20 hover:text-white transition-all">
                      {item}
                    </span>
                  ))}
                  {(!profile[cat.id] || profile[cat.id].length === 0) && (
                    <span className="text-white/20 text-sm font-bold uppercase tracking-widest italic">No {cat.id} added yet.</span>
                  )}
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === 'photos' && (
          <motion.div 
            key="photos"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            {isOwnProfile && (
              <div className="flex justify-end">
                <label className="cursor-pointer px-6 py-3 rounded-xl bg-accent-blue text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-accent-blue/20 hover:scale-105 transition-transform">
                  {photoUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {photoUploading ? 'Uploading...' : 'Add Photo'}
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={photoUploading} />
                </label>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {(!profile.photos || profile.photos.length === 0) ? (
                <div className="col-span-full py-20 text-center glass-card border-dashed">
                  <Camera className="w-16 h-16 text-white/10 mx-auto mb-6" />
                  <p className="text-white/40 font-black uppercase tracking-widest">No photos uploaded yet.</p>
                </div>
              ) : (
                profile.photos.map((photo, idx) => (
                  <div key={idx} className="aspect-square rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl group relative">
                    <img src={photo} alt={`Photo ${idx}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                      <span className="text-white text-[10px] font-black uppercase tracking-widest">Photo {idx + 1}</span>
                    </div>
                    {isOwnProfile && (
                      <button 
                        onClick={() => handleRemovePhoto(photo)}
                        className="absolute top-4 right-4 p-3 rounded-2xl bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-95 shadow-xl shadow-red-500/20"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'friends' && (
          <motion.div 
            key="friends"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {friends.length === 0 ? (
              <div className="col-span-full py-20 text-center glass-card border-dashed">
                <Users className="w-16 h-16 text-white/10 mx-auto mb-6" />
                <p className="text-white/40 font-black uppercase tracking-widest">No friends yet. Start connecting!</p>
              </div>
            ) : (
              friends.map((friend) => (
                <div 
                  key={friend.uid}
                  className="p-6 glass-card hover:border-accent-blue/30 transition-all group flex flex-col justify-between"
                >
                  <Link 
                    to={`/profile/${friend.uid}`}
                    className="flex items-center gap-4 cursor-pointer mb-6 group/link"
                  >
                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white/10 border border-white/10 group-hover/link:scale-110 transition-transform">
                      <img src={friend.profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.gender === 'female' ? 'female-' : 'male-'}${friend.uid}`} alt={friend.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-white uppercase tracking-tight group-hover/link:text-accent-blue transition-colors">{friend.name}</h4>
                      <p className="text-accent-blue text-[10px] font-black uppercase tracking-widest">{friend.college}</p>
                    </div>
                  </Link>
                  
                  {isOwnProfile && (
                    <div className="flex items-center gap-2 mt-auto pt-4 border-t border-white/10">
                      <button 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/messages/${friend.uid}`); }}
                        className="flex-1 py-2 rounded-xl bg-accent-blue/10 text-accent-blue font-black text-[10px] tracking-widest uppercase hover:bg-accent-blue hover:text-white transition-colors flex items-center justify-center gap-2"
                      >
                        <MessageSquare className="w-3 h-3" />
                        Chat
                      </button>
                      <button 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemoveFriend(friend.uid); }}
                        className="flex-1 py-2 rounded-xl bg-white/5 text-white/40 font-black text-[10px] tracking-widest uppercase hover:bg-red-500/20 hover:text-red-500 transition-colors flex items-center justify-center gap-2"
                      >
                        <X className="w-3 h-3" />
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </motion.div>
        )}

        {activeTab === 'feed' && (
          <motion.div 
            key="feed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-2xl mx-auto w-full space-y-8"
          >
            {isOwnProfile && (
              <div className="glass-card p-6 space-y-4">
                <textarea
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder="What's on your mind?"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-white/20 focus:outline-none focus:border-accent-blue/50 resize-none h-32"
                />
                
                {postImagePreview && (
                  <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10">
                    <img src={postImagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <button 
                      onClick={() => {
                        setPostImageFile(null);
                        setPostImagePreview(null);
                      }}
                      className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-xl text-white transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <label className="cursor-pointer p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                    <Camera className="w-4 h-4" />
                    Add Photo
                    <input type="file" accept="image/*" className="hidden" onChange={handlePostImageChange} />
                  </label>
                  <button 
                    onClick={handleCreatePost}
                    disabled={isPosting || (!newPostContent.trim() && !postImageFile)}
                    className="px-8 py-3 rounded-xl bg-accent-blue text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-accent-blue/20"
                  >
                    {isPosting ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    {isPosting ? 'Posting...' : 'Post Vibe'}
                  </button>
                </div>
              </div>
            )}

            {posts.length === 0 ? (
              <div className="py-20 text-center glass-card border-dashed">
                <Grid className="w-16 h-16 text-white/10 mx-auto mb-6" />
                <p className="text-white/40 font-black uppercase tracking-widest">No posts yet.</p>
              </div>
            ) : (
              posts.map((post) => (
                <div key={post.id} className="glass-card p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/10">
                        <img src={profile.profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.gender === 'female' ? 'female-' : 'male-'}${profile.uid}`} alt={profile.name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white uppercase tracking-tight">{post.authorName}</h4>
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
                        if (comment && user && myProfile) {
                          addComment(post.id, user.uid, myProfile.name || 'Anonymous', comment);
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Friends Modal */}
      <AnimatePresence>
        {showFriendsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowFriendsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-xl font-display font-black text-white uppercase tracking-widest">Friends</h3>
                <button 
                  onClick={() => setShowFriendsModal(false)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="max-h-[60vh] overflow-y-auto p-2">
                {friends.length === 0 ? (
                  <div className="p-10 text-center">
                    <Users className="w-12 h-12 text-white/10 mx-auto mb-4" />
                    <p className="text-white/40 font-bold uppercase tracking-widest text-sm">No friends yet.</p>
                  </div>
                ) : (
                  friends.map((friend) => (
                    <div 
                      key={friend.uid}
                      onClick={() => {
                        setShowFriendsModal(false);
                        navigate(`/profile/${friend.uid}`);
                      }}
                      className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/10 border border-white/10">
                        <img 
                          src={friend.profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.gender === 'female' ? 'female-' : 'male-'}${friend.uid}`} 
                          alt={friend.name} 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-white uppercase tracking-tight">{friend.name}</h4>
                        <p className="text-accent-blue text-[10px] font-black uppercase tracking-widest">{friend.college}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
