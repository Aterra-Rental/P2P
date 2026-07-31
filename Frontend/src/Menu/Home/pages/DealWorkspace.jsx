import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "./DealWorkspace.css";
import { getRoom, remindPartner } from "../lib/room";
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
  const [remindLoading, setRemindLoading] = useState(false);
  const [remindSuccess, setRemindSuccess] = useState("");
  const [remindError, setRemindError] = useState("");
  const [remindCooldown, setRemindCooldown] = useState(0);
 
    useEffect(() => {
    if (remindCooldown <= 0) return;

    const timer = setInterval(() => {
        setRemindCooldown((previous) =>
            previous > 0 ? previous - 1 : 0
        );
    }, 1000);

            return () => clearInterval(timer);
        }, [remindCooldown]);


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
    socket.on("roles_selected", handleRoomUpdated);

    return () => {
      socket.off("room_updated", handleRoomUpdated);
      socket.off("roles_selected", handleRoomUpdated);
    };
  }, [roomCode]);

  if (loading) {
    return <div>Loading deal...</div>;
  }
  const handleRemindPartner = async () => {
    if (remindLoading) return;

    try {
      setRemindLoading(true);
      setRemindSuccess("");
      setRemindError("");

      const currentUserId = localStorage.getItem("user_id");

      const result = await remindPartner(room.room_code, currentUserId);

      setRemindSuccess(result.message);
    } catch (err) {
      setRemindError(err.message);

        if (err.remainingSeconds) {
            setRemindCooldown(err.remainingSeconds);
        }
    } finally {
      setRemindLoading(false);

      setTimeout(() => {
        setRemindSuccess("");
        setRemindError("");
      }, 4000);
    }
  };
  if (!room) {
    return <div>Room not found.</div>;
  }

  return (
    <div className="deal-workspace">
      <div className="deal-container">
<DealHeader
    room={room}
    onRemind={handleRemindPartner}
    remindLoading={remindLoading}
    remindSuccess={remindSuccess}
    remindError={remindError}
    remindCooldown={remindCooldown}
/>
        {/* <ParticipantsPanel room={room} /> */}

        <ParticipantsPanel room={room} />

{room.status === "Accepted" &&
  (!room.current_step ||
    room.current_step === "RoleSelection") && (
    <RoleSelector room={room} />
)}

{room.current_step === "DealConfirmation" && (
  <div className="deal-stage-placeholder">
    <h2>Deal Confirmation</h2>
    <p>
      Roles are assigned. Amount negotiation is the next
      stage.
    </p>
  </div>
)}

{room.current_step === "Payment" && (
  <PaymentPanel room={room} />
)}

<ChatBox room={room} />

        

      </div>
    </div>
  );
};

export default DealWorkspace;
