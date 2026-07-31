
import { useEffect } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "./AuthContext";
import { showTopNotification } from "../lib/notification";

const VerifiedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  const hasProfile =
  user?.profile_completed === true ||
  Boolean(
    user?.firstname &&
    user?.lastname &&
    user?.nationalidentity_id
  );

const verificationStatus =
  user?.verify_status?.trim();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      showTopNotification(
        "Please sign in before accessing deal features.",
        "warning"
      );
      return;
    }

    if (!hasProfile) {
      showTopNotification(
        "Please complete the profile before creating or joining a deal.",
        "info"
      );
      return;
    }

    if (verificationStatus === "Pending") {
      showTopNotification(
        "Profile verification is still pending. Deal features will become available after approval.",
        "warning"
      );
      return;
    }

    if (verificationStatus === "Rejected") {
      showTopNotification(
        "The profile needs attention. Please correct the submitted information and try again.",
        "error"
      );
    }
  }, [
    loading,
    user,
    hasProfile,
    verificationStatus,
  ]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/Login" replace />;
  }

  if (!hasProfile) {
    return <Navigate to="/CompleteProfile" replace />;
  }

  if (verificationStatus === "Pending") {
    return <Navigate to="/Dashboard" replace />;
  }

  if (verificationStatus === "Rejected") {
    return <Navigate to="/CompleteProfile" replace />;
  }

  if (verificationStatus !== "Verified") {
    return <Navigate to="/Dashboard" replace />;
  }

  return children;
};

export default VerifiedRoute;