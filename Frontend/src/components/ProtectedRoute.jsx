import { useEffect } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "./AuthContext";
import { showTopNotification } from "../lib/notification";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      showTopNotification(
        "Please sign in to continue.",
        "warning"
      );
    }
  }, [loading, user]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/Login" replace />;
  }

  return children;
};

export default ProtectedRoute;