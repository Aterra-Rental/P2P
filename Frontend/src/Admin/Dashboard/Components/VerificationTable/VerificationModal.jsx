import "./VerificationModal.css";
import { useEffect, useState } from "react";
import API_URL from "../../../../lib/api";

const VerificationModal = ({ user, onClose }) => {

    const [details, setDetails] = useState(null);

    useEffect(() => {

        if (!user) {
            setDetails(null);
            return;
        }

        fetch(`${API_URL}/api/admin/verifications/${user.user_id}`)
            .then(res => res.json())
            .then(data => setDetails(data))
            .catch(err => console.error(err));

    }, [user]);

    if (!user) return null;

    if (!details) {
        return (
            <div className="modal-overlay">
                <div className="verification-modal">
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    return (

        <div className="modal-overlay">

            <div className="verification-modal">

                <div className="modal-header">

                    <h2>User Verification</h2>

                    <button onClick={onClose}>✕</button>

                </div>

                <div className="modal-body">

                    <div className="user-info">

                        <p><strong>Full Name:</strong> {details.firstname} {details.lastname}</p>

                        <p><strong>Email:</strong> {details.email}</p>

                        <p><strong>Phone:</strong> {details.phonenumber}</p>

                        <p><strong>Address:</strong> {details.address}</p>

                        <p><strong>National ID:</strong> {details.nationalidentity_id}</p>

                    </div>

                    <div className="id-images">

                        <div>

                            <h4>Front ID</h4>

                            <img
                                src={`${API_URL}/${details.national_id_front}`}
                                alt="Front ID"
                            />

                        </div>

                        <div>

                            <h4>Back ID</h4>

                            <img
                                src={`${API_URL}/${details.national_id_back}`}
                                alt="Back ID"
                            />

                        </div>

                    </div>

                </div>

                <div className="modal-footer">

                    <button className="reject-btn">

                        Reject

                    </button>

                    <button className="approve-btn">

                        Approve

                    </button>

                </div>

            </div>

        </div>

    );

};

export default VerificationModal;