import "./VerificationTable.css";
import { useState, useEffect } from "react";
import VerificationModal from "./VerificationModal";
import API_URL from "../../../../lib/api";

const VerificationTable = () => {

    const [selectedUser, setSelectedUser] = useState(null);
    const [pendingUsers, setPendingUsers] = useState([]);

    useEffect(() => {

        fetch(`${API_URL}/api/admin/verifications`)
            .then(res => res.json())
            .then(data => setPendingUsers(data))
            .catch(err => console.error(err));

    }, []);

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

                    {pendingUsers.map(user => (

                        <tr key={user.user_id}>

                            <td>{user.fullname}</td>

                            <td>{user.email}</td>

                            <td>{user.phone}</td>

                            <td>

                                <span className="status pending">

                                    {user.verify_status}

                                </span>

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

                    ))}

                </tbody>

            </table>

            <VerificationModal
                user={selectedUser}
                onClose={() => setSelectedUser(null)}
            />

        </div>

    );

};

export default VerificationTable;