import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import './DealWorkspace.css'
import { getRoom } from "../lib/room";

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
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

        fetchRoom();
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