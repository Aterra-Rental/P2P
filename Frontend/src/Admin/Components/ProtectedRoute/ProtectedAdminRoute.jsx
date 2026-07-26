import { Navigate } from "react-router-dom";

const ProtectedRoute = ({
    children,
    requireVerified = false
}) => {

    const user = JSON.parse(localStorage.getItem("user"));

    // User not logged in
    if (!user) {
        return <Navigate to="/Login" replace />;
    }

    // Only verified users may access this page
    if (requireVerified && user.verify_status !== "Verified") {
        return <Navigate to="/Dashboard" replace />;
    }

    return children;

};

export default ProtectedRoute;