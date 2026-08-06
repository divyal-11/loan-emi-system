"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { api, ApiError } from "../lib/api";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "borrower" | "admin";
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<UserProfile>;
  signup: (
    name: string,
    email: string,
    password: string,
    role: "borrower" | "admin",
  ) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from localStorage on app init
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      setToken(storedToken);
      api
        .get<UserProfile>("/auth/me")
        .then((userData) => {
          setUser(userData);
        })
        .catch(() => {
          // Token expired or invalid — clear state
          localStorage.removeItem("token");
          setToken(null);
          setUser(null);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<UserProfile> => {
    const data = await api.post<{ token: string; user: UserProfile }>(
      "/auth/login",
      { email, password },
    );
    localStorage.setItem("token", data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const signup = async (
    name: string,
    email: string,
    password: string,
    role: "borrower" | "admin",
  ): Promise<void> => {
    await api.post("/auth/signup", { name, email, password, role });
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, token, isLoading, login, signup, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
