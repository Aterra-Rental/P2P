import Sidebar from "../Sidebar/Sidebar";
import AdminNavbar from "../Navbar/AdminNavbar";
import "./AdminLayout.css";

const AdminLayout = ({ children }) => {

    return (

        <div className="admin-layout">

            <Sidebar />

            <div className="admin-content">

                <AdminNavbar />

                <main className="admin-page">

                    {children}

                </main>

            </div>

        </div>

    );

};

export default AdminLayout;