import { useEffect } from "react";

import Sidebar from "../Sidebar/Sidebar";
import AdminNavbar from "../Navbar/AdminNavbar";
import { socket } from "../../../lib/socket";

import "./AdminLayout.css";

const AdminLayout = ({ children }) => {

    useEffect(() => {

        const joinAdminRoom = () => {
            socket.emit("join_admin");

            console.log(
                "Admin joined the global admin Socket.IO room"
            );
        };

        const handleVerificationUpdated = (data) => {
            console.log(
                "Global admin verification update:",
                data
            );

            window.dispatchEvent(
                new CustomEvent(
                    "admin-verification-updated",
                    {
                        detail: data
                    }
                )
            );
        };

        if (socket.connected) {
            joinAdminRoom();
        }

        socket.on("connect", joinAdminRoom);

        socket.on(
            "verification_updated",
            handleVerificationUpdated
        );

        return () => {
            socket.off("connect", joinAdminRoom);

            socket.off(
                "verification_updated",
                handleVerificationUpdated
            );
        };

    }, []);

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