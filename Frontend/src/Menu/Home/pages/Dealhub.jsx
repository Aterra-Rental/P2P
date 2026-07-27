// src/Menu/Home/pages/DealHub.jsx

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import CreateDealForm from "../components/Deal/CreateDealForm";
import RoomCard from "../components/Deal/RoomCard";

import { getRooms } from "../lib/room";

const DealHub = () => {
    const navigate = useNavigate();

    const currentUserId = localStorage.getItem("user_id");

    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);

    // Refresh room list (used after creating a deal)
    const refreshRooms = useCallback(async () => {
    if (!currentUserId) return;

    try {
        setLoading(true);

        const response = await getRooms(currentUserId);

        if (response.success) {
            setRooms(response.rooms || []);
        } else {
            setRooms([]);
        }
    } catch (error) {
        console.error("Failed to load rooms:", error);
        setRooms([]);
    } finally {
        setLoading(false);
    }
}, [currentUserId]);

    // Load rooms once when page opens
    useEffect(() => {
    refreshRooms();
}, [refreshRooms]);

const handleOpen = (room) => {
    navigate(`/deal/${room.room_code}`);
};

    return (
        <div className="container py-4">
            <h2 className="mb-4">Deal Hub</h2>

            <CreateDealForm onCreated={refreshRooms} />
            <button
    className="btn btn-primary mb-3"
    onClick={() => navigate("/invitations")}
>
    View Invitations
</button>

            <hr className="my-4" />

            <h4>My Deals</h4>

            {loading ? (
                <p>Loading deals...</p>
            ) : rooms.length === 0 ? (
                <p>No deals found.</p>
            ) : (
                <div className="d-flex flex-column gap-3">
                    {rooms.map((room) => (
                        <RoomCard
                            key={room.room_code}
                            room={room}
                            currentUserId={currentUserId}
                            onOpen={handleOpen}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default DealHub;