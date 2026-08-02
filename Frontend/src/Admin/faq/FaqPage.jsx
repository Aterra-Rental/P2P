import AdminLayout from "../Components/Layout/AdminLayout";
import SubmittedQuestions from "../Dashboard/Components/SubmittedQuestions/SubmittedQuestions";

import "./FaqPage.css";

const FaqPage = () => {
    return (
        <AdminLayout>

            <div className="faq-page-header">
                <h1>FAQ</h1>
                <p>Questions submitted by users</p>
            </div>

            <SubmittedQuestions />

        </AdminLayout>
    );
};

export default FaqPage;