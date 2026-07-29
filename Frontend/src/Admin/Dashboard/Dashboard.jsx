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

import "./Dashboard.css";

const Dashboard = () => {

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
                    value="18"
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