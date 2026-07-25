
import { useNavigate } from "react-router-dom";
import { FaSignOutAlt } from "react-icons/fa";
import "./AdminNavbar.css";

const AdminNavbar = () => {

    const navigate = useNavigate();

    const admin = JSON.parse(localStorage.getItem("admin"));

    const handleLogout = () => {

        localStorage.removeItem("admin");

        navigate("/admin/login");

    };

    return (

        <header className="admin-navbar">

            <div className="navbar-title">

                <h2>Dashboard</h2>

                <p>Welcome back, Administrator</p>

            </div>

            <div className="navbar-right">

                <span className="admin-email">

                    {admin?.email}

                </span>

                <button
                    className="navbar-logout"
                    onClick={handleLogout}
                >

                    <FaSignOutAlt />

                    Logout

                </button>

            </div>

        </header>

    );

};

export default AdminNavbar;