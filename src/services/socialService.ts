import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp, 
  getDocs,
  arrayUnion,
  arrayRemove,
  orderBy,
  limit,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { UserProfile } from '../hooks/useAuth';

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorImage?: string;
  authorGender?: 'male' | 'female' | 'other';
  content: string;
  imageUrl?: string;
  likes: string[];
  comments?: {
    id: string;
    userId: string;
    userName: string;
    content: string;
    createdAt: any;
  }[];
  createdAt: any;
}

export interface ConnectionRequest {
  id: string;
  fromId: string;
  toId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: any;
}

// Connection Requests
export const sendConnectionRequest = async (fromId: string, toId: string, fromName: string) => {
  const requestsRef = collection(db, 'connectionRequests');
  const requestDoc = await addDoc(requestsRef, {
    fromId,
    toId,
    status: 'pending',
    createdAt: serverTimestamp()
  });

  // Also send a notification
  const notificationsRef = collection(db, 'notifications');
  await addDoc(notificationsRef, {
    userId: toId,
    type: 'connection_request',
    title: 'New Connection Request',
    message: `${fromName} sent you a connection request`,
    fromId,
    fromName,
    requestId: requestDoc.id,
    read: false,
    createdAt: serverTimestamp()
  });
};

export const acceptConnectionRequest = async (requestId: string, fromId: string, toId: string, toName: string) => {
  console.log('acceptConnectionRequest called', { requestId, fromId, toId, toName });
  try {
    const requestRef = doc(db, 'connectionRequests', requestId);
    console.log('Updating request status...');
    await updateDoc(requestRef, { status: 'accepted' });
    console.log('Request status updated');

    // Add to own friends list
    const toUserRef = doc(db, 'users', toId);

    console.log('Updating friends lists...');
    
    // Update own friends list (should always succeed)
    try {
      await updateDoc(toUserRef, {
        friends: arrayUnion(fromId)
      });
    } catch (err) {
      console.error('Failed to update own friends list:', err);
    }
    console.log('Friends lists updated');

    // Send notification
    const notificationsRef = collection(db, 'notifications');
    console.log('Sending notification...');
    try {
      await addDoc(notificationsRef, {
        userId: fromId,
        type: 'connection_accepted',
        title: 'Connection Accepted',
        message: `${toName} accepted your connection request`,
        fromId: toId,
        fromName: toName,
        read: false,
        createdAt: serverTimestamp()
      });
      console.log('Notification sent');
    } catch (err) {
      console.error('Failed to send notification:', err);
    }
  } catch (error) {
    console.error('Error in acceptConnectionRequest', error);
    throw error;
  }
};

export const declineConnectionRequest = async (requestId: string) => {
  const requestRef = doc(db, 'connectionRequests', requestId);
  await updateDoc(requestRef, { status: 'declined' });
};

export const removeFriend = async (userId: string, friendId: string) => {
  const userRef = doc(db, 'users', userId);

  await updateDoc(userRef, {
    friends: arrayRemove(friendId)
  });
};

// Favorites
export const toggleFavorite = async (userId: string, targetId: string, isFavorite: boolean) => {
  const userRef = doc(db, 'users', userId);
  if (isFavorite) {
    await updateDoc(userRef, {
      favorites: arrayRemove(targetId)
    });
  } else {
    await updateDoc(userRef, {
      favorites: arrayUnion(targetId)
    });
  }
};

// Feed
export const createPost = async (authorId: string, authorName: string, content: string, imageUrl?: string, authorImage?: string, authorGender?: 'male' | 'female' | 'other') => {
  const postsRef = collection(db, 'posts');
  await addDoc(postsRef, {
    authorId,
    authorName,
    authorImage: authorImage || '',
    authorGender: authorGender || 'other',
    content,
    imageUrl: imageUrl || '',
    likes: [],
    comments: [],
    createdAt: serverTimestamp()
  });
};

export const addComment = async (postId: string, userId: string, userName: string, content: string) => {
  const postRef = doc(db, 'posts', postId);
  const comment = {
    id: Math.random().toString(36).substring(7),
    userId,
    userName,
    content,
    createdAt: new Date()
  };
  await updateDoc(postRef, {
    comments: arrayUnion(comment)
  });
};

export const getFeed = (callback: (posts: Post[]) => void) => {
  const postsRef = collection(db, 'posts');
  const q = query(postsRef, orderBy('createdAt', 'desc'), limit(50));
  
  return onSnapshot(q, (snapshot) => {
    const posts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Post));
    callback(posts);
  });
};

export const toggleLike = async (postId: string, userId: string, isLiked: boolean) => {
  const postRef = doc(db, 'posts', postId);
  if (isLiked) {
    await updateDoc(postRef, {
      likes: arrayRemove(userId)
    });
  } else {
    await updateDoc(postRef, {
      likes: arrayUnion(userId)
    });
  }
};
