import { useCallback, useEffect, useState } from "react";

import {
    FaUsers,
    FaUserCheck,
    FaMoneyCheckAlt,
    FaCheckCircle
} from "react-icons/fa";

import VerificationTable from "./Components/VerificationTable/VerificationTable";
import AdminLayout from "../Components/Layout/AdminLayout";
import StatCard from "./Components/StatCard/StatCard";
import SubmittedQuestions from "./Components/SubmittedQuestions/SubmittedQuestions";

import API_URL from "../../lib/api";

import "./Dashboard.css";

const Dashboard = () => {
    const [pendingCount, setPendingCount] = useState(0);

    const fetchPendingCount = useCallback(async () => {
        try {
            const response = await fetch(
                `${API_URL}/api/admin/verifications`
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Failed to load pending verifications."
                );
            }

            setPendingCount(
                Array.isArray(data) ? data.length : 0
            );

        } catch (error) {
            console.error(
                "Failed to fetch pending verification count:",
                error
            );
        }
    }, []);

    useEffect(() => {
        const handleVerificationUpdate = () => {
            fetchPendingCount();
        };

        // Load count when dashboard opens
        fetchPendingCount();

        // Receive global event from AdminLayout
        window.addEventListener(
            "admin-verification-updated",
            handleVerificationUpdate
        );

        return () => {
            window.removeEventListener(
                "admin-verification-updated",
                handleVerificationUpdate
            );
        };
    }, [fetchPendingCount]);

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

            <VerificationTable />

            <SubmittedQuestions />

        </AdminLayout>
    );
};

export default Dashboard;