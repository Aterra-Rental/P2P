import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import InvitationCard from "../components/Deal/InvitationCard";

import {
    getInvitations,
    acceptInvitation,
    rejectInvitation,
} from "../lib/room";

const InvitationPage = () => {
    const navigate = useNavigate();

    const currentUserId = localStorage.getItem("user_id");

    const [invitations, setInvitations] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadInvitations = async () => {
        try {
            setLoading(true);

            const response = await getInvitations(currentUserId);

            if (response.success) {
                setInvitations(response.invitations || []);
            } else {
                setInvitations([]);
            }
        } catch (error) {
            console.error(error);
            setInvitations([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadInvitations();
    }, []);

    const handleAccept = async (roomCode) => {
        const response = await acceptInvitation(roomCode);

        if (response.success) {
            // Refresh the list
            await loadInvitations();

            // Next page (we'll build later)
            navigate(`/roles/${roomCode}`);
        }
    };

    const handleReject = async (roomCode) => {
        const response = await rejectInvitation(roomCode);

        if (response.success) {
            await loadInvitations();
        }
    };

    return (
        <div className="container py-4">

            <h2 className="mb-4">
                Invitations
            </h2>

            {loading ? (
                <p>Loading...</p>
            ) : invitations.length === 0 ? (
                <p>No pending invitations.</p>
            ) : (
                invitations.map((invitation) => (
                    <InvitationCard
                        key={invitation.room_code}
                        invitation={invitation}
                        onAccept={handleAccept}
                        onReject={handleReject}
                    />
                ))
            )}

        </div>
    );
};

export default InvitationPage;