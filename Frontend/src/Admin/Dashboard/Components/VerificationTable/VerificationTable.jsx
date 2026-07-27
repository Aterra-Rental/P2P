import "./VerificationTable.css";
import { useState, useEffect } from "react";
import VerificationModal from "./VerificationModal";
import API_URL from "../../../../lib/api";

const VerificationTable = () => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [pendingUsers, setPendingUsers] = useState([]);

  const loadPendingUsers = () => {
    fetch(`${API_URL}/api/admin/verifications`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const onlyPending = data.filter(
            (user) => user.verify_status && user.verify_status.toLowerCase() === "pending"
          );
          setPendingUsers(onlyPending);
        }
      })
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    loadPendingUsers(); // initial load

    const interval = setInterval(() => {
      loadPendingUsers();
    }, 3000); // every 3 seconds

    return () => clearInterval(interval); // cleanup on unmount
}, []);

  // Remove the user from local UI immediately, then reload
  const handleActionSuccess = (userId) => {
    if (userId) {
      setPendingUsers((prev) => prev.filter((u) => u.user_id !== userId));
    }
    setSelectedUser(null);
    loadPendingUsers();
  };

  return (
    <div className="verification-table">
      <div className="table-header">
        <h2>Recent Verification Requests</h2>
        <button>View All</button>
      </div>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {pendingUsers.length > 0 ? (
            pendingUsers.map((user) => (
              <tr key={user.user_id}>
                <td>{user.fullname}</td>
                <td>{user.email}</td>
                <td>{user.phone}</td>
                <td>
                  <span className="status pending">{user.verify_status}</span>
                </td>
                <td>
                  <button
                    className="view-btn"
                    onClick={() => setSelectedUser(user)}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5" style={{ textAlign: "center", padding: "1rem" }}>
                No pending verification requests.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {selectedUser && (
        <VerificationModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onVerified={() => handleActionSuccess(selectedUser.user_id)}
          onRejected={() => handleActionSuccess(selectedUser.user_id)}
          onAction={() => handleActionSuccess(selectedUser.user_id)}
        />
      )}
    </div>
  );
};

export default VerificationTable;