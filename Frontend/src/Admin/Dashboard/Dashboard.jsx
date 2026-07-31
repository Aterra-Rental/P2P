import { useCallback, useEffect, useState } from "react";

import {
    FaUsers,
    FaUserCheck,
    FaMoneyCheckAlt,
    FaCheckCircle
} from "react-icons/fa";

import { socket } from "../../lib/socket";

import VerificationTable from "./Components/VerificationTable/VerificationTable";
import AdminLayout from "../Components/Layout/AdminLayout";
import StatCard from "./Components/StatCard/StatCard";
import SubmittedQuestions from "./Components/SubmittedQuestions/SubmittedQuestions";

import "./Dashboard.css";

const Dashboard = () => {
    const [verificationRefreshKey, setVerificationRefreshKey] = useState(0);
    const [pendingCount, setPendingCount] = useState(0);

    const refreshVerificationTable = useCallback(() => {
        setVerificationRefreshKey((previousKey) => previousKey + 1);
    }, []);

    const fetchPendingCount = useCallback(async () => {
        try {
            const response = await fetch(
                "http://127.0.0.1:8000/api/admin/verifications"
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Failed to load pending verifications."
                );
            }

            /*
             * Your backend returns the array directly:
             * return jsonify(users), 200
             */
            setPendingCount(Array.isArray(data) ? data.length : 0);

        } catch (error) {
            console.error(
                "Failed to fetch pending verification count:",
                error
            );
        }
    }, []);

    const refreshAdminDashboard = useCallback(() => {
        refreshVerificationTable();
        fetchPendingCount();
    }, [refreshVerificationTable, fetchPendingCount]);

    useEffect(() => {
        const joinAdminRoom = () => {
            socket.emit("join_admin");
            console.log("Admin joined Socket.IO room");
        };

        const handleVerificationUpdated = (data) => {
            console.log("Verification updated:", data);

            refreshAdminDashboard();
        };

        /*
         * Join immediately if the socket is already connected.
         */
        if (socket.connected) {
            joinAdminRoom();
        }

        /*
         * Join again after every reconnect.
         */
        socket.on("connect", joinAdminRoom);

        /*
         * Refresh when:
         * - a user submits KYC
         * - an admin approves a user
         * - an admin rejects a user
         */
        socket.on(
            "verification_updated",
            handleVerificationUpdated
        );

        fetchPendingCount();

        return () => {
            socket.off("connect", joinAdminRoom);

            socket.off(
                "verification_updated",
                handleVerificationUpdated
            );
        };
    }, [fetchPendingCount, refreshAdminDashboard]);

    return (
        <AdminLayout>

            <div className="stats-grid">

                <StatCard
                    title="Total Users"
                    value="245"
                    icon={<FaUsers />}
                    color="linear-gradient(135deg,#7C3AED,#A855F7)"
                />

                <StatCard
                    title="Pending Verification"
                    value={pendingCount}
                    icon={<FaUserCheck />}
                    color="linear-gradient(135deg,#F59E0B,#FBBF24)"
                />

                <StatCard
                    title="Transactions"
                    value="524"
                    icon={<FaMoneyCheckAlt />}
                    color="linear-gradient(135deg,#3B82F6,#60A5FA)"
                />

                <StatCard
                    title="Completed Deals"
                    value="492"
                    icon={<FaCheckCircle />}
                    color="linear-gradient(135deg,#10B981,#34D399)"
                />

            </div>

            <VerificationTable
                key={verificationRefreshKey}
            />

            <SubmittedQuestions />

        </AdminLayout>
    );
};

export default Dashboard;