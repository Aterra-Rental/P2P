import { useState, useEffect, useRef } from "react";
import {
  checkUser,
  createRoom,
  getRooms,
  getRoom,
  updateRoom,
  deleteRoom,
} from "./lib/room";

import { selectRole } from "./lib/ participant";

import { generateQR, verifyPayment, releaseFunds } from "./lib/payment";

import { getMessages, sendMessage } from "./lib/message";
const generateRoomCode = () =>
  Math.random().toString(36).substring(2, 8).toUpperCase();
const formatTime = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const mapMessagesWithPrompts = (
  msgList,
  isRoleConf,
  isAmtConf,
  currentUserId,
) => {
  let lastRoleIdx = -1;
  let lastAmountIdx = -1;

  msgList.forEach((m, idx) => {
    const kind =
      String(m.sender_id) === String(currentUserId) ? "mine" : m.kind || "bot";
    const isSystem = kind === "system" || m.sender_id === "SYSTEM";
    if (!isSystem) return;
    if (idx === 0 || m.roleSelection) lastRoleIdx = idx;
    if (
      m.amountConfirmation ||
      m.text.includes("Role set as") ||
      m.text.includes("confirmed their roles")
    ) {
      lastAmountIdx = idx;
    }
  });

  return msgList.map((m, idx) => {
    let kind = m.kind || "bot";
    if (String(m.sender_id) === String(currentUserId)) kind = "mine";

    const isRolePromptMsg = idx === lastRoleIdx && !isRoleConf;
    const isAmountPromptMsg = idx === lastAmountIdx && isRoleConf && !isAmtConf;

    return {
      ...m,
      id: m.id || `msg_${idx}`,
      kind,
      roleSelection: isRolePromptMsg,
      amountConfirmation: isAmountPromptMsg,
      qrPayment: Boolean(m.qrPayment),
      fundsReceived: Boolean(m.fundsReceived),
    };
  });
};

const styles = {
  page: {
    minHeight: "100vh",
    background: "radial-gradient(circle at 20% 20%, #1a0f2e 0%, #0a0612 60%)",
    color: "#f5f3fa",
    fontFamily: "'Oswald', sans-serif",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "2rem 1rem",
  },
  modalContainer: {
    background: "#1c1a2e",
    border: "1px solid rgba(216, 128, 255, 0.15)",
    borderRadius: "16px",
    padding: "2rem",
    width: "100%",
    maxWidth: "1000px",
    boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
  },
  splitLayout: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "2rem",
    marginTop: "1rem",
  },
  sectionBox: {
    background: "#141224",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "12px",
    padding: "1.5rem",
  },
  title: {
    fontSize: "1.8rem",
    fontWeight: 700,
    marginBottom: "0.2rem",
    background: "linear-gradient(90deg, #d946ef, #ec4899)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  sectionHeader: {
    fontSize: "1.2rem",
    fontWeight: 700,
    marginBottom: "1rem",
    color: "#f3d9ff",
  },
  label: {
    fontSize: "0.85rem",
    color: "#c7c0d4",
    marginBottom: "0.3rem",
    display: "block",
    fontWeight: 600,
  },
  input: {
    width: "100%",
    padding: "0.75rem 1rem",
    borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.1)",
    background: "#0a0612",
    color: "#fff",
    fontSize: "0.95rem",
    marginBottom: "1rem",
    boxSizing: "border-box",
  },
  primaryBtn: (disabled) => ({
    width: "100%",
    padding: "0.8rem",
    borderRadius: "8px",
    border: "none",
    background: disabled
      ? "rgba(255,255,255,0.08)"
      : "linear-gradient(90deg, #d946ef, #ec4899)",
    color: disabled ? "#666" : "#fff",
    fontWeight: 700,
    fontSize: "0.95rem",
    cursor: disabled ? "not-allowed" : "pointer",
    marginTop: "0.5rem",
  }),
  simulateBtn: {
    width: "100%",
    padding: "0.65rem",
    borderRadius: "8px",
    border: "1px dashed #d946ef",
    background: "rgba(217, 70, 239, 0.1)",
    color: "#f3d9ff",
    fontWeight: 700,
    fontSize: "0.85rem",
    cursor: "pointer",
    marginBottom: "1rem",
  },
  roomCardVertical: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(217,70,239,0.2)",
    borderRadius: "10px",
    padding: "1rem",
    marginBottom: "0.75rem",
    cursor: "pointer",
  },
  codeBadge: {
    fontWeight: 800,
    padding: "0.2rem 0.6rem",
    borderRadius: "999px",
    background: "rgba(217,70,239,0.1)",
    border: "1px solid rgba(217,70,239,0.35)",
    color: "#f3d9ff",
    fontSize: "0.8rem",
  },
  inviteBadge: {
    fontWeight: 700,
    padding: "0.15rem 0.5rem",
    borderRadius: "4px",
    background: "rgba(74, 222, 128, 0.15)",
    border: "1px solid rgba(74, 222, 128, 0.4)",
    color: "#4ade80",
    fontSize: "0.7rem",
  },
  chatWindow: {
    background: "#141224",
    borderRadius: "14px",
    border: "1px solid rgba(255,255,255,0.06)",
    padding: "1rem",
    marginBottom: "1rem",
  },
  chatScroll: {
    maxHeight: "320px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  bubble: (kind) => ({
    background:
      kind === "mine"
        ? "linear-gradient(135deg, #d946ef, #ec4899)"
        : kind === "bot"
          ? "rgba(99,102,241,0.18)"
          : "#26233a",
    border: kind === "bot" ? "1px solid rgba(99,102,241,0.35)" : "none",
    color: "#fff",
    padding: "0.6rem 0.9rem",
    fontSize: "0.9rem",
    borderRadius: "12px",
    maxWidth: "85%",
    wordBreak: "break-word",
  }),
  roleBtnRow: {
    display: "flex",
    gap: "0.5rem",
    marginTop: "0.6rem",
  },
  roleChoiceBtn: (disabled, selected) => ({
    padding: "0.5rem 1rem",
    borderRadius: "8px",
    border: selected ? "1px solid #4ade80" : "1px solid rgba(255,255,255,0.2)",
    background: selected ? "rgba(74,222,128,0.2)" : "rgba(255,255,255,0.06)",
    color: "#fff",
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.3 : 1,
  }),
  actionBtnGroup: {
    display: "flex",
    gap: "0.5rem",
    marginTop: "0.8rem",
  },
  confirmBtn: {
    flex: 1,
    padding: "0.5rem",
    borderRadius: "6px",
    border: "none",
    background: "#22c55e",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },
  cancelBtn: {
    flex: 1,
    padding: "0.5rem",
    borderRadius: "6px",
    border: "none",
    background: "#ef4444",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },
  deleteDealBtn: {
    width: "100%",
    padding: "0.6rem",
    borderRadius: "6px",
    border: "1px solid rgba(239,68,68,0.5)",
    background: "rgba(239,68,68,0.15)",
    color: "#fca5a5",
    fontWeight: 700,
    fontSize: "0.85rem",
    cursor: "pointer",
    marginTop: "0.8rem",
  },
  errorBox: {
    color: "#f87171",
    fontSize: "0.85rem",
    marginBottom: "0.8rem",
    background: "rgba(239,68,68,0.1)",
    padding: "0.5rem 0.8rem",
    borderRadius: "6px",
    border: "1px solid rgba(239,68,68,0.2)",
  },
  // --- NEW styles for the Bakong / escrow step ---
  qrBox: {
    marginTop: "0.8rem",
    background: "#0a0612",
    borderRadius: "10px",
    border: "1px solid rgba(217,70,239,0.25)",
    padding: "1rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.6rem",
  },
  qrImage: {
    width: "180px",
    height: "180px",
    background: "#fff",
    borderRadius: "8px",
  },
  qrStatusText: {
    fontSize: "0.8rem",
    color: "#c7c0d4",
    textAlign: "center",
  },
  pill: (color) => ({
    padding: "0.3rem 0.7rem",
    borderRadius: "999px",
    fontSize: "0.75rem",
    fontWeight: 700,
    background: `${color}22`,
    border: `1px solid ${color}66`,
    color,
  }),
  releaseBtn: {
    flex: 1,
    padding: "0.6rem",
    borderRadius: "6px",
    border: "none",
    background: "linear-gradient(90deg, #22c55e, #16a34a)",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },
  mutualCancelBtn: (requested) => ({
    flex: 1,
    padding: "0.6rem",
    borderRadius: "6px",
    border: "1px solid rgba(239,68,68,0.5)",
    background: requested ? "rgba(239,68,68,0.35)" : "rgba(239,68,68,0.15)",
    color: "#fca5a5",
    fontWeight: 700,
    cursor: "pointer",
  }),
};

