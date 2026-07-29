import { useState, useEffect, useRef } from 'react'

const generateRoomCode = () => Math.random().toString(36).substring(2, 8).toUpperCase()
const formatTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

const API_BASE = 'http://127.0.0.1:8000/api'

const getHeaders = () => ({
  'Content-Type': 'application/json',
})

// --- Local Storage Persistence Layer ---
const getLocalRooms = () => {
  try {
    return JSON.parse(localStorage.getItem('deal_rooms') || '[]')
  } catch (e) {
    return []
  }
}

const saveLocalRooms = (rooms) => {
  localStorage.setItem('deal_rooms', JSON.stringify(rooms))
}

const getLocalMessages = (roomCode) => {
  try {
    return JSON.parse(localStorage.getItem(`deal_msgs_${roomCode}`) || '[]')
  } catch (e) {
    return []
  }
}

const saveLocalMessages = (roomCode, msgs) => {
  localStorage.setItem(`deal_msgs_${roomCode}`, JSON.stringify(msgs))
}

// --- API Helpers with Instant Local Fallbacks ---
const verifyUserExists = async (userId) => {
  if (['123', '14', '8', '9', '17', '13'].includes(String(userId).trim())) return true
  try {
    const res = await fetch(`${API_BASE}/users/verify/?user_id=${encodeURIComponent(userId)}`, {
      method: 'GET',
      headers: getHeaders(),
    })
    if (!res.ok) return true
    const data = await res.json()
    return data.exists
  } catch (error) {
    // If backend fails or CORS blocks, default to true for offline testing
    return true
  }
}

const createDealInDB = async (dealData) => {
  const localRooms = getLocalRooms()
  const updatedRooms = [dealData, ...localRooms.filter((r) => r.room_code !== dealData.room_code)]
  saveLocalRooms(updatedRooms)

  try {
    await fetch(`${API_BASE}/rooms/`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        room_code: dealData.room_code,
        created_by: dealData.created_by,
        status: dealData.status,
        partner_user_id: dealData.partner_user_id,
        proposedamount: dealData.proposedamount,
        item_description: dealData.item_description,
      }),
    })
  } catch (err) {
    console.warn('Backend server unreachable/CORS error. Saved deal locally.')
  }
  return { success: true }
}

const updateRoomInDB = async (roomCode, updates) => {
  const localRooms = getLocalRooms()
  const updatedRooms = localRooms.map((r) => (r.room_code === roomCode ? { ...r, ...updates } : r))
  saveLocalRooms(updatedRooms)

  try {
    await fetch(`${API_BASE}/rooms/${roomCode}/`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(updates),
    })
  } catch (err) {
    console.warn('Backend unreachable. Updated room state locally.')
  }
}

const fetchRoomMessages = async (roomCode) => {
  const localMsgs = getLocalMessages(roomCode)
  try {
    const res = await fetch(`${API_BASE}/rooms/${roomCode}/messages/`, { headers: getHeaders() })
    if (res.ok) {
      const dbMsgs = await res.json()
      if (dbMsgs && dbMsgs.length > 0) {
        saveLocalMessages(roomCode, dbMsgs)
        return dbMsgs
      }
    }
  } catch (err) {
    // Backend unreachable / CORS block -> return local storage messages
  }
  return localMsgs
}

const saveMessageToDB = async (roomCode, senderId, text, kind = 'mine', extra = {}) => {
  const newMsg = {
    id: Date.now() + Math.random(),
    room_code: roomCode,
    sender_id: senderId,
    text,
    kind,
    ...extra,
  }

  const localMsgs = getLocalMessages(roomCode)
  const updatedMsgs = [...localMsgs, newMsg]
  saveLocalMessages(roomCode, updatedMsgs)

  try {
    await fetch(`${API_BASE}/messages/`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        room_code: roomCode,
        sender_id: senderId,
        text: text,
        kind: kind,
      }),
    })
  } catch (err) {
    console.warn('Backend unreachable. Message preserved in LocalStorage.')
  }
  return newMsg
}

const deleteDealInDB = async (roomCode) => {
  const localRooms = getLocalRooms().filter((r) => r.room_code !== roomCode)
  saveLocalRooms(localRooms)
  localStorage.removeItem(`deal_msgs_${roomCode}`)

  try {
    await fetch(`${API_BASE}/rooms/${roomCode}/`, {
      method: 'DELETE',
      headers: getHeaders(),
    })
  } catch (err) {
    // ignore backend delete error
  }
  return true
}

