import "./VerificationTable.css";
import { useState } from "react";
import VerificationModal from "./VerificationModal";
const VerificationTable = () => {
    const [selectedUser, setSelectedUser] = useState(null);
    const pendingUsers = [

    {
        id: 1,
        name: "John Doe",
        email: "john@example.com",
        phone: "012345678",
        address: "Phnom Penh",
        nationalId: "123456789",
        frontImage: "https://via.placeholder.com/400x250",
        backImage: "https://via.placeholder.com/400x250",
        status: "Pending"
    },

    {
        id: 2,
        name: "Jane Smith",
        email: "jane@example.com",
        phone: "098765432",
        address: "Siem Reap",
        nationalId: "987654321",
        frontImage: "https://via.placeholder.com/400x250",
        backImage: "https://via.placeholder.com/400x250",
        status: "Pending"
    },

    {
        id: 3,
        name: "David Lee",
        email: "david@example.com",
        phone: "087654321",
        address: "Battambang",
        nationalId: "112233445",
        frontImage: "https://via.placeholder.com/400x250",
        backImage: "https://via.placeholder.com/400x250",
        status: "Pending"
    }

];

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
                        <th>Status</th>
                        <th>Action</th>
                    </tr>
                    
                </thead>

                <tbody>

                    {pendingUsers.map(user => (

                        <tr key={user.id}>

                            <td>{user.name}</td>

                            <td>{user.email}</td>

                            <td>

                                <span className="status pending">

                                    {user.status}

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