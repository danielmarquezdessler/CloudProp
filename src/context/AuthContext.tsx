import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { APP_TEXT, AppText } from '../appText';
import { db, auth } from '../firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  t: AppText;
  login: (email: string, passwordString: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  apiFetch: (url: string, options?: RequestInit) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const t = APP_TEXT;

  // Auth synchronization with Firebase onAuthStateChanged
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        try {
          const userRef = doc(db, 'users', firebaseUser.uid);
          let userSnap;
          try {
            userSnap = await getDoc(userRef);
          } catch (rErr) {
            handleFirestoreError(rErr, OperationType.GET, `users/${firebaseUser.uid}`);
          }
          
          if (userSnap && userSnap.exists()) {
            const userData = userSnap.data() as User;
            
            // Validate complete set of real-world profile synchronizations
            const statusOk = userData.status === 'active';
            const roleOk = !!userData.role;
            const permissionsOk = Array.isArray(userData.permissions);
            const orgIdOk = !!userData.orgId;
            const authUidOk = userData.authUid === firebaseUser.uid;

            if (!statusOk) {
              setError("Tu usuario está suspendido. Contactá al administrador.");
              setUser(null);
              await signOut(auth);
              localStorage.removeItem('aguad_cloudprop_uid');
              localStorage.removeItem('aguad_cloudprop_email');
              localStorage.removeItem('aguad_cloudprop_name');
              localStorage.removeItem('aguad_cloudprop_role');
            } else if (!roleOk || !permissionsOk || !orgIdOk || !authUidOk) {
              setError("El perfil de usuario no está configurado correctamente. Contactá al administrador.");
              setUser(null);
              await signOut(auth);
              localStorage.removeItem('aguad_cloudprop_uid');
              localStorage.removeItem('aguad_cloudprop_email');
              localStorage.removeItem('aguad_cloudprop_name');
              localStorage.removeItem('aguad_cloudprop_role');
            } else {
              setUser(userData);
              localStorage.setItem('aguad_cloudprop_uid', userData.uid);
              localStorage.setItem('aguad_cloudprop_email', userData.email);
              localStorage.setItem('aguad_cloudprop_name', userData.displayName);
              localStorage.setItem('aguad_cloudprop_role', userData.role);
              setError(null);
            }
          } else {
            // Profile does not exist yet inside Firestore - BLOCK AND LOGOUT
            setError("El perfil de usuario no está configurado correctamente. Contactá al administrador.");
            setUser(null);
            await signOut(auth);
            localStorage.removeItem('aguad_cloudprop_uid');
            localStorage.removeItem('aguad_cloudprop_email');
            localStorage.removeItem('aguad_cloudprop_name');
            localStorage.removeItem('aguad_cloudprop_role');
          }
        } catch (err) {
          console.error("Session profile sync error with Firestore", err);
          setError("El perfil de usuario no está configurado correctamente. Contactá al administrador.");
          setUser(null);
          await signOut(auth);
        }
      } else {
        setUser(null);
        localStorage.removeItem('aguad_cloudprop_uid');
        localStorage.removeItem('aguad_cloudprop_email');
        localStorage.removeItem('aguad_cloudprop_name');
        localStorage.removeItem('aguad_cloudprop_role');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Base persistent auth proxy fetch
  const apiFetch = async (url: string, options: RequestInit = {}) => {
    const currentUid = user?.uid || localStorage.getItem('aguad_cloudprop_uid') || '';
    
    const headers = {
      'Content-Type': 'application/json',
      'x-user-uid': currentUid,
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (response.status === 401) {
      setUser(null);
      localStorage.removeItem('aguad_cloudprop_uid');
      localStorage.removeItem('aguad_cloudprop_email');
      localStorage.removeItem('aguad_cloudprop_name');
      localStorage.removeItem('aguad_cloudprop_role');
      throw new Error("Su sesión ha expirado o no está autorizado.");
    }

    return response;
  };

  const login = async (email: string, passwordString: string): Promise<boolean> => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), passwordString);
      return true;
    } catch (fbErr: any) {
      console.warn("Firebase Auth login failed:", fbErr.message);
      setError(t.auth.incorrect);
      return false;
    }
  };

  const loginWithGoogle = async (): Promise<boolean> => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      return true;
    } catch (err: any) {
      setError(err.message || t.auth.incorrect);
      return false;
    }
  };

  const logout = async () => {
    try {
      if (user) {
        await fetch('/api/audit-logs/record', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-uid': user.uid
          },
          body: JSON.stringify({
            action: 'logout',
            details: `Cierre de sesión ordenado por el usuario ${user.displayName}`,
            userEmail: user.email
          })
        });
      }
    } catch (e) {
      console.warn("Could not log logout audit details to server:", e);
    }

    // Sign out from Firebase Auth
    try {
      await signOut(auth);
    } catch (err) {
      console.warn("Firebase AuthsignOut failed:", err);
    }

    setUser(null);
    localStorage.removeItem('aguad_cloudprop_uid');
    localStorage.removeItem('aguad_cloudprop_email');
    localStorage.removeItem('aguad_cloudprop_name');
    localStorage.removeItem('aguad_cloudprop_role');
  };

  const refreshUser = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/users`, {
        headers: { 'x-user-uid': user.uid }
      });
      const data = await res.json();
      if (data.success && data.users) {
        const refreshed = data.users.find((u: User) => u.uid === user.uid);
        if (refreshed) {
          setUser(refreshed);
          localStorage.setItem('aguad_cloudprop_name', refreshed.displayName);
          localStorage.setItem('aguad_cloudprop_role', refreshed.role);
        }
      }
    } catch (e) {
      console.error("Could not refresh authenticated user details:", e);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      error,
      t,
      login,
      loginWithGoogle,
      logout,
      refreshUser,
      apiFetch
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

