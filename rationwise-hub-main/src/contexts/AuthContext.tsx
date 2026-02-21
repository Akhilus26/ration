import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { sql } from "@/lib/db";

export type UserRole = "beneficiary" | "shopkeeper" | "admin";

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  rationCardNumber?: string;
  category?: "AAY" | "PHH" | "NPHH";
  address?: string;
  aadhaar?: string;
  lat?: number;
  lng?: number;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, role: UserRole) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("rationwise_user");
    return saved ? JSON.parse(saved) : null;
  });

  const login = async (email: string, role: UserRole) => {
    try {
      const dbUser = await sql.getUserByEmail(email, role);

      if (dbUser) {
        const userData = dbUser as User;
        setUser(userData);
        localStorage.setItem("rationwise_user", JSON.stringify(userData));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("rationwise_user");
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
