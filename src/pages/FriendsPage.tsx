import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../firebase/firebaseConfig';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { UserProfile } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import { MessageSquare, UserMinus } from 'lucide-react';
import { removeFriend } from '../services/socialService';

export default function FriendsPage() {
  const { user, profile } = useAuth();
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !profile?.friends) {
      setLoading(false);
      return;
    }

    const fetchFriends = async () => {
      const friendProfiles: UserProfile[] = [];
      for (const friendId of profile.friends) {
        const friendDoc = await getDoc(doc(db, 'users', friendId));
        if (friendDoc.exists()) {
          const data = friendDoc.data();
          friendProfiles.push({ uid: friendDoc.id, ...data } as UserProfile);
        }
      }
      setFriends(friendProfiles);
      setLoading(false);
    };

    fetchFriends();
  }, [user, profile?.friends]);

  const handleRemoveFriend = async (friendId: string) => {
    if (!user) return;
    await removeFriend(user.uid, friendId);
  };

  if (loading) return <div className="text-white text-center mt-20">Loading friends...</div>;

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-black text-white mb-8">MY FRIENDS</h1>
      {friends.length === 0 ? (
        <div className="text-white/60 text-center mt-20">You don't have any friends yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {friends.map((friend) => (
            <div key={friend.uid} className="bg-[#0f111a] border border-white/10 p-6 rounded-2xl flex items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-white/10 border border-white/10">
                <img 
                  src={friend.profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.name}`} 
                  alt={friend.name} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex-grow">
                <h2 className="text-lg font-bold text-white">{friend.name}</h2>
                <p className="text-sm text-white/60">{friend.college}</p>
              </div>
              <div className="flex gap-2">
                <Link to={`/messages?receiverId=${friend.uid}`} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors">
                  <MessageSquare className="w-5 h-5" />
                </Link>
                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemoveFriend(friend.uid); }} className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors">
                  <UserMinus className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
