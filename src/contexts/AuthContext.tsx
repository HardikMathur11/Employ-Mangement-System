import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, signInWithPopup, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../config/firebase';
import { User } from '../types';
import toast from 'react-hot-toast';

interface AuthContextType {
  currentUser: User | null;
  firebaseUser: FirebaseUser | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role: 'admin' | 'manager' | 'employee') => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (updates: Partial<User>) => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  const createUserDocument = async (user: FirebaseUser, additionalData: Partial<User> = {}) => {
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      const { displayName, email, photoURL } = user;
      const userData: User = {
        uid: user.uid,
        displayName: displayName || additionalData.displayName || '',
        email: email || '',
        // Firestore does not allow undefined values
        photoURL: (photoURL ?? additionalData.photoURL) || '',
        role: additionalData.role || 'employee',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      try {
        await setDoc(userRef, userData);
        return userData;
      } catch (error) {
        console.error('Error creating user document:', error);
        throw error;
      }
    }

    // If document exists and caller provided updates (e.g., role during registration), merge them
    const existingData = { ...userDoc.data(), uid: user.uid } as User;
    const hasUpdates = Object.keys(additionalData).some(
      (k) => (additionalData as any)[k] !== undefined && (additionalData as any)[k] !== null
    );
    if (hasUpdates) {
      const updates: Partial<User> = {};
      ['displayName', 'photoURL', 'role'].forEach((key) => {
        const value = (additionalData as any)[key];
        if (value !== undefined && value !== null) {
          (updates as any)[key] = value;
        }
      });
      if (Object.keys(updates).length > 0) {
        try {
          await updateDoc(userRef, { ...updates, updatedAt: new Date() } as any);
          return { ...existingData, ...updates } as User;
        } catch (error) {
          console.error('Error updating existing user document:', error);
        }
      }
    }

    return existingData;
  };

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Welcome back!');
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
      throw error;
    }
  };

  const register = async (email: string, password: string, name: string, role: 'admin' | 'manager' | 'employee') => {
    try {
      setLoading(true);
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(user, { displayName: name });
      const created = await createUserDocument(user, { displayName: name, role });
      // Optimistically hydrate context so UI reflects chosen role/name immediately
      if (created) {
        setCurrentUser(created);
      }
      toast.success('Account created successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      const { user } = await signInWithPopup(auth, googleProvider);
      await createUserDocument(user);
      toast.success('Welcome!');
    } catch (error: any) {
      toast.error(error.message || 'Google sign-in failed');
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setFirebaseUser(null);
      toast.success('Logged out successfully');
    } catch (error: any) {
      toast.error(error.message || 'Logout failed');
      throw error;
    }
  };

  const updateUserProfile = async (updates: Partial<User>) => {
    if (!currentUser) return;

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const updateData = {
        ...updates,
        updatedAt: new Date(),
      };
      
      await updateDoc(userRef, updateData);
      setCurrentUser({ ...currentUser, ...updateData });
      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Update failed');
      throw error;
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      try {
        setFirebaseUser(user);
        if (user) {
          const userData = await createUserDocument(user);
          setCurrentUser(userData);
        } else {
          setCurrentUser(null);
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    currentUser,
    firebaseUser,
    login,
    register,
    loginWithGoogle,
    logout,
    updateUserProfile,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};