import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '../firebase/firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  email: string;
  name?: string;
  displayName?: string;
  photoURL?: string;
  profileImage?: string;
  gender?: 'male' | 'female' | 'other';
  photos?: string[];
  college?: string;
  course?: string;
  year?: string;
  location?: string;
  bio?: string;
  music?: string[];
  movies?: string[];
  hobbies?: string[];
  skills?: string[];
  goals?: string[];
  personality?: string;
  availability?: string;
  collaborationScore?: number;
  projectsCount?: number;
  hackathonsCount?: number;
  profileComplete?: boolean;
  [key: string]: any;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      unsubscribeProfile(); // Unsubscribe previous listener if any
      if (firebaseUser) {
        setUser(firebaseUser);
        
        // Real-time profile listener
        const profileRef = doc(db, "users", firebaseUser.uid);
        unsubscribeProfile = onSnapshot(profileRef, (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          } else {
            setProfile(null);
          }
          setLoading(false);
        });
      } else {
        setUser(null);
        setProfile(null);
        unsubscribeProfile();
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeProfile();
    };
  }, []);

  return { user, profile, loading };
};