// Maps interactive UI prompts onto raw backend/local messages
const mapMessagesWithPrompts = (msgList, isRoleConf, isAmtConf, currentUserId) => {
  return msgList.map((m, idx) => {
    let kind = m.kind || 'bot'
    if (String(m.sender_id) === String(currentUserId)) kind = 'mine'

    const isFirstBot = idx === 0 && (kind === 'bot' || m.sender_id === 'SYSTEM')
    const isRolePromptMsg = isFirstBot && !isRoleConf

    const isAmountPromptMsg =
      isRoleConf &&
      !isAmtConf &&
      (kind === 'bot' || m.sender_id === 'SYSTEM') &&
      (m.amountConfirmation || m.text.includes('Role set as'))

    return {
      ...m,
      id: m.id || `msg_${idx}`,
      kind,
      roleSelection: isRolePromptMsg,
      amountConfirmation: isAmountPromptMsg,
    }
  })
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'radial-gradient(circle at 20% 20%, #1a0f2e 0%, #0a0612 60%)',
    color: '#f5f3fa',
    fontFamily: "'Oswald', sans-serif",
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '2rem 1rem',
  },
  modalContainer: {
    background: '#1c1a2e',
    border: '1px solid rgba(216, 128, 255, 0.15)',
    borderRadius: '16px',
    padding: '2rem',
    width: '100%',
    maxWidth: '1000px',
    boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
  },
  splitLayout: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '2rem',
    marginTop: '1rem',
  },
  sectionBox: {
    background: '#141224',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    padding: '1.5rem',
  },
  title: {
    fontSize: '1.8rem',
    fontWeight: 700,
    marginBottom: '0.2rem',
    background: 'linear-gradient(90deg, #d946ef, #ec4899)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  sectionHeader: {
    fontSize: '1.2rem',
    fontWeight: 700,
    marginBottom: '1rem',
    color: '#f3d9ff',
  },
  label: {
    fontSize: '0.85rem',
    color: '#c7c0d4',
    marginBottom: '0.3rem',
    display: 'block',
    fontWeight: 600,
  },
  input: {
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.1)',
    background: '#0a0612',
    color: '#fff',
    fontSize: '0.95rem',
    marginBottom: '1rem',
    boxSizing: 'border-box',
  },
  primaryBtn: (disabled) => ({
    width: '100%',
    padding: '0.8rem',
    borderRadius: '8px',
    border: 'none',
    background: disabled ? 'rgba(255,255,255,0.08)' : 'linear-gradient(90deg, #d946ef, #ec4899)',
    color: disabled ? '#666' : '#fff',
    fontWeight: 700,
    fontSize: '0.95rem',
    cursor: disabled ? 'not-allowed' : 'pointer',
    marginTop: '0.5rem',
  }),
  simulateBtn: {
    width: '100%',
    padding: '0.65rem',
    borderRadius: '8px',
    border: '1px dashed #d946ef',
    background: 'rgba(217, 70, 239, 0.1)',
    color: '#f3d9ff',
    fontWeight: 700,
    fontSize: '0.85rem',
    cursor: 'pointer',
    marginBottom: '1rem',
  },
  roomCardVertical: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(217,70,239,0.2)',
    borderRadius: '10px',
    padding: '1rem',
    marginBottom: '0.75rem',
    cursor: 'pointer',
  },
  codeBadge: {
    fontWeight: 800,
    padding: '0.2rem 0.6rem',
    borderRadius: '999px',
    background: 'rgba(217,70,239,0.1)',
    border: '1px solid rgba(217,70,239,0.35)',
    color: '#f3d9ff',
    fontSize: '0.8rem',
  },
  inviteBadge: {
    fontWeight: 700,
    padding: '0.15rem 0.5rem',
    borderRadius: '4px',
    background: 'rgba(74, 222, 128, 0.15)',
    border: '1px solid rgba(74, 222, 128, 0.4)',
    color: '#4ade80',
    fontSize: '0.7rem',
  },
  chatWindow: {
    background: '#141224',
    borderRadius: '14px',
    border: '1px solid rgba(255,255,255,0.06)',
    padding: '1rem',
    marginBottom: '1rem',
  },
  chatScroll: {
    maxHeight: '320px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  bubble: (kind) => ({
    background: kind === 'mine' ? 'linear-gradient(135deg, #d946ef, #ec4899)' : kind === 'bot' ? 'rgba(99,102,241,0.18)' : '#26233a',
    border: kind === 'bot' ? '1px solid rgba(99,102,241,0.35)' : 'none',
    color: '#fff',
    padding: '0.6rem 0.9rem',
    fontSize: '0.9rem',
    borderRadius: '12px',
    maxWidth: '85%',
    wordBreak: 'break-word',
  }),
  roleBtnRow: {
    display: 'flex',
    gap: '0.5rem',
    marginTop: '0.6rem',
  },
  roleChoiceBtn: (disabled, selected) => ({
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    border: selected ? '1px solid #4ade80' : '1px solid rgba(255,255,255,0.2)',
    background: selected ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.06)',
    color: '#fff',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.3 : 1,
  }),
  actionBtnGroup: {
    display: 'flex',
    gap: '0.5rem',
    marginTop: '0.8rem',
  },
  confirmBtn: {
    flex: 1,
    padding: '0.5rem',
    borderRadius: '6px',
    border: 'none',
    background: '#22c55e',
    color: '#fff',
    fontWeight: 700,
    cursor: 'pointer',
  },
  cancelBtn: {
    flex: 1,
    padding: '0.5rem',
    borderRadius: '6px',
    border: 'none',
    background: '#ef4444',
    color: '#fff',
    fontWeight: 700,
    cursor: 'pointer',
  },
  deleteDealBtn: {
    width: '100%',
    padding: '0.6rem',
    borderRadius: '6px',
    border: '1px solid rgba(239,68,68,0.5)',
    background: 'rgba(239,68,68,0.15)',
    color: '#fca5a5',
    fontWeight: 700,
    fontSize: '0.85rem',
    cursor: 'pointer',
    marginTop: '0.8rem',
  },
  errorBox: {
    color: '#f87171',
    fontSize: '0.85rem',
    marginBottom: '0.8rem',
    background: 'rgba(239,68,68,0.1)',
    padding: '0.5rem 0.8rem',
    borderRadius: '6px',
    border: '1px solid rgba(239,68,68,0.2)',
  }
}

