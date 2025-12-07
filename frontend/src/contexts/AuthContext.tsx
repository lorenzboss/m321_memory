import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

interface User {
  id: number;
  username: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  checkAuthStatus: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuthStatus = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL || "http://localhost:8000"}/auth/me`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.status === 200) {
        const data = await response.json();
        console.log("Auth check success:", data);

        if (data.id) {
          setUser({
            id: data.id,
            username: data.username,
          });
          setIsAuthenticated(true);
          return true;
        }
      }

      // If we get here, authentication failed
      setUser(null);
      setIsAuthenticated(false);
      return false;
    } catch (error) {
      console.error("Auth check error:", error);
      setUser(null);
      setIsAuthenticated(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const value = {
    user,
    isAuthenticated,
    isLoading,
    checkAuthStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
