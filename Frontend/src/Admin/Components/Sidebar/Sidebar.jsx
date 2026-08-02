import { NavLink, useNavigate } from "react-router-dom";
import {
    FaChartPie,
    FaUsers,
    FaUserCheck,
    FaMoneyCheckAlt,
    FaSignOutAlt,
    FaShieldAlt,
    FaQuestionCircle
} from "react-icons/fa";

import "./Sidebar.css";

const Sidebar = () => {

    const navigate = useNavigate();

    const handleLogout = () => {

        localStorage.removeItem("admin");

        navigate("/admin/login");

    };

    return (

        <aside className="admin-sidebar">

            <div className="sidebar-logo">

                <FaShieldAlt className="logo-icon" />

                <div>
                    <h2>P2P Deal</h2>
                    <span>Admin Panel</span>
                </div>

            </div>

            <nav className="sidebar-menu">

                <NavLink to="/admin/dashboard">
                    <FaChartPie />
                    <span>Dashboard</span>
                </NavLink>

                <NavLink to="/admin/users">
                    <FaUsers />
                    <span>Users</span>
                </NavLink>

                <NavLink to="/admin/verification">
                    <FaUserCheck />
                    <span>Verification</span>
                </NavLink>

                <NavLink to="/admin/transactions">
                    <FaMoneyCheckAlt />
                    <span>Transactions</span>
                </NavLink>

                <NavLink to="/admin/faq">
                    <FaQuestionCircle />
                    <span>FAQ</span>
                </NavLink>

            </nav>

            <button
                className="logout-btn"
                onClick={handleLogout}
            >

                <FaSignOutAlt />

                <span>Logout</span>

            </button>

        </aside>

    );

};

export default Sidebar;