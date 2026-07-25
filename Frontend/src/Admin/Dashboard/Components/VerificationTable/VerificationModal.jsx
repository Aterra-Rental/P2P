import "./VerificationModal.css";

const VerificationModal = ({ user, onClose }) => {

    if (!user) return null;

    return (

        <div className="modal-overlay">

            <div className="verification-modal">

                <div className="modal-header">

                    <h2>User Verification</h2>

                    <button onClick={onClose}>✕</button>

                </div>

                <div className="modal-body">

                    <div className="user-info">

                        <p><strong>Full Name:</strong> {user.name}</p>

                        <p><strong>Email:</strong> {user.email}</p>

                        <p><strong>Phone:</strong> {user.phone}</p>

                        <p><strong>Address:</strong> {user.address}</p>

                        <p><strong>National ID:</strong> {user.nationalId}</p>

                    </div>

                    <div className="id-images">

                        <div>

                            <h4>Front ID</h4>

                            <img
                                src={user.frontImage}
                                alt="Front ID"
                            />

                        </div>

                        <div>

                            <h4>Back ID</h4>

                            <img
                                src={user.backImage}
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