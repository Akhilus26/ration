import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { sql, type User, type UserRole } from "@/lib/db";

export type { UserRole };

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, role: UserRole) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
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
      let dbUser = await sql.getUserByEmail(email, role);

      // If shopkeeper and not found by email, check shop gmail
      if (!dbUser && role === "shopkeeper") {
        const allShops = await sql.getAllShops();
        const shop = allShops.find(s => s.gmail === email);
        if (shop && shop.shopkeeperId) {
          const allUsers = await sql.getAllUsers();
          dbUser = allUsers.find(u => u.id === shop.shopkeeperId && u.role === "shopkeeper");
        }
      }

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

  const refreshUser = async () => {
    if (user?.id) {
      const allUsers = await sql.getAllUsers();
      const dbUser = allUsers.find(u => u.id === user.id);
      if (dbUser) {
        setUser(dbUser as User);
        localStorage.setItem("rationwise_user", JSON.stringify(dbUser));
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};