const DealRoom = () => {
  const [activeRooms, setActiveRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);

  const [partnerUserId, setPartnerUserId] = useState("");
  const [agreed_price, setagreed_price] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [partnerUser, setPartnerUser] = useState(null);
  const [myRole, setMyRole] = useState(null);
  const [partnerRole, setPartnerRole] = useState(null);
  const [roleConfirmed, setRoleConfirmed] = useState(false);
  const [amountConfirmed, setAmountConfirmed] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");

  // --- NEW: mutual confirmation tracking ---
  // rolePicks: { [userId]: 'buyer' | 'seller' } - each party's own pick,
  // proposed independently. The deal only proceeds once BOTH ids are present
  // and the picks are complementary (one buyer, one seller).
  const [rolePicks, setRolePicks] = useState({});
  // amountConfirms: [userId, ...] - each party's own confirmation that the
  // amount is correct. The deal only proceeds once BOTH ids are present.
  const [amountConfirms, setAmountConfirms] = useState([]);

  // --- NEW: escrow/payment state ---
  // 'idle' -> 'awaiting' (QR shown, polling) -> 'received' -> 'released' | 'cancelled'
  const [paymentStatus, setPaymentStatus] = useState("idle");
  const [qrInfo, setQrInfo] = useState(null);
  const [cancelRequestedBy, setCancelRequestedBy] = useState([]);

  const scrollRef = useRef(null);
  const cancelFinalizedRef = useRef(false);

  // --- NEW: per-tab identity instead of a hardcoded user ---

  // shared across every tab of the same origin). That's what lets you open
  // two tabs and have them be two genuinely different, real users instead of
  // both being "user 9" talking to itself.
  const currentUserId = localStorage.getItem("user_id");

  // --- NEW: how long to leave the "completed"/"cancelled" message on screen
  // before the ticket auto-deletes and the user is dropped back on the hub ---
  const AUTO_DELETE_DELAY_MS = 2500;

  // Deletes the room (DB + local) and returns the user to the hub. Reused by
  // both the "release" (success) and "mutual cancel" (fail) end states.
  const finalizeAndRemoveRoom = async (roomCode) => {
    setTimeout(async () => {
      await deleteRoom(roomCode);
      setActiveRooms((prev) => prev.filter((r) => r.room_code !== roomCode));
      setSelectedRoom((cur) =>
        cur && cur.room_code === roomCode ? null : cur,
      );
      setMyRole(null);
      setPartnerRole(null);
      setRoleConfirmed(false);
      setAmountConfirmed(false);
      setRolePicks({});
      setAmountConfirms([]);
      setPaymentStatus("idle");
      setQrInfo(null);
      setCancelRequestedBy([]);
      setMessages([]);
    }, AUTO_DELETE_DELAY_MS);
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  // Poll or retrieve active rooms

  // Sync room messages periodically
  useEffect(() => {
    if (!selectedRoom) return;

    const syncMessages = async () => {
      const storedMsgs = await getMessages(selectedRoom.room_code);
      if (storedMsgs && storedMsgs.length > 0) {
        setMessages((prev) => {
          if (storedMsgs.length !== prev.length) {
            return mapMessagesWithPrompts(
              storedMsgs,
              roleConfirmed,
              amountConfirmed,
              currentUserId,
            );
          }
          return prev;
        });
      }
    };

    const interval = setInterval(syncMessages, 2000);
    return () => clearInterval(interval);
  }, [selectedRoom, currentUserId, roleConfirmed, amountConfirmed]);

  // --- NEW: poll the Bakong payment-status endpoint while a QR is being displayed ---
  useEffect(() => {
    if (!selectedRoom || paymentStatus !== "awaiting") return;

    const poll = setInterval(async () => {
      const result = await verifyPayment(selectedRoom.room_code);
      if (result.paid) {
        clearInterval(poll);
        await handleFundsReceived(result);
      }
    }, 3000);

    return () => clearInterval(poll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoom, paymentStatus]);

  // --- NEW: sync payment_status / cancel_requests from the backend so both
  // buyer and seller see the same escrow state (release, mutual cancel, etc.) ---
  useEffect(() => {
    if (!selectedRoom) return;

    const syncRoomState = async () => {
      const roomData = await getRoom(selectedRoom.room_code);
      if (!roomData) return;

      // --- NEW: reconcile roles/picks/confirmations the OTHER tab/user may have just made ---
      const rolesChanged =
        String(roomData.buyer_id || "") !==
          String(selectedRoom.buyer_id || "") ||
        String(roomData.seller_id || "") !==
          String(selectedRoom.seller_id || "");
      const picksChanged =
        JSON.stringify(roomData.role_picks || {}) !==
        JSON.stringify(selectedRoom.role_picks || {});
      const confirmsChanged =
        JSON.stringify(roomData.amount_confirms || []) !==
        JSON.stringify(selectedRoom.amount_confirms || []);

      if (
        rolesChanged ||
        picksChanged ||
        confirmsChanged ||
        roomData.status !== selectedRoom.status
      ) {
        const mergedRoom = { ...selectedRoom, ...roomData };
        setSelectedRoom(mergedRoom);

        if (picksChanged) setRolePicks(roomData.role_picks || {});
        if (confirmsChanged && Array.isArray(roomData.amount_confirms))
          setAmountConfirms(roomData.amount_confirms);

        const isBuyer = String(mergedRoom.buyer_id) === String(currentUserId);
        const isSeller = String(mergedRoom.seller_id) === String(currentUserId);
        if (isBuyer) {
          setMyRole("buyer");
          setPartnerRole("seller");
        } else if (isSeller) {
          setMyRole("seller");
          setPartnerRole("buyer");
        }

        // Roles are only confirmed once BOTH sides are set (complementary picks).
        const bothRolesSet = Boolean(
          mergedRoom.buyer_id && mergedRoom.seller_id,
        );
        if (bothRolesSet && !roleConfirmed) setRoleConfirmed(true);

        const confirmsList = Array.isArray(roomData.amount_confirms)
          ? roomData.amount_confirms
          : amountConfirms;
        const bothAmountConfirmed =
          confirmsList.map(String).includes(String(currentUserId)) &&
          confirmsList.map(String).includes(String(mergedRoom.invited_user_id));

        if (
          (mergedRoom.status === "Ready" ||
            mergedRoom.status === "Funded" ||
            mergedRoom.status === "Completed" ||
            bothAmountConfirmed) &&
          !amountConfirmed
        ) {
          setAmountConfirmed(true);
        }
      }

      if (Array.isArray(roomData.cancel_requests)) {
        setCancelRequestedBy(roomData.cancel_requests);
      }

      if (
        roomData.payment_status === "received" &&
        paymentStatus === "awaiting"
      ) {
        setPaymentStatus("received");
      }
      if (roomData.payment_status === "released") {
        setPaymentStatus("released");
      }
      if (
        roomData.payment_status === "refunded" ||
        roomData.status === "Cancelled"
      ) {
        if (!cancelFinalizedRef.current) {
          cancelFinalizedRef.current = true;
          setPaymentStatus("cancelled");
        }
      }
    };

    const interval = setInterval(syncRoomState, 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoom, paymentStatus, roleConfirmed, amountConfirmed]);

  // --- NEW: whichever party did NOT click Release/Cancel still needs their
  // ticket to auto-delete once the sync effect above tells them the deal is
  // over. deleteRoom is safe to call more than once (idempotent filter).
  const autoDeleteTriggeredRef = useRef(false);
  useEffect(() => {
    if (!selectedRoom) {
      autoDeleteTriggeredRef.current = false;
      return;
    }
    if (
      (paymentStatus === "released" || paymentStatus === "cancelled") &&
      !autoDeleteTriggeredRef.current
    ) {
      autoDeleteTriggeredRef.current = true;
      finalizeAndRemoveRoom(selectedRoom.room_code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentStatus, selectedRoom]);

  // --- NEW: whenever roleConfirmed/amountConfirmed flip (including via the
  // cross-tab sync above, not just this tab's own clicks), re-map the
  // already-loaded messages so stale prompt buttons don't linger.
  useEffect(() => {
    if (!selectedRoom) return;
    setMessages((prev) =>
      mapMessagesWithPrompts(
        prev,
        roleConfirmed,
        amountConfirmed,
        currentUserId,
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleConfirmed, amountConfirmed]);

  const handleCreateDeal = async () => {
    console.log("Button clicked");
    if (
      !partnerUserId.trim() ||
      !agreed_price.trim() ||
      !itemDescription.trim()
    )
      {
    console.log("Validation failed");
    return;
    }
    console.log("Passed validation");
    setIsLoading(true);
    setErrorMessage("");

    try {
      console.log("Checking user...");
      setPartnerUser(null);

      const result = await checkUser(partnerUserId.trim());
      console.log("After checkUser");
      console.log(result);
      console.log(result.user);
      console.log("Before exists check");

      if (!result.success) {
        setPartnerUser(null);
        setErrorMessage(result.message);
        setIsLoading(false);
        return;
      }
      console.log("Passed exists check");

      if (partnerUserId.trim() === String(currentUserId)) {
        setPartnerUser(null);
        setErrorMessage("You cannot create a deal with yourself.");
        setIsLoading(false);
        return;
      }

      if (result.user.verify_status !== "Verified") {
        setPartnerUser(null);
        setErrorMessage("This user is not verified.");
        setIsLoading(false);
        return;
      }

      setPartnerUser(result.user);

      // const roomCode = generateRoomCode();
      const dealData = {
            created_by: currentUserId,
            invited_user_id: Number(partnerUserId.trim()),
            item_name: itemDescription.trim(), // Temporary until you add a separate Item Name field
            item_description: itemDescription.trim(),
            agreed_price: Number(agreed_price),
          };

          console.log("Sending dealData:");
          console.log(dealData);

          const response = await createRoom(dealData);

          console.log("Create room response:", response);

          if (response.success) {
            setActiveRooms((prev) => [
              {
                ...dealData,
                room_id: response.room_id,
                room_code: response.room_code,
                created_at: formatTime(),
                status: "Waiting",
              },
              ...prev,
            ]);

            setPartnerUserId("");
            setagreed_price("");
            setItemDescription("");
            setPartnerUser(null);
          } else {
            setErrorMessage(response.message || "Failed to create room.");
}

    } catch (err) {
    console.error("Create Room Error:", err);
    setErrorMessage(err.message || "Error creating room.");
    } finally {
      setIsLoading(false);
    }
  };

  const openRoom = async (room) => {
    setSelectedRoom(room);

    // reset escrow-related state for the newly opened room
    setPaymentStatus(
      room.payment_status === "received"
        ? "received"
        : room.payment_status === "released"
          ? "released"
          : "idle",
    );
    setQrInfo(null);
    setCancelRequestedBy(
      Array.isArray(room.cancel_requests) ? room.cancel_requests : [],
    );
    cancelFinalizedRef.current = false;

    const isBuyer = String(room.buyer_id) === String(currentUserId);
    const isSeller = String(room.seller_id) === String(currentUserId);

    let currentMyRole = null;
    let currentPartnerRole = null;

    if (isBuyer) {
      currentMyRole = "buyer";
      currentPartnerRole = "seller";
    } else if (isSeller) {
      currentMyRole = "seller";
      currentPartnerRole = "buyer";
    }

    setMyRole(currentMyRole);
    setPartnerRole(currentPartnerRole);

    const seededPicks = room.role_picks || {};
    const seededConfirms = Array.isArray(room.amount_confirms)
      ? room.amount_confirms
      : [];
    setRolePicks(seededPicks);
    setAmountConfirms(seededConfirms);

    const isReady =
      room.status === "Ready" ||
      room.status === "Completed" ||
      room.status === "Funded";
    // Roles are only truly confirmed once BOTH buyer_id and seller_id are set
    // (they're only both set once both parties picked complementary roles).
    const hasBothRoles = Boolean(room.buyer_id && room.seller_id);
    const hasBothAmountConfirms =
      seededConfirms.map(String).includes(String(currentUserId)) &&
      seededConfirms.map(String).includes(String(room.invited_user_id));

    const isRoleConf = isReady || hasBothRoles;
    const isAmtConf = isReady || hasBothAmountConfirms;

    setRoleConfirmed(isRoleConf);
    setAmountConfirmed(isAmtConf);

    let storedMsgs = await getMessages(room.room_code);

    if (!storedMsgs || storedMsgs.length === 0) {
      const welcomeText = room.isIncoming
        ? `User #${room.invited_user_id} invited you to Room #${room.room_code} to trade "${room.item_description}" for $${room.agreed_price}. Pick your role or decline:`
        : `Welcome to Room #${room.room_code}. Trading "${room.item_description}" for $${room.agreed_price} with User #${room.invited_user_id}. Pick your role or cancel:`;

      const savedMsg = await sendMessage(
        room.room_code,
        "SYSTEM",
        welcomeText,
        "bot",
      );
      storedMsgs = [savedMsg];
    }

    const processedMsgs = mapMessagesWithPrompts(
      storedMsgs,
      isRoleConf,
      isAmtConf,
      currentUserId,
    );
    setMessages(processedMsgs);
  };

  // Local, not-yet-submitted pick - just changes which button is highlighted.
  const handleSelectRole = (role) => {
    if (roleConfirmed) return;
    if (rolePicks[currentUserId]) return; // already submitted, must withdraw first
    setMyRole(role);
  };

  // --- NEW: mutual role confirmation. Submitting only ever records MY pick.
  // The deal only advances to the amount step once BOTH parties have picked
  // and their picks are complementary (one buyer, one seller). If both picked
  // the same role, both picks are cleared so they can re-select.
  const handleConfirmRole = async () => {
    if (!myRole) return;

    const latestRoom = (await getRoom(selectedRoom.room_code)) || selectedRoom;
    const existingPicks = latestRoom.role_picks || {};
    const updatedPicks = { ...existingPicks, [currentUserId]: myRole };

    const partnerId = selectedRoom.invited_user_id;
    const myPick = updatedPicks[currentUserId];
    const partnerPick = updatedPicks[partnerId];
    const bothPicked = Boolean(myPick && partnerPick);
    const mismatch = bothPicked && myPick === partnerPick;

    if (bothPicked && !mismatch) {
      // Complementary picks - finalize roles and move to the amount step.
      const buyerId = myPick === "buyer" ? currentUserId : partnerId;
      const sellerId = myPick === "seller" ? currentUserId : partnerId;
      const roleUpdates = {
        role_picks: updatedPicks,
        buyer_id: buyerId,
        seller_id: sellerId,
      };

      const updatedRoom = { ...selectedRoom, ...roleUpdates };
      setSelectedRoom(updatedRoom);
      setActiveRooms((prev) =>
        prev.map((r) =>
          r.room_code === selectedRoom.room_code ? updatedRoom : r,
        ),
      );
      await updateRoom(selectedRoom.room_code, roleUpdates);

      setRolePicks(updatedPicks);
      setRoleConfirmed(true);
      setMyRole(myPick);
      setPartnerRole(partnerPick);

      const botText = `Both parties confirmed their roles (Buyer: #${buyerId}, Seller: #${sellerId}). Please verify: Is the proposed amount of $${selectedRoom.agreed_price} for "${selectedRoom.item_description}" correct?`;
      const savedBotMsg = await sendMessage(
        selectedRoom.room_code,
        "SYSTEM",
        botText,
        "bot",
        {
          amountConfirmation: true,
        },
      );
      setMessages((prev) =>
        mapMessagesWithPrompts(
          [...prev, savedBotMsg],
          true,
          false,
          currentUserId,
        ),
      );
    } else if (mismatch) {
      // Both picked the same role - clear both so they can try again.
      const clearedPicks = {};
      await updateRoom(selectedRoom.room_code, { role_picks: clearedPicks });
      const updatedRoom = { ...selectedRoom, role_picks: clearedPicks };
      setSelectedRoom(updatedRoom);
      setActiveRooms((prev) =>
        prev.map((r) =>
          r.room_code === selectedRoom.room_code ? updatedRoom : r,
        ),
      );

      setRolePicks(clearedPicks);
      setMyRole(null);
      setPartnerRole(null);

      const botText = `⚠️ Both users selected the same role. Please re-select — one of you must be the Buyer and the other the Seller.`;
      const savedBotMsg = await sendMessage(
        selectedRoom.room_code,
        "SYSTEM",
        botText,
        "bot",
        {
          roleSelection: true,
        },
      );
      setMessages((prev) =>
        mapMessagesWithPrompts(
          [...prev, savedBotMsg],
          false,
          false,
          currentUserId,
        ),
      );
    } else {
      // Only my pick is in so far - save it and wait for the other party.
      await updateRoom(selectedRoom.room_code, { role_picks: updatedPicks });
      const updatedRoom = { ...selectedRoom, role_picks: updatedPicks };
      setSelectedRoom(updatedRoom);
      setActiveRooms((prev) =>
        prev.map((r) =>
          r.room_code === selectedRoom.room_code ? updatedRoom : r,
        ),
      );
      setRolePicks(updatedPicks);

      const botText = `User #${currentUserId} selected ${myRole.toUpperCase()}. Waiting for the other party to select their role...`;
      const savedBotMsg = await sendMessage(
        selectedRoom.room_code,
        "SYSTEM",
        botText,
        "bot",
      );
      setMessages((prev) => [...prev, { ...savedBotMsg, kind: "system" }]);
    }
  };

  // Lets a user withdraw their own pending pick while waiting on the other party.
  const handleWithdrawRolePick = async () => {
    const updatedPicks = { ...rolePicks };
    delete updatedPicks[currentUserId];
    setRolePicks(updatedPicks);
    setMyRole(null);
    await updateRoom(selectedRoom.room_code, { role_picks: updatedPicks });
  };

  // --- NEW: mutual amount confirmation. Confirming only ever records MY
  // confirmation. The deal only advances to READY (and the QR is generated)
  // once BOTH parties have confirmed the amount.
  const handleConfirmAmount = async () => {
    const latestRoom = (await getRoom(selectedRoom.room_code)) || selectedRoom;
    const existingConfirms = Array.isArray(latestRoom.amount_confirms)
      ? latestRoom.amount_confirms
      : [];
    const updatedConfirms = existingConfirms
      .map(String)
      .includes(String(currentUserId))
      ? existingConfirms
      : [...existingConfirms, currentUserId];

    const partnerId = selectedRoom.invited_user_id;
    const bothConfirmed =
      updatedConfirms.map(String).includes(String(currentUserId)) &&
      updatedConfirms.map(String).includes(String(partnerId));

    setAmountConfirms(updatedConfirms);

    if (bothConfirmed) {
      const statusUpdate = {
        amount_confirms: updatedConfirms,
        status: "Ready",
      };
      const updatedRoom = { ...selectedRoom, ...statusUpdate };
      setSelectedRoom(updatedRoom);
      setActiveRooms((prev) =>
        prev.map((r) =>
          r.room_code === selectedRoom.room_code ? updatedRoom : r,
        ),
      );
      await updateRoom(selectedRoom.room_code, statusUpdate);

      setAmountConfirmed(true);

      const botText = `Both parties confirmed the amount ($${selectedRoom.agreed_price})! Room status is now READY.`;
      const savedBotMsg = await sendMessage(
        selectedRoom.room_code,
        "SYSTEM",
        botText,
        "bot",
      );
      setMessages((prev) =>
        mapMessagesWithPrompts(
          [...prev, savedBotMsg],
          true,
          true,
          currentUserId,
        ),
      );

      // NEW: once BOTH have verified the amount, kick off the Bakong QR/escrow step
      await generatePaymentQR(updatedRoom);
    } else {
      const updatedRoom = { ...selectedRoom, amount_confirms: updatedConfirms };
      setSelectedRoom(updatedRoom);
      setActiveRooms((prev) =>
        prev.map((r) =>
          r.room_code === selectedRoom.room_code ? updatedRoom : r,
        ),
      );
      await updateRoom(selectedRoom.room_code, {
        amount_confirms: updatedConfirms,
      });

      const botText = `User #${currentUserId} confirmed the amount ($${selectedRoom.agreed_price}). Waiting for the other party to confirm...`;
      const savedBotMsg = await sendMessage(
        selectedRoom.room_code,
        "SYSTEM",
        botText,
        "bot",
      );
      setMessages((prev) => [...prev, { ...savedBotMsg, kind: "system" }]);
    }
  };

  // --- NEW: generate the Bakong KHQR for this room and start waiting for payment ---
  const generatePaymentQR = async (room) => {
    setPaymentStatus("awaiting");

    const qr = await generateQR(room.room_code, room.agreed_price);
    setQrInfo(qr);

    await updateRoom(room.room_code, { payment_status: "awaiting" });

    const qrText = `Buyer, please scan the Bakong KHQR below to pay $${room.agreed_price}. This message will update automatically once payment is confirmed.`;
    const savedMsg = await sendMessage({
      room_code: room.room_code,
      sender_id: "SYSTEM",
      text: qrText,
      kind: "system",
      qrPayment: true,
    });
    setMessages((prev) => [
      ...prev,
      { ...savedMsg, kind: "system", qrPayment: true },
    ]);
  };

  // --- NEW: called once the Bakong webhook (via your backend's payment-status
  // endpoint) confirms the funds arrived ---
  const handleFundsReceived = async (result) => {
    setPaymentStatus("received");

    await updateRoom(selectedRoom.room_code, {
      status: "Funded",
      payment_status: "received",
    });

    const text = `✅ Payment of $${result.amount || selectedRoom.agreed_price} received via Bakong! Seller, please send "${selectedRoom.item_description}" to the buyer now. Buyer: once you've received it, tap Release to send the funds to the seller.`;
    const savedMsg = await sendMessage(
      selectedRoom.room_code,
      "SYSTEM",
      text,
      "bot",
      { fundsReceived: true },
    );

    setMessages((prev) => [
      ...prev,
      { ...savedMsg, kind: "system", fundsReceived: true },
    ]);
  };

  // Dev-only helper since there's no live Bakong webhook in this environment -
  // simulates the webhook firing so the release/cancel flow can be tested end to end.
  const handleSimulatePaymentReceived = async () => {
    await handleFundsReceived({
      paid: true,
      amount: selectedRoom.agreed_price,
    });
  };

  // --- NEW: buyer-only release of escrowed funds to the seller ---
  const handleReleaseFunds = async () => {
    if (myRole !== "buyer" || paymentStatus !== "received") return;

    setPaymentStatus("released");
    await releaseFunds(selectedRoom.room_code);
    await updateRoom(selectedRoom.room_code, {
      status: "Completed",
      payment_status: "released",
    });

    const text = `🎉 Buyer released the funds. Deal completed — $${selectedRoom.agreed_price} sent to the seller. This ticket will close automatically.`;
    const savedMsg = await sendMessage(
      selectedRoom.room_code,
      "SYSTEM",
      text,
      "bot",
    );

    setMessages((prev) => [...prev, { ...savedMsg, kind: "system" }]);

    // NEW: whether the deal succeeded (released) or failed (cancelled), the
    // ticket gets torn down automatically - no need to keep it around.
    await finalizeAndRemoveRoom(selectedRoom.room_code);
  };

  // --- NEW: mutual cancel - both buyer and seller must agree before funds refund ---
  const handleRequestCancel = async () => {
    if (cancelRequestedBy.map(String).includes(String(currentUserId))) return;
    if (paymentStatus === "released" || paymentStatus === "cancelled") return;

    const result = await requestCancelInDB(
      selectedRoom.room_code,
      currentUserId,
    );
    const updatedRequests = result?.cancel_requests || [
      ...cancelRequestedBy,
      currentUserId,
    ];
    setCancelRequestedBy(updatedRequests);

    const bothAgreed =
      result?.finalized ||
      (updatedRequests.map(String).includes(String(currentUserId)) &&
        updatedRequests
          .map(String)
          .includes(String(selectedRoom.invited_user_id)));

    if (bothAgreed && !cancelFinalizedRef.current) {
      cancelFinalizedRef.current = true;
      await finalizeCancellation();
    } else {
      const text = `${myRole === "buyer" ? "Buyer" : "Seller"} requested to cancel this trade. Waiting for the other party to agree — funds will be refunded to the buyer once both sides confirm.`;
      const savedMsg = await sendMessage(
        selectedRoom.room_code,
        "SYSTEM",
        text,
        "bot",
      );
      setMessages((prev) => [...prev, { ...savedMsg, kind: "system" }]);
    }
  };

  const finalizeCancellation = async () => {
    setPaymentStatus("cancelled");
    await updateRoom(selectedRoom.room_code, {
      status: "Cancelled",
      payment_status: "refunded",
    });

    const text = `❌ Both parties agreed to cancel. $${selectedRoom.agreed_price} has been refunded to the buyer. This ticket will close automatically.`;
    const savedMsg = await sendMessage(
      selectedRoom.room_code,
      "SYSTEM",
      text,
      "bot",
    );

    setMessages((prev) => [...prev, { ...savedMsg, kind: "system" }]);

    // NEW: same teardown as a successful release - the deal is over either way.
    await finalizeAndRemoveRoom(selectedRoom.room_code);
  };

  // Clears a locally-picked-but-not-yet-submitted role choice (before Confirm is clicked).
  const handleResetRoleSelection = () => {
    setMyRole(null);
  };

  const handleCancelAndDestroyDeal = async () => {
    if (!selectedRoom) return;

    await deleteRoom(selectedRoom.room_code);
    setActiveRooms((prev) =>
      prev.filter((r) => r.room_code !== selectedRoom.room_code),
    );
    setSelectedRoom(null);
    setMyRole(null);
    setPartnerRole(null);
    setRoleConfirmed(false);
    setAmountConfirmed(false);
    setRolePicks({});
    setAmountConfirms([]);
    setPaymentStatus("idle");
    setQrInfo(null);
    setCancelRequestedBy([]);
  };

  const sendChat = async () => {
    if (!chatInput.trim()) return;

    const text = chatInput.trim();
    setChatInput("");

    const savedMsg = await sendMessage(
      selectedRoom.room_code,
      currentUserId,
      text,
      "mine",
    );

    setMessages((prev) =>
      mapMessagesWithPrompts(
        [...prev, savedMsg],
        roleConfirmed,
        amountConfirmed,
        currentUserId,
      ),
    );
  };

  return (
    <div style={styles.page}>
      {!selectedRoom ? (
        <div style={styles.modalContainer}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.5rem",
            }}
          >
            <h1 style={styles.title}>Deal Hub</h1>
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}
            >
              <span style={styles.pill("#d946ef")}>User #{currentUserId}</span>
            </div>
          </div>
          <p style={{ color: "#a89db8", marginBottom: "1.5rem" }}>
            Create a trade with a registered user_id or enter an active room.
          </p>

          <div style={styles.splitLayout}>
            <div style={styles.sectionBox}>
              <div style={styles.sectionHeader}>Create a Deal</div>

              {errorMessage && (
                <div style={styles.errorBox}>{errorMessage}</div>
              )}

              <label style={styles.label}>Partner User ID (`user_id`)</label>
              <input
                style={styles.input}
                placeholder="e.g. 14"
                value={partnerUserId}
                onChange={(e) => {
                  setPartnerUserId(e.target.value);
                  setErrorMessage("");
                  setPartnerUser(null);
                }}
              />
              {partnerUser && (
                <div
                  style={{
                    background: "#1b1b1b",
                    padding: "10px",
                    borderRadius: "8px",
                    marginBottom: "15px",
                    border: "1px solid #4caf50",
                  }}
                >
                  <strong>
                    {partnerUser.firstname} {partnerUser.lastname}
                  </strong>
                  <br />
                  Status: {partnerUser.verify_status}
                </div>
              )}

              <label style={styles.label}>
                Proposed Amount (`agreed_price` $)
              </label>
              <input
                style={styles.input}
                placeholder="e.g. 150"
                type="number"
                value={agreed_price}
                onChange={(e) => setagreed_price(e.target.value)}
              />

              <label style={styles.label}>Item / Service Description</label>
              <input
                style={styles.input}
                placeholder="e.g. 100 USDT or Game Account"
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
              />

              <button
                style={styles.primaryBtn(
                  !partnerUserId.trim() ||
                    !agreed_price.trim() ||
                    !itemDescription.trim() ||
                    isLoading,
                )}
                disabled={
                  !partnerUserId.trim() ||
                  !agreed_price.trim() ||
                  !itemDescription.trim() ||
                  isLoading
                }
                onClick={handleCreateDeal}
              >
                {isLoading ? "Verifying User..." : "Create Deal Room"}
              </button>
            </div>

            <div style={styles.sectionBox}>
              <div style={styles.sectionHeader}>Active & Invited Rooms</div>

              {activeRooms.length === 0 ? (
                <div
                  style={{
                    color: "#6f6785",
                    textAlign: "center",
                    marginTop: "1.5rem",
                  }}
                >
                  No active rooms. Create your first deal.
                </div>
              ) : (
                activeRooms.map((room) => (
                  <div
                    key={room.room_id ?? room.room_code}
                    style={styles.roomCardVertical}
                    onClick={() => openRoom(room)}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "0.4rem",
                      }}
                    >
                      <span style={styles.codeBadge}>#{room.room_code}</span>
                      {room.isIncoming && (
                        <span style={styles.inviteBadge}>INCOMING INVITE</span>
                      )}
                      <span style={{ fontSize: "0.75rem", color: "#8b8299" }}>
                        {room.created_at}
                      </span>
                    </div>
                    <div style={{ fontWeight: 700, color: "#fff" }}>
                      User ID: {room.invited_user_id}
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "#c7c0d4" }}>
                      Trading: {room.item_description} (${room.agreed_price})
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ ...styles.modalContainer, maxWidth: "720px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <div>
              <h1 style={styles.title}>Room #{selectedRoom.room_code}</h1>
              <span style={{ color: "#a89db8" }}>
                Trading with User #{selectedRoom.invited_user_id}
              </span>
            </div>
            <button
              style={{
                ...styles.cancelBtn,
                flex: "none",
                padding: "0.5rem 1rem",
              }}
              onClick={() => setSelectedRoom(null)}
            >
              Back to Hub
            </button>
          </div>

          <div style={styles.chatWindow}>
            <div style={styles.chatScroll} ref={scrollRef}>
              {messages.map((m) => (
                <div
                  key={m.id}
                  style={{
                    alignSelf: m.kind === "mine" ? "flex-end" : "flex-start",
                  }}
                >
                  <div style={styles.bubble(m.kind)}>
                    {m.text}

                    {m.roleSelection && !roleConfirmed && (
                      <div style={{ marginTop: "0.8rem" }}>
                        {rolePicks[currentUserId] ? (
                          <>
                            <span style={styles.pill("#facc15")}>
                              ⏳ You picked{" "}
                              {rolePicks[currentUserId].toUpperCase()} — waiting
                              for the other party...
                            </span>
                            <div style={styles.actionBtnGroup}>
                              <button
                                style={styles.cancelBtn}
                                onClick={handleWithdrawRolePick}
                              >
                                Change My Selection
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div
                              style={{
                                fontSize: "0.8rem",
                                color: "#c7c0d4",
                                marginBottom: "0.4rem",
                              }}
                            >
                              Select your role:
                            </div>
                            <div style={styles.roleBtnRow}>
                              <button
                                style={styles.roleChoiceBtn(
                                  rolePicks[selectedRoom.invited_user_id] ===
                                    "buyer",
                                  myRole === "buyer",
                                )}
                                disabled={
                                  rolePicks[selectedRoom.invited_user_id] ===
                                  "buyer"
                                }
                                onClick={() => handleSelectRole("buyer")}
                              >
                                Buyer
                              </button>
                              <button
                                style={styles.roleChoiceBtn(
                                  rolePicks[selectedRoom.invited_user_id] ===
                                    "seller",
                                  myRole === "seller",
                                )}
                                disabled={
                                  rolePicks[selectedRoom.invited_user_id] ===
                                  "seller"
                                }
                                onClick={() => handleSelectRole("seller")}
                              >
                                Seller
                              </button>
                            </div>

                            {myRole && (
                              <div style={styles.actionBtnGroup}>
                                <button
                                  style={styles.confirmBtn}
                                  onClick={handleConfirmRole}
                                >
                                  Confirm Role
                                </button>
                                <button
                                  style={styles.cancelBtn}
                                  onClick={handleResetRoleSelection}
                                >
                                  Reset Selection
                                </button>
                              </div>
                            )}
                          </>
                        )}

                        <button
                          style={styles.deleteDealBtn}
                          onClick={handleCancelAndDestroyDeal}
                        >
                          ✖️{" "}
                          {selectedRoom.isIncoming
                            ? "Decline & Exit Deal"
                            : "Cancel & Delete Deal Ticket"}
                        </button>
                      </div>
                    )}

                    {m.amountConfirmation && !amountConfirmed && (
                      <div style={{ marginTop: "0.8rem" }}>
                        {amountConfirms
                          .map(String)
                          .includes(String(currentUserId)) ? (
                          <span style={styles.pill("#facc15")}>
                            ⏳ You confirmed ${selectedRoom.agreed_price} —
                            waiting for the other party...
                          </span>
                        ) : (
                          <div style={styles.actionBtnGroup}>
                            <button
                              style={styles.confirmBtn}
                              onClick={handleConfirmAmount}
                            >
                              ✅ Confirm (${selectedRoom.agreed_price})
                            </button>
                            <button
                              style={styles.cancelBtn}
                              onClick={handleCancelAndDestroyDeal}
                            >
                              ✖️ Cancel / Wrong Amount
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* NEW: Bakong KHQR payment step */}
                    {m.qrPayment && paymentStatus === "awaiting" && (
                      <div style={styles.qrBox}>
                        {qrInfo?.qr_image ? (
                          <img
                            src={qrInfo.qr_image}
                            alt="Bakong KHQR"
                            style={styles.qrImage}
                          />
                        ) : (
                          <div
                            style={{
                              ...styles.qrImage,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#333",
                              fontSize: "0.7rem",
                              textAlign: "center",
                              padding: "0.5rem",
                            }}
                          >
                            QR unavailable offline
                          </div>
                        )}
                        <span style={styles.pill("#facc15")}>
                          ⏳ Waiting for payment...
                        </span>
                        <div style={styles.qrStatusText}>
                          Amount due: ${selectedRoom.agreed_price} · Bill #
                          {qrInfo?.bill_number || selectedRoom.room_code}
                        </div>
                        <button
                          style={styles.simulateBtn}
                          onClick={handleSimulatePaymentReceived}
                        >
                          ⚡️ Simulate Bakong Payment Received (dev only)
                        </button>
                      </div>
                    )}

                    {/* NEW: post-payment escrow controls - release / mutual cancel */}
                    {m.fundsReceived &&
                      (paymentStatus === "received" ||
                        paymentStatus === "released" ||
                        paymentStatus === "cancelled") && (
                        <div style={{ marginTop: "0.8rem" }}>
                          {paymentStatus === "received" && (
                            <>
                              <span style={styles.pill("#4ade80")}>
                                💰 Funds in escrow
                              </span>
                              <div style={styles.actionBtnGroup}>
                                <button
                                  style={{
                                    ...styles.releaseBtn,
                                    opacity: myRole === "buyer" ? 1 : 0.4,
                                    cursor:
                                      myRole === "buyer"
                                        ? "pointer"
                                        : "not-allowed",
                                  }}
                                  disabled={myRole !== "buyer"}
                                  onClick={handleReleaseFunds}
                                >
                                  ✅ Release Funds{" "}
                                  {myRole !== "buyer" && "(buyer only)"}
                                </button>
                                <button
                                  style={styles.mutualCancelBtn(
                                    cancelRequestedBy
                                      .map(String)
                                      .includes(String(currentUserId)),
                                  )}
                                  onClick={handleRequestCancel}
                                >
                                  {cancelRequestedBy
                                    .map(String)
                                    .includes(String(currentUserId))
                                    ? "⏳ Waiting on other party..."
                                    : "✖️ Request Cancel (both must agree)"}
                                </button>
                              </div>
                            </>
                          )}
                          {paymentStatus === "released" && (
                            <span style={styles.pill("#4ade80")}>
                              🎉 Deal completed
                            </span>
                          )}
                          {paymentStatus === "cancelled" && (
                            <span style={styles.pill("#f87171")}>
                              ❌ Cancelled & refunded
                            </span>
                          )}
                        </div>
                      )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              style={{ ...styles.input, marginBottom: 0 }}
              placeholder={
                amountConfirmed
                  ? "Type a message..."
                  : "Please confirm role and amount first..."
              }
              disabled={!amountConfirmed}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendChat()}
            />
            <button
              style={{
                ...styles.primaryBtn(!amountConfirmed || !chatInput.trim()),
                marginTop: 0,
                width: "100px",
              }}
              disabled={!amountConfirmed || !chatInput.trim()}
              onClick={sendChat}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DealRoom;
