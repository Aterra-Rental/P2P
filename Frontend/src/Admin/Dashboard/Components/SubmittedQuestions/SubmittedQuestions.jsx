import "../VerificationTable/VerificationTable.css";
import { useState, useEffect } from "react";
import API_URL from "../../../../lib/api";

const SubmittedQuestions = () => {
  const [questions, setQuestions] = useState([]);
  const [replyText, setReplyText] = useState({});

  const loadQuestions = () => {
    fetch(`${API_URL}/api/faq/questions`)
      .then((res) => res.json())
      .then((data) => setQuestions(data))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    loadQuestions();
  }, []);
  async function submitReply(questionId) {
    const reply = (replyText[questionId] || "").trim();

    if (!reply) {
      alert("Please enter a reply.");
      return;
    }

    try {
      const admin = JSON.parse(localStorage.getItem("admin") || "{}");

      const res = await fetch(`${API_URL}/api/faq/reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question_id: questionId,
          admin_reply: reply,
          answered_by: admin.admin_id,
        }),
      });

      if (!res.ok) {
        throw new Error("Reply failed");
      }

      setReplyText((prev) => ({
        ...prev,
        [questionId]: "",
      }));

      loadQuestions();
    } catch (err) {
      console.error(err);
      alert("Unable to submit reply.");
    }
  }

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
            <th>Reply</th>
            <th>Status</th>
            <th>Date</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {questions.map((q) => (
            <tr key={q.question_id}>
              <td>{q.firstname ? `${q.firstname} ${q.lastname}` : q.email}</td>

              <td>{q.question}</td>

              <td>
                {q.admin_reply ? (
                  <div>{q.admin_reply}</div>
                ) : (
                  <textarea
                    rows={2}
                    value={replyText[q.question_id] || ""}
                    onChange={(e) =>
                      setReplyText((prev) => ({
                        ...prev,
                        [q.question_id]: e.target.value,
                      }))
                    }
                    placeholder="Write reply..."
                  />
                )}
              </td>

              <td>
                <span className={`status ${q.status.toLowerCase()}`}>
                  {q.status}
                </span>
              </td>

              <td>{new Date(q.created_at).toLocaleDateString()}</td>

              <td>
                {!q.admin_reply && (
                  <button onClick={() => submitReply(q.question_id)}>
                    Reply
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SubmittedQuestions;
