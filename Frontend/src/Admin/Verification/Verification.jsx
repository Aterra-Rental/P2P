import AdminLayout from "../Components/Layout/AdminLayout";
import VerificationTable from "../Dashboard/Components/VerificationTable/VerificationTable";

import "../Dashboard/Dashboard.css";

const Verification = () => {
    return (
        <AdminLayout>
            <div className="users-page-header">
                <h1>Verification</h1>
                <p>Review and act on pending identity verification requests.</p>
            </div>

            <VerificationTable />
        </AdminLayout>
    );
};

export default Verification;