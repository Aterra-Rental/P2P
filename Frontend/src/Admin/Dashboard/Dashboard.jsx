import { useCallback, useEffect, useState } from "react";

import {
    FaUsers,
    FaUserCheck,
    FaMoneyCheckAlt,
    FaCheckCircle,
    FaQuestionCircle
} from "react-icons/fa";

import AdminLayout from "../Components/Layout/AdminLayout";
import StatCard from "./Components/StatCard/StatCard";
import SignupsChart from "./Components/SignupsChart/SignupsChart";

import { API_URL } from "../../lib/api";
import { getDashboardStats } from "../../lib/dashboard";

import "./Dashboard.css";

const Dashboard = () => {
    const [pendingCount, setPendingCount] = useState(0);
    const [pendingFaqCount, setPendingFaqCount] = useState(0);

    const [stats, setStats] = useState({
        totalUsers: 0,
        transactions: 0,
        completedDeals: 0
    });

    const fetchPendingCount = useCallback(async () => {
        try {
            const response = await fetch(
                `${API_URL}/admin/verifications`
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

    const fetchPendingFaqCount = useCallback(async () => {
        try {
            const response = await fetch(
                `${API_URL}/faq/questions`
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Failed to load FAQ questions."
                );
            }

            const pending = Array.isArray(data)
                ? data.filter((q) => q.status !== "Answered")
                : [];

            setPendingFaqCount(pending.length);

        } catch (error) {
            console.error(
                "Failed to fetch pending FAQ count:",
                error
            );
        }
    }, []);

    const fetchStats = useCallback(async () => {
        try {
            const data = await getDashboardStats();

            setStats({
                totalUsers: data.totalUsers ?? 0,
                transactions: data.transactions ?? 0,
                completedDeals: data.completedDeals ?? 0
            });

        } catch (error) {
            console.error(
                "Failed to fetch dashboard stats:",
                error
            );
        }
    }, []);

    useEffect(() => {
        const handleVerificationUpdate = () => {
            fetchPendingCount();
        };

        const handleFaqUpdate = () => {
            fetchPendingFaqCount();
        };

        const handleTransactionUpdate = () => {
            fetchStats();
        };

        fetchPendingCount();
        fetchPendingFaqCount();
        fetchStats();

        window.addEventListener(
            "admin-verification-updated",
            handleVerificationUpdate
        );

        window.addEventListener(
            "admin-faq-updated",
            handleFaqUpdate
        );

        window.addEventListener(
            "admin-transaction-updated",
            handleTransactionUpdate
        );

        return () => {
            window.removeEventListener(
                "admin-verification-updated",
                handleVerificationUpdate
            );

            window.removeEventListener(
                "admin-faq-updated",
                handleFaqUpdate
            );

            window.removeEventListener(
                "admin-transaction-updated",
                handleTransactionUpdate
            );
        };
    }, [fetchPendingCount, fetchPendingFaqCount, fetchStats]);

    return (
        <AdminLayout>

            <div className="stats-grid">

                <StatCard
                    title="Total Users"
                    value={stats.totalUsers}
                    icon={<FaUsers />}
                    color="linear-gradient(135deg,#7C3AED,#A855F7)"
                />

                <StatCard
                    title="Transactions"
                    value={stats.transactions}
                    icon={<FaMoneyCheckAlt />}
                    color="linear-gradient(135deg,#3B82F6,#60A5FA)"
                />

                <StatCard
                    title="Completed Deals"
                    value={stats.completedDeals}
                    icon={<FaCheckCircle />}
                    color="linear-gradient(135deg,#10B981,#34D399)"
                />

                <StatCard
                    title="Pending Verification"
                    value={pendingCount}
                    icon={<FaUserCheck />}
                    color="linear-gradient(135deg,#F59E0B,#FBBF24)"
                />

                <StatCard
                    title="Pending FAQ"
                    value={pendingFaqCount}
                    icon={<FaQuestionCircle />}
                    color="linear-gradient(135deg,#EC4899,#F472B6)"
                />

            </div>

            <div className="chart-section">
                <SignupsChart />
            </div>

        </AdminLayout>
    );
};

export default Dashboard;
