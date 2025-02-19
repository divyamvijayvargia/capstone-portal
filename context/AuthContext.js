'use client';
import { createContext, useContext, useEffect, useState } from "react";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { app, db } from "../firebase";
import { useRouter } from "next/navigation";
import { doc, getDoc, setDoc } from "firebase/firestore";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const auth = getAuth(app);
  const router = useRouter();

  const login = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const userRef = doc(db, "users", result.user.uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      router.push(userData.role === "student" ? "/dashboard/student" : "/dashboard/faculty");
    } else {
      await setDoc(userRef, { uid: result.user.uid, email: result.user.email, role: "" });
      router.push("/profile");
    }
    setUser(result.user);
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    router.push("/");
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(setUser);
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);