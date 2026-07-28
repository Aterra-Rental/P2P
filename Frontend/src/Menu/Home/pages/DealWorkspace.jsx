import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "./DealWorkspace.css";
import { getRoom } from "../lib/room";
import { socket } from "../../../lib/socket";

import DealHeader from "../components/Deal/DealHeader";
import ParticipantsPanel from "../components/Deal/ParticipantsPanel";
import RoleSelector from "../components/Deal/RoleSelector";
import ChatBox from "../components/Deal/ChatBox";
import PaymentPanel from "../components/Deal/PaymentPanel";

const DealWorkspace = () => {
    const { roomCode } = useParams();

    const [room, setRoom] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRoom = async () => {
            try {
                const response = await getRoom(roomCode);

                if (response.success) {
                    setRoom(response.room);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchRoom();

        socket.emit("join_deal", {
            room_code: roomCode,
        });

        const handleRoomUpdated = (data) => {
            if (data.room_code === roomCode) {
                fetchRoom();
            }
        };

        socket.on("room_updated", handleRoomUpdated);

        return () => {
            socket.off("room_updated", handleRoomUpdated);
        };
    }, [roomCode]);

    if (loading) {
        return <div>Loading deal...</div>;
    }

    if (!room) {
        return <div>Room not found.</div>;
    }

    return (
        <div className="deal-workspace">
            <div className="deal-container">
                <DealHeader room={room} />

                <ParticipantsPanel room={room} />

                <RoleSelector room={room} />

                <ChatBox room={room} />

                <PaymentPanel room={room} />
            </div>
        </div>
    );
};

export default DealWorkspace;