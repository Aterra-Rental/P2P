import "../VerificationTable/VerificationTable.css";
import { useState, useEffect } from "react";
import API_URL from "../../../../lib/api";

const SubmittedQuestions = () => {

    const [questions, setQuestions] = useState([]);

    const loadQuestions = () => {
        fetch(`${API_URL}/api/faq/questions`)
            .then(res => res.json())
            .then(data => setQuestions(data))
            .catch(err => console.error(err));
    };

    useEffect(() => {
        loadQuestions();
    }, []);

    return (
        <div className="verification-table">

            <div className="table-header">
                <h2>Submitted Questions</h2>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Asked By</th>
                        <th>Question</th>
                        <th>Status</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
                    {questions.map(q => (
                        <tr key={q.question_id}>
                            <td>{q.firstname ? `${q.firstname} ${q.lastname}` : q.email || "Anonymous"}</td>
                            <td>{q.question}</td>
                            <td>
                                <span className="status pending">
                                    {q.status}
                                </span>
                            </td>
                            <td>{new Date(q.created_at).toLocaleDateString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

        </div>
    );
};

export default SubmittedQuestions;