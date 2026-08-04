import "./AdminNavbar.css";
const AdminNavbar = () => {


    const admin = JSON.parse(localStorage.getItem("admin"));

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
            </div>
        </header>
    );
};

export default AdminNavbar;