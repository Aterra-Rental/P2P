import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import PaymentQRCode from '../../components/PaymentQRCode'

const generateRoomCode = () => Math.random().toString(36).substring(2, 8).toUpperCase()
const formatTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

const API_BASE = 'http://127.0.0.1:8000/api'

const getHeaders = () => ({
  'Content-Type': 'application/json',
})

const verifyUserExists = async (userId) => {
  if (userId === '123') return true
  try {
    const res = await fetch(`${API_BASE}/users/verify/?user_id=${encodeURIComponent(userId)}`, {
      method: 'GET',
      headers: getHeaders(),
    })
    if (!res.ok) return false
    const data = await res.json()
    return data.exists
  } catch (error) {
    console.error('Error checking user_id:', error)
    return false
  }
}

const createDealInDB = async (dealData) => {
  if (dealData.partner_user_id === '123' || dealData.isSimulated) return { success: true }

  const res = await fetch(`${API_BASE}/rooms/`, {
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
  if (!res.ok) throw new Error('Failed to create room in database.')
  return await res.json()
}

const deleteDealInDB = async (roomCode) => {
  try {
    const res = await fetch(`${API_BASE}/rooms/${roomCode}/`, {
      method: 'DELETE',
      headers: getHeaders(),
    })
    return res.ok
  } catch (err) {
    return true
  }
}

const updateRoomInDB = async (roomCode, updates) => {
  try {
    await fetch(`${API_BASE}/rooms/${roomCode}/`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(updates),
    })
  } catch (err) {
    console.error('Failed to update room status in DB:', err)
  }
}

const fetchRoomMessages = async (roomCode) => {
  try {
    const res = await fetch(`${API_BASE}/rooms/${roomCode}/messages/`, { headers: getHeaders() })
    if (!res.ok) return []
    return await res.json()
  } catch (err) {
    console.error('Error fetching messages:', err)
    return []
  }
}

const saveMessageToDB = async (roomCode, senderId, text, kind = 'mine') => {
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
    console.error('Failed to save message:', err)
  }
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

  const msgId = useRef(0)
  const scrollRef = useRef(null)

  const currentUserId = 9 

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  // Polling with simulation state preservation
  useEffect(() => {
    const fetchActiveRooms = async () => {
      try {
        const res = await fetch(`${API_BASE}/rooms/?user_id=${currentUserId}`, {
          headers: getHeaders(),
        })
        if (res.ok) {
          const data = await res.json()
          setActiveRooms((prevRooms) => {
            const simulatedRooms = prevRooms.filter((r) => r.isSimulated)
            const dbRoomCodes = new Set(data.map((r) => r.room_code))
            const filteredSimulated = simulatedRooms.filter((r) => !dbRoomCodes.has(r.room_code))

            return [...data, ...filteredSimulated]
          })
        }
      } catch (err) {
        console.error('Failed to fetch rooms:', err)
      }
    }

    fetchActiveRooms()
    const interval = setInterval(fetchActiveRooms, 3000)

    return () => clearInterval(interval)
  }, [currentUserId])

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
      setErrorMessage('Error creating room. Check connection.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSimulateInvite = () => {
    const roomCode = generateRoomCode()
    const mockUsers = [8, 13, 14, 17]
    const mockItems = ['100 USDT', 'Game Account', '50 LTC', 'VIP Pass']
    
    const randomUser = mockUsers[Math.floor(Math.random() * mockUsers.length)]
    const randomItem = mockItems[Math.floor(Math.random() * mockItems.length)]
    const randomAmount = Math.floor(Math.random() * 250) + 25

    const simulatedInvite = {
      room_code: roomCode,
      created_by: randomUser,
      status: 'Waiting',
      partner_user_id: String(randomUser),
      proposedamount: String(randomAmount),
      item_description: randomItem,
      created_at: formatTime(),
      isSimulated: true,
      isIncoming: true,
    }

    setActiveRooms((prev) => [simulatedInvite, ...prev])
  }

  const openRoom = async (room) => {
    setSelectedRoom(room)

    const isBuyer = String(room.buyer_id) === String(currentUserId)
    const isSeller = String(room.seller_id) === String(currentUserId)

    if (isBuyer) {
      setMyRole('buyer')
      setPartnerRole('seller')
    } else if (isSeller) {
      setMyRole('seller')
      setPartnerRole('buyer')
    } else {
      setMyRole(null)
      setPartnerRole(null)
    }

    const isReady = room.status === 'Ready' || room.status === 'Completed'
    const hasRoles = Boolean(room.buyer_id || room.seller_id)

    setRoleConfirmed(isReady || hasRoles)
    setAmountConfirmed(isReady)

    const dbMessages = await fetchRoomMessages(room.room_code)

    if (dbMessages && dbMessages.length > 0) {
      setMessages(dbMessages)
    } else {
      const welcomeText = room.isIncoming
        ? `User #${room.partner_user_id} invited you to Room #${room.room_code} to trade "${room.item_description}" for $${room.proposedamount}. Pick your role or decline:`
        : `Welcome to Room #${room.room_code}. Trading "${room.item_description}" for $${room.proposedamount} with User #${room.partner_user_id}. Pick your role or cancel:`

      const initialMsg = {
        id: ++msgId.current,
        kind: 'bot',
        text: welcomeText,
        roleSelection: !(isReady || hasRoles),
      }

      setMessages([initialMsg])
      if (!room.isSimulated) {
        saveMessageToDB(room.room_code, 'SYSTEM', welcomeText, 'bot')
      }
    }
  }

  const handleSelectRole = (role) => {
    if (roleConfirmed) return
    setMyRole(role)
    if (!partnerRole) {
      setPartnerRole(role === 'buyer' ? 'seller' : 'buyer')
    }
  }

  const handleConfirmRole = async () => {
    setRoleConfirmed(true)

    const isBuyer = myRole === 'buyer'
    const roleUpdates = isBuyer
      ? { buyer_id: currentUserId, seller_id: selectedRoom.partner_user_id }
      : { seller_id: currentUserId, buyer_id: selectedRoom.partner_user_id }

    setSelectedRoom((prev) => ({ ...prev, ...roleUpdates }))
    setActiveRooms((prev) =>
      prev.map((r) => (r.room_code === selectedRoom.room_code ? { ...r, ...roleUpdates } : r))
    )

    if (!selectedRoom.isSimulated) {
      await updateRoomInDB(selectedRoom.room_code, roleUpdates)
    }

    const botText = `Role set as ${myRole.toUpperCase()}. Please verify: Is the proposed amount of $${selectedRoom.proposedamount} for "${selectedRoom.item_description}" correct?`

    setMessages((prev) => [
      ...prev,
      {
        id: ++msgId.current,
        kind: 'bot',
        text: botText,
        amountConfirmation: true,
      },
    ])

    if (!selectedRoom.isSimulated) {
      saveMessageToDB(selectedRoom.room_code, 'SYSTEM', botText, 'bot')
    }
  }

  const handleConfirmAmount = async () => {
    setAmountConfirmed(true)

    const statusUpdate = { status: 'Ready' }

    setSelectedRoom((prev) => ({ ...prev, ...statusUpdate }))
    setActiveRooms((prev) =>
      prev.map((r) => (r.room_code === selectedRoom.room_code ? { ...r, ...statusUpdate } : r))
    )

    if (!selectedRoom.isSimulated) {
      await updateRoomInDB(selectedRoom.room_code, statusUpdate)
    }

    const botText = `Deal amount ($${selectedRoom.proposedamount}) verified! Room status is now READY.`

    setMessages((prev) => [
      ...prev,
      { id: ++msgId.current, kind: 'bot', text: botText },
    ])

    if (!selectedRoom.isSimulated) {
      saveMessageToDB(selectedRoom.room_code, 'SYSTEM', botText, 'bot')
    }
  }

  const handleResetRoleSelection = () => {
    setMyRole(null)
    setPartnerRole(null)
    setRoleConfirmed(false)
    setAmountConfirmed(false)
  }

  const handleCancelAndDestroyDeal = async () => {
    if (!selectedRoom) return

    try {
      if (!selectedRoom.isSimulated) {
        await deleteDealInDB(selectedRoom.room_code)
      }
      setActiveRooms((prev) => prev.filter((r) => r.room_code !== selectedRoom.room_code))
      setSelectedRoom(null)
      setMyRole(null)
      setPartnerRole(null)
      setRoleConfirmed(false)
      setAmountConfirmed(false)
    } catch (err) {
      alert('Failed to delete deal.')
    }
  }

  const sendChat = async () => {
    if (!chatInput.trim()) return

    const text = chatInput.trim()
    setChatInput('')

    setMessages((prev) => [
      ...prev,
      { id: ++msgId.current, kind: 'mine', text: text },
    ])

    if (selectedRoom && !selectedRoom.isSimulated) {
      await saveMessageToDB(selectedRoom.room_code, currentUserId, text, 'mine')
    }
  }

  return (
    <div style={styles.page}>
      {!selectedRoom ? (
        <div style={styles.modalContainer}>
          <h1 style={styles.title}>Deal Hub</h1>
          <p style={{ color: '#a89db8', marginBottom: '1.5rem' }}>Create a trade with a registered user_id or enter an active room.</p>

          <div style={styles.splitLayout}>
            <div style={styles.sectionBox}>
              <div style={styles.sectionHeader}>Create a Deal</div>
              
              {errorMessage && <div style={styles.errorBox}>{errorMessage}</div>}

              <label style={styles.label}>Partner User ID (`user_id`)</label>
              <input
                style={styles.input}
                placeholder="e.g. 13 or 123 to test"
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
                style={styles.primaryBtn(!partnerUserId.trim() || !proposedAmount.trim() || !itemDescription.trim() || isLoading)}
                disabled={!partnerUserId.trim() || !proposedAmount.trim() || !itemDescription.trim() || isLoading}
                onClick={handleCreateDeal}
              >
                {isLoading ? 'Verifying User...' : 'Create Deal Room'}
              </button>
            </div>

            <div style={styles.sectionBox}>
              <div style={styles.sectionHeader}>Active & Invited Rooms</div>
              
              <button style={styles.simulateBtn} onClick={handleSimulateInvite}>
                ⚡ Simulate Incoming Trade Invite
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
            <button style={{ ...styles.cancelBtn, flex: 'none', padding: '0.5rem 1rem' }} onClick={() => setSelectedRoom(null)}>
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
                          ✖ {selectedRoom.isIncoming ? 'Decline & Exit Deal' : 'Cancel & Delete Deal Ticket'}
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
                            ✖ Cancel / Wrong Amount
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