const DealRoom = () => {
  const [activeRooms, setActiveRooms] = useState([])
  const [selectedRoom, setSelectedRoom] = useState(null)

  const [partnerUserId, setPartnerUserId] = useState('')
  const [proposedAmount, setProposedAmount] = useState('')
  const [itemDescription, setItemDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const [myRole, setMyRole] = useState(null)
  const [partnerRole, setPartnerRole] = useState(null)
  const [roleConfirmed, setRoleConfirmed] = useState(false)
  const [amountConfirmed, setAmountConfirmed] = useState(false)
  const [messages, setMessages] = useState([])
  const [chatInput, setChatInput] = useState('')

  const scrollRef = useRef(null)
  const currentUserId = 9

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  // Poll or retrieve active rooms
  useEffect(() => {
    const fetchActiveRooms = async () => {
      const local = getLocalRooms()
      try {
        const res = await fetch(`${API_BASE}/rooms/?user_id=${currentUserId}`, { headers: getHeaders() })
        if (res.ok) {
          const dbRooms = await res.json()
          const combined = [...dbRooms]
          local.forEach((lr) => {
            if (!combined.some((r) => r.room_code === lr.room_code)) {
              combined.push(lr)
            }
          })
          setActiveRooms(combined)
          saveLocalRooms(combined)
          return
        }
      } catch (err) {
        // Fallback to local storage if API error/CORS occurs
      }
      setActiveRooms(local)
    }

    fetchActiveRooms()
    const interval = setInterval(fetchActiveRooms, 3000)
    return () => clearInterval(interval)
  }, [currentUserId])

  // Sync room messages periodically
  useEffect(() => {
    if (!selectedRoom) return

    const syncMessages = async () => {
      const storedMsgs = await fetchRoomMessages(selectedRoom.room_code)
      if (storedMsgs && storedMsgs.length > 0) {
        setMessages((prev) => {
          if (storedMsgs.length !== prev.length) {
            return mapMessagesWithPrompts(storedMsgs, roleConfirmed, amountConfirmed, currentUserId)
          }
          return prev
        })
      }
    }

    const interval = setInterval(syncMessages, 2000)
    return () => clearInterval(interval)
  }, [selectedRoom, currentUserId, roleConfirmed, amountConfirmed])

  const handleCreateDeal = async () => {
    if (!partnerUserId.trim() || !proposedAmount.trim() || !itemDescription.trim()) return

    setIsLoading(true)
    setErrorMessage('')

    try {
      const exists = await verifyUserExists(partnerUserId.trim())
      if (!exists) {
        setErrorMessage('User ID not found in database')
        setIsLoading(false)
        return
      }

      const roomCode = generateRoomCode()
      const dealData = {
        room_code: roomCode,
        created_by: currentUserId,
        status: 'Waiting',
        partner_user_id: partnerUserId.trim(),
        proposedamount: proposedAmount.trim(),
        item_description: itemDescription.trim(),
        created_at: formatTime(),
        isSimulated: false,
      }

      await createDealInDB(dealData)

      setActiveRooms((prev) => [dealData, ...prev])
      setPartnerUserId('')
      setProposedAmount('')
      setItemDescription('')
    } catch (err) {
      setErrorMessage('Error creating room.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSimulateInvite = () => {
    const roomCode = generateRoomCode()
    const simulatedInvite = {
      room_code: roomCode,
      created_by: 14,
      status: 'Waiting',
      partner_user_id: '14',
      proposedamount: '269',
      item_description: '50 LTC',
      created_at: formatTime(),
      isSimulated: true,
      isIncoming: true,
    }

    const localRooms = getLocalRooms()
    saveLocalRooms([simulatedInvite, ...localRooms])
    setActiveRooms((prev) => [simulatedInvite, ...prev])
  }

  const openRoom = async (room) => {
    setSelectedRoom(room)

    const isBuyer = String(room.buyer_id) === String(currentUserId)
    const isSeller = String(room.seller_id) === String(currentUserId)

    let currentMyRole = null
    let currentPartnerRole = null

    if (isBuyer) {
      currentMyRole = 'buyer'
      currentPartnerRole = 'seller'
    } else if (isSeller) {
      currentMyRole = 'seller'
      currentPartnerRole = 'buyer'
    }

    setMyRole(currentMyRole)
    setPartnerRole(currentPartnerRole)

    const isReady = room.status === 'Ready' || room.status === 'Completed'
    const hasRoles = Boolean(room.buyer_id || room.seller_id)

    const isRoleConf = isReady || hasRoles
    const isAmtConf = isReady

    setRoleConfirmed(isRoleConf)
    setAmountConfirmed(isAmtConf)

    let storedMsgs = await fetchRoomMessages(room.room_code)

    if (!storedMsgs || storedMsgs.length === 0) {
      const welcomeText = room.isIncoming
        ? `User #${room.partner_user_id} invited you to Room #${room.room_code} to trade "${room.item_description}" for $${room.proposedamount}. Pick your role or decline:`
        : `Welcome to Room #${room.room_code}. Trading "${room.item_description}" for $${room.proposedamount} with User #${room.partner_user_id}. Pick your role or cancel:`

      const initialMsg = {
        id: Date.now(),
        kind: 'bot',
        text: welcomeText,
      }

      const savedMsg = await saveMessageToDB(room.room_code, 'SYSTEM', welcomeText, 'bot')
      storedMsgs = [savedMsg]
    }

    const processedMsgs = mapMessagesWithPrompts(storedMsgs, isRoleConf, isAmtConf, currentUserId)
    setMessages(processedMsgs)
  }

  const handleSelectRole = (role) => {
    if (roleConfirmed) return
    setMyRole(role)
    if (!partnerRole) {
      setPartnerRole(role === 'buyer' ? 'seller' : 'buyer')
    }
  }

  const handleConfirmRole = async () => {
    if (!myRole) return
    setRoleConfirmed(true)

    const isBuyer = myRole === 'buyer'
    const roleUpdates = isBuyer
      ? { buyer_id: currentUserId, seller_id: selectedRoom.partner_user_id }
      : { seller_id: currentUserId, buyer_id: selectedRoom.partner_user_id }

    const updatedRoom = { ...selectedRoom, ...roleUpdates }
    setSelectedRoom(updatedRoom)
    setActiveRooms((prev) =>
      prev.map((r) => (r.room_code === selectedRoom.room_code ? updatedRoom : r))
    )

    await updateRoomInDB(selectedRoom.room_code, roleUpdates)

    const botText = `Role set as ${myRole.toUpperCase()}. Please verify: Is the proposed amount of $${selectedRoom.proposedamount} for "${selectedRoom.item_description}" correct?`

    const savedBotMsg = await saveMessageToDB(selectedRoom.room_code, 'SYSTEM', botText, 'bot', {
      amountConfirmation: true,
    })

    setMessages((prev) =>
      mapMessagesWithPrompts([...prev, savedBotMsg], true, false, currentUserId)
    )
  }

  const handleConfirmAmount = async () => {
    setAmountConfirmed(true)

    const statusUpdate = { status: 'Ready' }

    const updatedRoom = { ...selectedRoom, ...statusUpdate }
    setSelectedRoom(updatedRoom)
    setActiveRooms((prev) =>
      prev.map((r) => (r.room_code === selectedRoom.room_code ? updatedRoom : r))
    )

    await updateRoomInDB(selectedRoom.room_code, statusUpdate)

    const botText = `Deal amount ($${selectedRoom.proposedamount}) verified! Room status is now READY.`

    const savedBotMsg = await saveMessageToDB(selectedRoom.room_code, 'SYSTEM', botText, 'bot')

    setMessages((prev) =>
      mapMessagesWithPrompts([...prev, savedBotMsg], true, true, currentUserId)
    )
  }

  const handleResetRoleSelection = () => {
    setMyRole(null)
    setPartnerRole(null)
    setRoleConfirmed(false)
    setAmountConfirmed(false)
  }

  const handleCancelAndDestroyDeal = async () => {
    if (!selectedRoom) return

    await deleteDealInDB(selectedRoom.room_code)
    setActiveRooms((prev) => prev.filter((r) => r.room_code !== selectedRoom.room_code))
    setSelectedRoom(null)
    setMyRole(null)
    setPartnerRole(null)
    setRoleConfirmed(false)
    setAmountConfirmed(false)
  }

  const sendChat = async () => {
    if (!chatInput.trim()) return

    const text = chatInput.trim()
    setChatInput('')

    const savedMsg = await saveMessageToDB(selectedRoom.room_code, currentUserId, text, 'mine')

    setMessages((prev) =>
      mapMessagesWithPrompts([...prev, savedMsg], roleConfirmed, amountConfirmed, currentUserId)
    )
  }

  return (
    <div style={styles.page}>
      {!selectedRoom ? (
        <div style={styles.modalContainer}>
          <h1 style={styles.title}>Deal Hub</h1>
          <p style={{ color: '#a89db8', marginBottom: '1.5rem' }}>
            Create a trade with a registered user_id or enter an active room.
          </p>

          <div style={styles.splitLayout}>
            <div style={styles.sectionBox}>
              <div style={styles.sectionHeader}>Create a Deal</div>

              {errorMessage && <div style={styles.errorBox}>{errorMessage}</div>}

              <label style={styles.label}>Partner User ID (`user_id`)</label>
              <input
                style={styles.input}
                placeholder="e.g. 14"
                value={partnerUserId}
                onChange={(e) => setPartnerUserId(e.target.value)}
              />

              <label style={styles.label}>Proposed Amount (`proposedamount` $)</label>
              <input
                style={styles.input}
                placeholder="e.g. 150"
                type="number"
                value={proposedAmount}
                onChange={(e) => setProposedAmount(e.target.value)}
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
                  !partnerUserId.trim() || !proposedAmount.trim() || !itemDescription.trim() || isLoading
                )}
                disabled={
                  !partnerUserId.trim() || !proposedAmount.trim() || !itemDescription.trim() || isLoading
                }
                onClick={handleCreateDeal}
              >
                {isLoading ? 'Verifying User...' : 'Create Deal Room'}
              </button>
            </div>

            <div style={styles.sectionBox}>
              <div style={styles.sectionHeader}>Active & Invited Rooms</div>

              <button style={styles.simulateBtn} onClick={handleSimulateInvite}>
                ⚡️ Simulate Incoming Trade Invite
              </button>

              {activeRooms.length === 0 ? (
                <div style={{ color: '#6f6785', textAlign: 'center', marginTop: '1.5rem' }}>
                  No active rooms. Create one or simulate an invite above!
                </div>
              ) : (
                activeRooms.map((room) => (
                  <div key={room.room_code} style={styles.roomCardVertical} onClick={() => openRoom(room)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <span style={styles.codeBadge}>#{room.room_code}</span>
                      {room.isIncoming && <span style={styles.inviteBadge}>INCOMING INVITE</span>}
                      <span style={{ fontSize: '0.75rem', color: '#8b8299' }}>{room.created_at}</span>
                    </div>
                    <div style={{ fontWeight: 700, color: '#fff' }}>User ID: {room.partner_user_id}</div>
                    <div style={{ fontSize: '0.85rem', color: '#c7c0d4' }}>
                      Trading: {room.item_description} (${room.proposedamount})
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ ...styles.modalContainer, maxWidth: '720px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h1 style={styles.title}>Room #{selectedRoom.room_code}</h1>
              <span style={{ color: '#a89db8' }}>Trading with User #{selectedRoom.partner_user_id}</span>
            </div>
            <button
              style={{ ...styles.cancelBtn, flex: 'none', padding: '0.5rem 1rem' }}
              onClick={() => setSelectedRoom(null)}
            >
              Back to Hub
            </button>
          </div>

          <div style={styles.chatWindow}>
            <div style={styles.chatScroll} ref={scrollRef}>
              {messages.map((m) => (
                <div key={m.id} style={{ alignSelf: m.kind === 'mine' ? 'flex-end' : 'flex-start' }}>
                  <div style={styles.bubble(m.kind)}>
                    {m.text}

                    {m.roleSelection && !roleConfirmed && (
                      <div style={{ marginTop: '0.8rem' }}>
                        <div style={{ fontSize: '0.8rem', color: '#c7c0d4', marginBottom: '0.4rem' }}>Select your role:</div>
                        <div style={styles.roleBtnRow}>
                          <button
                            style={styles.roleChoiceBtn(partnerRole === 'buyer', myRole === 'buyer')}
                            disabled={partnerRole === 'buyer'}
                            onClick={() => handleSelectRole('buyer')}
                          >
                            Buyer
                          </button>
                          <button
                            style={styles.roleChoiceBtn(partnerRole === 'seller', myRole === 'seller')}
                            disabled={partnerRole === 'seller'}
                            onClick={() => handleSelectRole('seller')}
                          >
                            Seller
                          </button>
                        </div>

                        {myRole && (
                          <div style={styles.actionBtnGroup}>
                            <button style={styles.confirmBtn} onClick={handleConfirmRole}>
                              Confirm Role
                            </button>
                            <button style={styles.cancelBtn} onClick={handleResetRoleSelection}>
                              Reset Selection
                            </button>
                          </div>
                        )}

                        <button style={styles.deleteDealBtn} onClick={handleCancelAndDestroyDeal}>
                          ✖️ {selectedRoom.isIncoming ? 'Decline & Exit Deal' : 'Cancel & Delete Deal Ticket'}
                        </button>
                      </div>
                    )}

                    {m.amountConfirmation && !amountConfirmed && (
                      <div style={{ marginTop: '0.8rem' }}>
                        <div style={styles.actionBtnGroup}>
                          <button style={styles.confirmBtn} onClick={handleConfirmAmount}>
                            ✅ Confirm (${selectedRoom.proposedamount})
                          </button>
                          <button style={styles.cancelBtn} onClick={handleCancelAndDestroyDeal}>
                            ✖️ Cancel / Wrong Amount
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              style={{ ...styles.input, marginBottom: 0 }}
              placeholder={amountConfirmed ? 'Type a message...' : 'Please confirm role and amount first...'}
              disabled={!amountConfirmed}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendChat()}
            />
            <button
              style={{ ...styles.primaryBtn(!amountConfirmed || !chatInput.trim()), marginTop: 0, width: '100px' }}
              disabled={!amountConfirmed || !chatInput.trim()}
              onClick={sendChat}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DealRoom