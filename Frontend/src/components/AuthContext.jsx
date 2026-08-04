import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { getUserProfile } from "../lib/profile";
import {
  disconnectSocket,
  socket,
} from "../lib/socket";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const refreshInProgress = useRef(false);

  const refreshUser = useCallback(async () => {
    if (refreshInProgress.current) {
      return null;
    }

    refreshInProgress.current = true;

    const userId = localStorage.getItem("user_id");

    if (!userId) {
      setUser(null);
      setLoading(false);
      refreshInProgress.current = false;
      return null;
    }

    try {
      const cachedPic = localStorage.getItem(`profile_picture_${userId}`);
      const profile = await getUserProfile();
      const storedUser = JSON.parse(
        localStorage.getItem("user") || "{}"
      );

      const updatedUser = profile
        ? {
            ...storedUser,
            ...profile,
            profile_picture: profile.profile_picture || profile.url || profile.path || cachedPic || storedUser.profile_picture,
            user_id: Number(userId),
            profile_completed: true,
          }
        : {
            ...storedUser,
            profile_picture: cachedPic || storedUser.profile_picture,
            user_id: Number(userId),
            profile_completed: false,
          };

      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));

      return updatedUser;
    } catch (error) {
      console.error("Failed to refresh user:", error);

      const cachedPic = localStorage.getItem(`profile_picture_${userId}`);
      const storedUser = JSON.parse(
        localStorage.getItem("user") || "{}"
      );

      const fallbackUser = {
        ...storedUser,
        profile_picture: cachedPic || storedUser.profile_picture,
        user_id: Number(userId),
        profile_completed: false,
      };

      setUser(fallbackUser);
      localStorage.setItem("user", JSON.stringify(fallbackUser));

      return fallbackUser;
    } finally {
      refreshInProgress.current = false;
      setLoading(false);
    }
  }, []);

  // Load the account once after the initial render.
  useEffect(() => {
    const initialRefreshTimer = window.setTimeout(
      refreshUser,
      0
    );

    return () => {
      window.clearTimeout(initialRefreshTimer);
    };
  }, [refreshUser]);

  // Join the authenticated personal Socket.IO room and listen for
  // verification decisions while this connection is active.
  useEffect(() => {
    const userId = localStorage.getItem("user_id");

    if (!userId) {
      return;
    }

    const joinUserRoom = () => {
      socket.emit("join_user");
    };

    const handleVerificationUpdate = (data) => {
      if (!data?.user_id) {
        return;
      }

      if (String(data.user_id) !== String(userId)) {
        return;
      }

      // The socket event only signals that something changed;
      // PostgreSQL/API responses stay authoritative.
      refreshUser();
    };

    if (socket.connected) {
      joinUserRoom();
    }

    socket.on("connect", joinUserRoom);
    socket.on("verification_updated", handleVerificationUpdate);

    return () => {
      socket.off("connect", joinUserRoom);
      socket.off("verification_updated", handleVerificationUpdate);
    };
  }, [refreshUser]);

  const logout = () => {
    disconnectSocket();

    localStorage.removeItem("user_id");
    localStorage.removeItem("email");
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    // Note: We intentionally do NOT remove profile_picture_${userId} so it stays remembered when logging back in

    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
// This file intentionally exports its provider and matching hook.
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider."
    );
  }

  return context;
};

export default AuthProvider;