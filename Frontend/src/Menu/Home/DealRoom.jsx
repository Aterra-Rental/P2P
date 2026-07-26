import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import PaymentQRCode from '../../components/PaymentQRCode'

const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase()
const formatTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

// --- DJANGO + POSTGRESQL API ENDPOINTS ---
const API_BASE = 'http://127.0.0.1:8000/api'

const getHeaders = () => ({
  'Content-Type': 'application/json',
})

// 1. Verify User exists in PostgreSQL via Django (with Decoy ID '123' bypass)
const verifyUserExists = async (username) => {
  if (username === '123') return true

  try {
    const res = await fetch(`${API_BASE}/users/verify/?username=${encodeURIComponent(username)}`, {
      method: 'GET',
      headers: getHeaders(),
    })
    if (!res.ok) return false
    const data = await res.json()
    return data.exists
  } catch (error) {
    console.error('Error checking user:', error)
    return false
  }
}

// 2. Create Deal in Django / PostgreSQL
const createDealInDB = async (dealData) => {
  if (dealData.partner === '123' || dealData.isSimulated) return { success: true }

  const res = await fetch(`${API_BASE}/deals/`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(dealData),
  })
  if (!res.ok) throw new Error('Failed to create deal.')
  return await res.json()
}

// 3. Delete / Cancel Deal in Django / PostgreSQL
const deleteDealInDB = async (dealId) => {
  try {
    const res = await fetch(`${API_BASE}/deals/${dealId}/`, {
      method: 'DELETE',
      headers: getHeaders(),
    })
    return res.ok
  } catch (err) {
    return true
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
    transition: 'all 0.2s ease',
  },
  roomCardVertical: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(217,70,239,0.2)',
    borderRadius: '10px',
    padding: '1rem',
    marginBottom: '0.75rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
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
  const navigate = useNavigate()
  const CURRENT_USER_ID = 'my_current_user' // Replace with your actual user ID state/context

  // Room Lists & Selection
  const [activeRooms, setActiveRooms] = useState([])
  const [selectedRoom, setSelectedRoom] = useState(null)

  // Form Inputs & Async State
  const [partnerId, setPartnerId] = useState('')
  const [amount, setAmount] = useState('')
  const [item, setItem] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Interactive Selected Room State
  const [myRole, setMyRole] = useState(null)
  const [partnerRole, setPartnerRole] = useState(null)
  const [roleConfirmed, setRoleConfirmed] = useState(false)
  const [amountConfirmed, setAmountConfirmed] = useState(false)
  const [showQR, setShowQR] = useState(false) // Toggle QR Code visibility
  const [messages, setMessages] = useState([])
  const [chatInput, setChatInput] = useState('')

  const msgId = useRef(0)
  const scrollRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  // Step 1: Create room and save to DB
  const handleCreateDeal = async () => {
    if (!partnerId.trim() || !amount.trim() || !item.trim()) return

    setIsLoading(true)
    setErrorMessage('')

    try {
      const exists = await verifyUserExists(partnerId.trim())
      if (!exists) {
        setErrorMessage('User ID not found')
        setIsLoading(false)
        return
      }

      const roomCode = generateCode()
      const dealData = {
        id: roomCode,
        partner: partnerId.trim(),
        amount: amount.trim(),
        item: item.trim(),
        created: formatTime(),
        isSimulated: false,
      }

      await createDealInDB(dealData)

      setActiveRooms((prev) => [dealData, ...prev])
      setPartnerId('')
      setAmount('')
      setItem('')
    } catch (err) {
      setErrorMessage('Error creating room. Check connection.')
    } finally {
      setIsLoading(false)
    }
  }

  // SIMULATE INCOMING INVITATION
  const handleSimulateInvite = () => {
    const roomCode = generateCode()
    const mockUsers = ['crypto_trader99', 'shadow_merchant', 'pro_seller_x']
    const mockItems = ['100 USDT', 'Game Account', '50 LTC', 'VIP Pass']
    
    const randomUser = mockUsers[Math.floor(Math.random() * mockUsers.length)]
    const randomItem = mockItems[Math.floor(Math.random() * mockItems.length)]
    const randomAmount = Math.floor(Math.random() * 250) + 25

    const simulatedInvite = {
      id: roomCode,
      partner: randomUser,
      amount: String(randomAmount),
      item: randomItem,
      created: formatTime(),
      isSimulated: true,
      isIncoming: true,
    }

    setActiveRooms((prev) => [simulatedInvite, ...prev])
  }

  // Step 2: Open deal room
  const openRoom = (room) => {
    setSelectedRoom(room)
    setMyRole(null)
    setPartnerRole(null)
    setRoleConfirmed(false)
    setAmountConfirmed(false)
    setShowQR(false)
    
    const welcomeText = room.isIncoming
      ? `@${room.partner} invited you to Room #${room.id} to trade "${room.item}" for $${room.amount}. Pick your role or decline:`
      : `Welcome to Room #${room.id}. Trading "${room.item}" for $${room.amount} with @${room.partner}. Pick your role or cancel:`

    setMessages([
      {
        id: ++msgId.current,
        kind: 'bot',
        text: welcomeText,
        roleSelection: true,
      }
    ])
  }

  // Step 3: Role interactions
  const handleSelectRole = (role) => {
    if (roleConfirmed) return
    setMyRole(role)
    if (!partnerRole) {
      setPartnerRole(role === 'buyer' ? 'seller' : 'buyer')
    }
  }

  // Confirming Role triggers the NEW BOT MESSAGE for Amount Verification
  const handleConfirmRole = () => {
    setRoleConfirmed(true)
    setMessages((prev) => [
      ...prev,
      {
        id: ++msgId.current,
        kind: 'bot',
        text: `Role set as ${myRole.toUpperCase()}. Please verify: Is the deal amount of $${selectedRoom.amount} for "${selectedRoom.item}" correct?`,
        amountConfirmation: true,
      }
    ])
  }

  // Step 4: Amount Confirmation Handlers + Auto Show QR Code
  const handleConfirmAmount = () => {
    setAmountConfirmed(true)
    setShowQR(true) // Automatically pop open the QR code once verified
    setMessages((prev) => [
      ...prev,
      {
        id: ++msgId.current,
        kind: 'bot',
        text: `Deal amount ($${selectedRoom.amount}) verified! Scan the QR code below to transfer funds.`,
      }
    ])
  }

  const handleResetRoleSelection = () => {
    setMyRole(null)
    setPartnerRole(null)
    setRoleConfirmed(false)
    setAmountConfirmed(false)
    setShowQR(false)
  }

  // Step 5: CANCEL / DECLINE DEAL
  const handleCancelAndDestroyDeal = async () => {
    if (!selectedRoom) return

    try {
      await deleteDealInDB(selectedRoom.id)
      setActiveRooms((prev) => prev.filter((r) => r.id !== selectedRoom.id))
      setSelectedRoom(null)
      setMyRole(null)
      setPartnerRole(null)
      setRoleConfirmed(false)
      setAmountConfirmed(false)
      setShowQR(false)
    } catch (err) {
      alert('Failed to delete deal.')
    }
  }

  const sendChat = () => {
    if (!chatInput.trim()) return
    setMessages((prev) => [
      ...prev,
      { id: ++msgId.current, kind: 'mine', text: chatInput },
    ])
    setChatInput('')
  }

  return (
    <div style={styles.page}>
      {!selectedRoom ? (
        /* --- MAIN DASHBOARD VIEW --- */
        <div style={styles.modalContainer}>
          <h1 style={styles.title}>Deal Hub</h1>
          <p style={{ color: '#a89db8', marginBottom: '1.5rem' }}>Create a trade with a registered user or enter an active room.</p>

          <div style={styles.splitLayout}>
            {/* LEFT PANEL: CREATE DEAL FORM */}
            <div style={styles.sectionBox}>
              <div style={styles.sectionHeader}>Create a Deal</div>
              
              {errorMessage && <div style={styles.errorBox}>{errorMessage}</div>}

              <label style={styles.label}>Partner User ID (Use "123" to test)</label>
              <input
                style={styles.input}
                placeholder="e.g. 123 or vathana_92"
                value={partnerId}
                onChange={(e) => setPartnerId(e.target.value)}
              />

              <label style={styles.label}>Deal Amount ($)</label>
              <input
                style={styles.input}
                placeholder="e.g. 150"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />

              <label style={styles.label}>What is being traded?</label>
              <input
                style={styles.input}
                placeholder="e.g. 100 USDT or Game Account"
                value={item}
                onChange={(e) => setItem(e.target.value)}
              />

              <button
                style={styles.primaryBtn(!partnerId.trim() || !amount.trim() || !item.trim() || isLoading)}
                disabled={!partnerId.trim() || !amount.trim() || !item.trim() || isLoading}
                onClick={handleCreateDeal}
              >
                {isLoading ? 'Verifying User...' : 'Create Deal Room'}
              </button>
            </div>

            {/* RIGHT PANEL: ACTIVE ROOMS & INCOMING INVITES */}
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
                  <div key={room.id} style={styles.roomCardVertical} onClick={() => openRoom(room)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <span style={styles.codeBadge}>#{room.id}</span>
                      {room.isIncoming && <span style={styles.inviteBadge}>INCOMING INVITE</span>}
                      <span style={{ fontSize: '0.75rem', color: '#8b8299' }}>{room.created}</span>
                    </div>
                    <div style={{ fontWeight: 700, color: '#fff' }}>@{room.partner}</div>
                    <div style={{ fontSize: '0.85rem', color: '#c7c0d4' }}>
                      Trading: {room.item} (${room.amount})
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        /* --- SELECTED ROOM INTERACTIVE VIEW --- */
        <div style={{ ...styles.modalContainer, maxWidth: '720px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h1 style={styles.title}>Room #{selectedRoom.id}</h1>
              <span style={{ color: '#a89db8' }}>Trading with @{selectedRoom.partner}</span>
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

                    {/* DealBot Message #1: Role Selection */}
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

                    {/* DealBot Message #2: Amount Confirmation Prompt */}
                    {m.amountConfirmation && !amountConfirmed && (
                      <div style={{ marginTop: '0.8rem' }}>
                        <div style={styles.actionBtnGroup}>
                          <button style={styles.confirmBtn} onClick={handleConfirmAmount}>
                            ✅ Confirm (${selectedRoom.amount})
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

          {/* PAYMENT QR CODE COMPONENT SECTION */}
          {amountConfirmed && (
            <div style={{ marginBottom: '1rem' }}>
              {!showQR ? (
                <button
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(90deg, #d946ef, #ec4899)',
                    color: '#fff',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                  onClick={() => setShowQR(true)}
                >
                  📱 Show Payment QR Code
                </button>
              ) : (
                <PaymentQRCode
                  room={selectedRoom}
                  currentUserId={CURRENT_USER_ID}
                  onClose={() => setShowQR(false)}
                />
              )}
            </div>
          )}

          {/* CHAT INPUT AREA */}
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