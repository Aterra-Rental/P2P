import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./DealWorkspace.css";
import { getRoom, remindPartner } from "../lib/room";
import { socket } from "../../../lib/socket";
import DealHeader from "../components/Deal/DealHeader";
import RoleSelector from "../components/Deal/RoleSelector";
import ChatBox from "../components/Deal/ChatBox";
import PaymentPanel from "../components/Deal/PaymentPanel";
import { getDealRoles } from "../lib/deal";


const DealWorkspace = () => {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const currentUserId = localStorage.getItem("user_id");

  const [room, setRoom] = useState(null);
  const [roleState, setRoleState] = useState(null);
  const [bothUsersPresent, setBothUsersPresent] =
    useState(false);

  const handleLeaveRoom = () => {
    socket.emit("leave_deal", {
      room_code: roomCode,
      user_id: currentUserId,
    });

    navigate("/deals");
  };
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
  

  const fetchWorkspaceData = async () => {
    try {
      const [roomResponse, roleResponse] = await Promise.all([
        getRoom(roomCode),
        getDealRoles(roomCode, currentUserId),
      ]);

      if (roomResponse.success) {
        setRoom(roomResponse.room);
      }

      if (roleResponse.success) {
        setRoleState(roleResponse);
      }
    } catch (error) {
      console.error("Failed to load deal workspace:", error);
    } finally {
      setLoading(false);
    }
  };

  const joinDealRoom = () => {
  socket.emit("join_deal", {
    room_code: roomCode,
    user_id: currentUserId,
  });
};

  const handleDealUpdated = (data) => {
    if (data.room_code === roomCode) {
      fetchWorkspaceData();
    }
  };
  const handlePresenceUpdated = (data) => {
  if (data.room_code === roomCode) {
    setBothUsersPresent(Boolean(data.both_present));
  }
};

  fetchWorkspaceData();

  if (socket.connected) {
    joinDealRoom();
  }

  socket.on("connect", joinDealRoom);
  socket.on("room_updated", handleDealUpdated);
  socket.on("roles_selected", handleDealUpdated);
  socket.on("role_confirmation_updated", handleDealUpdated);
  socket.on("role_selection_reset", handleDealUpdated);
  socket.on("roles_confirmed", handleDealUpdated);
  socket.on("deal_presence_updated", handlePresenceUpdated, );

  return () => {
    socket.off("connect", joinDealRoom);
    socket.off("room_updated", handleDealUpdated);
    socket.off("roles_selected", handleDealUpdated);
    socket.off("role_confirmation_updated", handleDealUpdated);
    socket.off("role_selection_reset", handleDealUpdated);
    socket.off("roles_confirmed", handleDealUpdated);
    socket.emit("leave_deal", { room_code: roomCode, user_id: currentUserId, });
    socket.off( "deal_presence_updated", handlePresenceUpdated,);
  };
}, [roomCode, currentUserId]);

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

  const renderCurrentDealStage = () => {
    if (
      room.status === "Accepted" &&
      (!room.current_step || room.current_step === "RoleSelection")
    ) {
      return (
        <RoleSelector
          room={room}
          roleState={roleState}
          onLeave={handleLeaveRoom}
        />
      );
    }

    if (room.current_step === "DealConfirmation") {
      return (
        <div className="deal-stage-placeholder">
          <span className="deal-stage-label">Current step</span>
          <h2>Confirm Deal Amount</h2>
          <p>
            Roles are assigned. Amount negotiation is the next stage.
          </p>
        </div>
      );
    }

    if (room.current_step === "Payment") {
      return <PaymentPanel room={room} />;
    }

    return (
      <div className="deal-stage-placeholder">
        <span className="deal-stage-label">Current step</span>
        <h2>Deal Status</h2>
        <p>{room.current_step || room.status}</p>
      </div>
    );
  };

  return (
    <div className="deal-workspace">
      <div className="deal-container">
        <DealHeader
          room={room}
          bothUsersPresent={bothUsersPresent}
          onLeave={handleLeaveRoom}
          onRemind={handleRemindPartner}
          remindLoading={remindLoading}
          remindSuccess={remindSuccess}
          remindError={remindError}
          remindCooldown={remindCooldown}
        />

        <div className="deal-workspace-grid">
          <section className="deal-action-panel">
            {renderCurrentDealStage()}
          </section>

          <aside className="deal-chat-panel">
            <div className="deal-panel-heading">
              <span>Deal conversation</span>
              <h2>Chat</h2>
            </div>

            <ChatBox
              room={room}
              roomId={room.room_id}
              userId={currentUserId}
            />
          </aside>
        </div>
      </div>
    </div>
  );
};

export default DealWorkspace;
