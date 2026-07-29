import { Navigate } from "react-router-dom";

const ProtectedRoute = ({
    children,
    requireProfile = false,
    requireVerified = false
}) => {

    const user = JSON.parse(localStorage.getItem("user"));

    // User not logged in
    if (!user) {
        return <Navigate to="/Login" replace />;
    }

    // User has not completed profile
    if (requireProfile && user.verify_status === null) {
        return <Navigate to="/CompleteProfile" replace />;
    }

    // User must be verified
    if (requireVerified) {

        if (user.verify_status === "Pending") {
            return <Navigate to="/VerificationPending" replace />;
        }

        if (user.verify_status === "Rejected") {
            return <Navigate to="/VerificationRejected" replace />;
        }

        if (user.verify_status !== "Verified") {
            return <Navigate to="/CompleteProfile" replace />;
        }

    }

    return children;

};

export default ProtectedRoute;