import "./VerificationTable.css";
import { useEffect, useMemo, useState } from "react";
import VerificationModal from "./VerificationModal";
import { API_URL } from "../../../../lib/api";
import { socket } from "../../../../lib/socket";

const VerificationTable = () => {

    const [selectedUser, setSelectedUser] = useState(null);
    const [pendingUsers, setPendingUsers] = useState([]);
    const [sortOrder, setSortOrder] = useState("oldest");

    const loadPendingUsers = () => {

    fetch(`${API_URL}/admin/verifications`)
        .then(res => res.json())
        .then(data => setPendingUsers(data))
        .catch(err => console.error(err));

    };

    useEffect(() => {

    const handleVerificationUpdate = () => {
        console.log(
            "Refreshing pending verification table"
        );

        loadPendingUsers();
    };

    loadPendingUsers();

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

}, []);

    // Live updates via Socket.IO — backend emits "verification_updated"
    // on new submissions, approvals, and rejections
    useEffect(() => {

        const handleSocketUpdate = () => {
            console.log(
                "Socket: verification_updated received, refreshing table"
            );

            loadPendingUsers();
        };

        socket.on("verification_updated", handleSocketUpdate);

        return () => {
            socket.off("verification_updated", handleSocketUpdate);
        };

    }, []);

    const sortedUsers = useMemo(() => {

        const usersCopy = [...pendingUsers];

        usersCopy.sort((a, b) => {

            const dateA = a.joined_at ? new Date(a.joined_at).getTime() : 0;
            const dateB = b.joined_at ? new Date(b.joined_at).getTime() : 0;

            return sortOrder === "oldest"
                ? dateA - dateB
                : dateB - dateA;

        });

        return usersCopy;

    }, [pendingUsers, sortOrder]);

    return (

        <div className="verification-table">

            <div className="table-header">

                <h2>Recent Verification Requests</h2>

                <div className="table-header-actions">

                    <select
                        className="verification-sort-select"
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                    >
                        <option value="oldest">Submitted first</option>
                        <option value="newest">Submitted last</option>
                    </select>

                    <button>View All</button>

                </div>

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

                    {sortedUsers.map(user => (

                        <tr key={user.user_id}>

                            <td>{user.fullname}</td>

                            <td>{user.email}</td>

                            <td>{user.phone}</td>

                            <td>

                                <span className={`status ${user.verify_status.toLowerCase()}`}>
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
                    onVerified={() => {

                        setSelectedUser(null);
                        loadPendingUsers();

                    }}
                />

        </div>

    );

};

export default VerificationTable;