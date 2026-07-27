import { Navigate } from "react-router-dom";

const ProtectedAdminRoute = ({ children }) => {
  const admin = JSON.parse(localStorage.getItem("admin")); // Checks "admin" key

  // Admin not logged in -> redirect to /admin/login
  if (!admin) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
};

export default ProtectedAdminRoute;