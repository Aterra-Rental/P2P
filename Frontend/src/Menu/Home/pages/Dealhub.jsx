// src/Menu/Home/pages/DealHub.jsx

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../../../lib/socket";
import CreateDealForm from "../components/Deal/CreateDealForm";
import RoomCard from "../components/Deal/RoomCard";
import InvitationCard from "../components/Deal/InvitationCard";
import "./Dealhub.css";
import styles from "../lib/styles";
import { acceptInvitation, rejectInvitation } from "../lib/room";
import { getRooms, getInvitations, markRoomRemindersRead } from "../lib/room";

const DealHub = () => {
  const navigate = useNavigate();

  const currentUserId = localStorage.getItem("user_id");

  const [rooms, setRooms] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const handleOpenRoom = async (room) => {
    try {
      if (room.has_unread_reminder || room.reminded) {
        await markRoomRemindersRead(room.room_code, currentUserId);

        setRooms((previousRooms) =>
          previousRooms.map((currentRoom) =>
            currentRoom.room_code === room.room_code
              ? {
                  ...currentRoom,
                  reminded: false,
                  has_unread_reminder: false,
                }
              : currentRoom,
          ),
        );
      }
    } catch (error) {
      console.error("Failed to mark reminder as read:", error);
    }

    navigate(`/deal/${room.room_code}`);
  };
  const refreshData = useCallback(
    async (showLoading = false) => {
      if (!currentUserId) return;

      if (showLoading) {
        setLoading(true);
      }

      try {
        const [roomResponse, invitationResponse] = await Promise.all([
          getRooms(currentUserId),
          getInvitations(currentUserId),
        ]);

        setRooms((previousRooms) => {
          const newRooms = roomResponse.success ? roomResponse.rooms : [];

          return newRooms.map((newRoom) => {
            const previousRoom = previousRooms.find(
              (room) => room.room_code === newRoom.room_code,
            );

            return {
              ...newRoom,
              reminded: previousRoom?.reminded || false,
            };
          });
        });
        setInvitations(
          invitationResponse.success ? invitationResponse.invitations : [],
        );
      } catch (err) {
        console.error(err);
        setRooms([]);
        setInvitations([]);
      } finally {
        setLoading(false);
      }
    },
    [currentUserId],
  );

  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    refreshData(true);

    socket.emit("join_user", {
      user_id: currentUserId,
    });

    const handleRoomUpdated = () => {
      refreshData();
    };

    const handlePartnerReminded = (data) => {
      setRooms((previousRooms) =>
        previousRooms.map((room) =>
          room.room_code === data.room_code
            ? {
                ...room,
                reminded: true,
              }
            : room,
        ),
      );
    };

    socket.on("room_updated", handleRoomUpdated);
    socket.on("partner_reminded", handlePartnerReminded);

    return () => {
      socket.off("room_updated", handleRoomUpdated);
      socket.off("partner_reminded", handlePartnerReminded);
    };
  }, [refreshData, currentUserId]);
  const handleAccept = async (roomCode) => {
    try {
      const response = await acceptInvitation(roomCode, currentUserId);

      console.log(response);

      if (response.success) {
        navigate(`/deal/${roomCode}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReject = async (roomCode) => {
    try {
      const response = await rejectInvitation(roomCode, currentUserId);
      console.log(response);

      await refreshData(true);
    } catch (err) {
      console.error(err);
    }
  };
  const invitationRoomCodes = new Set(
    invitations.map((invitation) => invitation.room_code),
  );

  const visibleRooms = rooms.filter((room) => {
    const isCreator = String(room.created_by) === String(currentUserId);

    const isRejectedInvitee = room.status === "Rejected" && !isCreator;

    if (isRejectedInvitee) {
      return false;
    }

    return !invitationRoomCodes.has(room.room_code);
  });
  return (
    <div style={styles.page}>
      <div style={styles.modalContainer}>
        {/* Header */}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "0.5rem",
          }}
        >
          <h1 style={styles.title}>Deal Hub</h1>

          <span style={styles.pill("#d946ef")}>User #{currentUserId}</span>
        </div>

        <p
          style={{
            color: "#a89db8",
            marginBottom: "1.5rem",
          }}
        >
          Create a trade with a registered user or manage your active deals.
        </p>

        {/* Main Layout */}

        <div style={styles.splitLayout}>
          {/* Left */}

          <div style={styles.sectionBox}>
            <div style={styles.sectionHeader}>Create a Deal</div>

            <CreateDealForm onCreated={refreshData} />
          </div>

          {/* Right */}

          <div style={styles.roomSection}>
            <div style={styles.sectionHeader}>Active & Invited Rooms</div>

            {loading ? (
              <p>Loading...</p>
            ) : (
              <>
                <div className="room-filter">
                  <button
                    className={filter === "all" ? "active" : ""}
                    onClick={() => setFilter("all")}
                  >
                    All
                  </button>

                  <button
                    className={filter === "active" ? "active" : ""}
                    onClick={() => setFilter("active")}
                  >
                    Active
                  </button>

                  <button
                    className={filter === "invitation" ? "active" : ""}
                    onClick={() => setFilter("invitation")}
                  >
                    Invitations
                  </button>
                </div>

                <div className="room-list" style={styles.roomList}>
                  {/* All */}
                  {filter === "all" && (
                    <>
                      {invitations.map((invitation) => (
                        <InvitationCard
                          key={`invitation-${invitation.room_code}`}
                          invitation={invitation}
                          onAccept={handleAccept}
                          onReject={handleReject}
                        />
                      ))}

                      {visibleRooms.map((room) => (
                        <RoomCard
                          key={`room-${room.room_code}`}
                          room={room}
                          currentUserId={currentUserId}
                          onOpen={handleOpenRoom}
                          onUpdated={refreshData}
                        />
                      ))}
                    </>
                  )}

                  {/* Active */}
                  {filter === "active" &&
                    visibleRooms
                      .filter((room) => room.status === "Accepted")
                      .map((room) => (
                        <RoomCard
                          key={`active-${room.room_code}`}
                          room={room}
                          currentUserId={currentUserId}
                          onOpen={handleOpenRoom}
                          onUpdated={refreshData}
                        />
                      ))}

                  {/* Invitations */}
                  {filter === "invitation" &&
                    invitations.map((invitation) => (
                      <InvitationCard
                        key={`invitation-only-${invitation.room_code}`}
                        invitation={invitation}
                        onAccept={handleAccept}
                        onReject={handleReject}
                      />
                    ))}
                </div>
                {rooms.length === 0 && invitations.length === 0 && (
                  <div
                    style={{
                      color: "#6f6785",
                      textAlign: "center",
                      marginTop: "1.5rem",
                    }}
                  >
                    No active rooms. Create your first deal.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DealHub;
