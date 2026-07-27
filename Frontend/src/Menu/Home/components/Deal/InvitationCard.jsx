import React from "react";

const InvitationCard = ({
    invitation,
    onAccept,
    onReject,
}) => {
    return (
        <div className="card shadow-sm mb-3">
            <div className="card-body">

                <h5 className="card-title">
                    {invitation.item_name}
                </h5>

                <p className="text-muted mb-2">
                    From: {invitation.creator_name}
                </p>

                <p className="mb-2">
                    {invitation.item_description}
                </p>

                <h6 className="mb-3">
                    ${invitation.agreed_price}
                </h6>

                <span className="badge bg-warning text-dark mb-3">
                    {invitation.status}
                </span>

                <div className="d-flex gap-2 mt-3">
                    <button
                        className="btn btn-success"
                        onClick={() => onAccept(invitation.room_code)}
                    >
                        Accept
                    </button>

                    <button
                        className="btn btn-danger"
                        onClick={() => onReject(invitation.room_code)}
                    >
                        Reject
                    </button>
                </div>

            </div>
        </div>
    );
};

export default InvitationCard;