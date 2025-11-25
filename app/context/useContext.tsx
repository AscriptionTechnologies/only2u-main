"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
// import {
//   collection,
//   doc,
//   getDocs,
//   getDoc,
//   onSnapshot,
// } from "firebase/firestore";
// import { db, auth } from "../utils/firebaseConfig";
// import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from 'next/navigation';
import { User } from "@supabase/supabase-js";

interface AppContextType {
  user: User | null;
  userManagement: any[];
  categoryManagement: any[];
  productManagement: any[];
  colorManagement: any[];
  orderManagement: any[];
  setUser: (user: User | null) => void;
  setUserManagement: (userManagement: any[]) => void;
  setCategoryManagement: (categoryManagement: any[]) => void;
  setProductManagement: (productManagement: any[]) => void;
  setColorManagement: (colorManagement: any[]) => void;
  setOrderManagement: (orderManagement: any[]) => void;
}

const AppContext = createContext<AppContextType>({
  user: null,
  userManagement: [],
  categoryManagement: [],
  productManagement: [],
  colorManagement: [],
  orderManagement: [],
  setUser: () => {},
  setUserManagement: () => {},
  setCategoryManagement: () => {},
  setProductManagement: () => {},
  setColorManagement: () => {},
  setOrderManagement: () => {},
});

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userManagement, setUserManagement] = useState<any[]>([]);
  const [categoryManagement, setCategoryManagement] = useState<any[]>([]);
  const [productManagement, setProductManagement] = useState<any[]>([]);
  const [colorManagement, setColorManagement] = useState<any[]>([]);
  const [orderManagement, setOrderManagement] = useState<any[]>([]);

  return (
    <AppContext.Provider
      value={{
        user,
        userManagement,
        categoryManagement,
        productManagement,
        colorManagement,
        orderManagement,
        setUser,
        setUserManagement,
        setCategoryManagement,
        setProductManagement,
        setColorManagement,
        setOrderManagement,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  return useContext(AppContext);
};