import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const generateCode = () =>
  Math.random().toString(36).substring(2, 8).toUpperCase()

const formatTime = () =>
  new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

const styles = {
  page: {
    minHeight: '100vh',
    background: 'radial-gradient(circle at 20% 20%, #1a0f2e 0%, #0a0612 60%)',
    color: '#f5f3fa',
    fontFamily: "'Oswald', sans-serif",
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '3rem 1.5rem',
  },
  card: {
    background: '#1c1a2e',
    border: '1px solid rgba(216, 128, 255, 0.15)',
    borderRadius: '16px',
    padding: '2.5rem',
    width: '100%',
    maxWidth: '480px',
    boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
  },
  wideCard: {
    background: '#1c1a2e',
    border: '1px solid rgba(216, 128, 255, 0.15)',
    borderRadius: '16px',
    padding: '2rem',
    width: '100%',
    maxWidth: '820px',
    boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
  },
  title: {
    fontSize: '1.9rem',
    fontWeight: 700,
    marginBottom: '0.5rem',
    background: 'linear-gradient(90deg, #d946ef, #ec4899)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    color: '#a89db8',
    marginBottom: '2rem',
    fontSize: '0.95rem',
  },
  label: {
    fontSize: '0.85rem',
    color: '#c7c0d4',
    marginBottom: '0.4rem',
    display: 'block',
    fontWeight: 600,
  },
  inputWrap: {
    position: 'relative',
    marginBottom: '1.25rem',
  },
  atPrefix: {
    position: 'absolute',
    left: '1rem',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#8b8299',
    fontWeight: 700,
  },
  input: {
    width: '100%',
    padding: '0.85rem 1rem',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.1)',
    background: '#141224',
    color: '#fff',
    fontSize: '1rem',
    letterSpacing: '0.02em',
    boxSizing: 'border-box',
  },
  inputWithPrefix: {
    paddingLeft: '2rem',
  },
  hint: {
    fontSize: '0.78rem',
    color: '#6f6785',
    marginTop: '0.4rem',
  },
  primaryBtn: (disabled) => ({
    width: '100%',
    padding: '0.9rem',
    borderRadius: '10px',
    border: 'none',
    background: disabled
      ? 'rgba(255,255,255,0.08)'
      : 'linear-gradient(90deg, #d946ef, #ec4899)',
    color: disabled ? '#666' : '#fff',
    fontWeight: 700,
    fontSize: '1rem',
    cursor: disabled ? 'not-allowed' : 'pointer',
    marginBottom: '0.75rem',
  }),
  secondaryBtn: {
    width: '100%',
    padding: '0.9rem',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'transparent',
    color: '#c7c0d4',
    fontWeight: 600,
    fontSize: '1rem',
    cursor: 'pointer',
  },
  codeBadge: {
    display: 'inline-block',
    fontWeight: 800,
    letterSpacing: '0.25em',
    padding: '0.35rem 0.9rem',
    borderRadius: '999px',
    background: 'rgba(217,70,239,0.1)',
    border: '1px solid rgba(217,70,239,0.35)',
    color: '#f3d9ff',
    fontSize: '0.9rem',
  },
  partiesRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
    marginBottom: '1.25rem',
  },
  personCard: {
    borderRadius: '12px',
    padding: '0.85rem',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    textAlign: 'center',
    fontSize: '0.9rem',
  },
  statusDot: (online) => ({
    display: 'inline-block',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: online ? '#4ade80' : '#666',
    marginRight: '6px',
  }),
  spinnerWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
    padding: '1.5rem 0',
  },
  spinner: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: '3px solid rgba(217,70,239,0.2)',
    borderTopColor: '#d946ef',
    animation: 'spin 0.9s linear infinite',
  },
  inviteTarget: {
    textAlign: 'center',
    fontSize: '1.1rem',
    fontWeight: 700,
    color: '#f3d9ff',
    marginBottom: '0.25rem',
  },

  // --- chat ---
  chatWindow: {
    background: '#141224',
    borderRadius: '14px',
    border: '1px solid rgba(255,255,255,0.06)',
    padding: '1rem',
    marginBottom: '1rem',
  },
  chatScroll: {
    maxHeight: '360px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
    paddingRight: '4px',
  },
  systemMsg: {
    alignSelf: 'center',
    background: 'rgba(255,255,255,0.05)',
    color: '#a89db8',
    fontSize: '0.75rem',
    padding: '0.3rem 0.8rem',
    borderRadius: '999px',
    margin: '0.4rem 0',
  },
  messageRow: (mine) => ({
    display: 'flex',
    justifyContent: mine ? 'flex-end' : 'flex-start',
    alignItems: 'flex-end',
    gap: '0.5rem',
  }),
  avatar: (kind) => ({
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: kind === 'bot' ? '0.85rem' : '0.7rem',
    fontWeight: 700,
    background:
      kind === 'mine'
        ? 'linear-gradient(135deg, #d946ef, #ec4899)'
        : kind === 'bot'
        ? 'linear-gradient(135deg, #22d3ee, #6366f1)'
        : 'linear-gradient(135deg, #4b4468, #2e2a44)',
    color: '#fff',
  }),
  bubbleGroup: (mine) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: mine ? 'flex-end' : 'flex-start',
    maxWidth: '72%',
  }),
  bubble: (kind) => ({
    background:
      kind === 'mine'
        ? 'linear-gradient(135deg, #d946ef, #ec4899)'
        : kind === 'bot'
        ? 'rgba(99,102,241,0.18)'
        : '#26233a',
    border: kind === 'bot' ? '1px solid rgba(99,102,241,0.35)' : 'none',
    color: '#fff',
    padding: '0.55rem 0.9rem',
    fontSize: '0.9rem',
    lineHeight: 1.4,
    borderRadius:
      kind === 'mine' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
    wordBreak: 'break-word',
  }),
  timestamp: (mine) => ({
    fontSize: '0.68rem',
    color: '#6f6785',
    marginTop: '3px',
    padding: mine ? '0 4px 0 0' : '0 0 0 4px',
  }),
  roleBtnRow: {
    display: 'flex',
    gap: '0.5rem',
    marginTop: '0.6rem',
  },
  roleChoiceBtn: (disabled) => ({
    padding: '0.5rem 1rem',
    borderRadius: '999px',
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.06)',
    color: '#fff',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
  }),
  typingBubble: {
    background: '#26233a',
    borderRadius: '16px 16px 16px 4px',
    padding: '0.55rem 0.9rem',
    display: 'flex',
    gap: '4px',
    alignItems: 'center',
  },
  typingDot: (delay) => ({
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: '#9b93ad',
    animation: `bounce 1.2s infinite ${delay}s`,
  }),
  chatInputRow: {
    display: 'flex',
    gap: '0.6rem',
    alignItems: 'center',
    background: '#141224',
    borderRadius: '999px',
    border: '1px solid rgba(255,255,255,0.08)',
    padding: '0.4rem 0.4rem 0.4rem 1.1rem',
    marginBottom: '1.5rem',
  },
  chatInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#fff',
    fontSize: '0.95rem',
    padding: '0.5rem 0',
  },
  sendBtn: (disabled) => ({
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    border: 'none',
    flexShrink: 0,
    background: disabled
      ? 'rgba(255,255,255,0.08)'
      : 'linear-gradient(135deg, #d946ef, #ec4899)',
    color: disabled ? '#666' : '#fff',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1rem',
  }),

  finalizeBox: {
    background: 'rgba(217,70,239,0.06)',
    border: '1px solid rgba(217,70,239,0.25)',
    borderRadius: '14px',
    padding: '1.2rem',
    marginBottom: '1rem',
  },
  finalizeRow: {
    display: 'flex',
    gap: '0.6rem',
  },
  readyRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
    marginTop: '1rem',
  },
  readyBox: (ready) => ({
    borderRadius: '12px',
    padding: '0.8rem',
    textAlign: 'center',
    background: ready ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.03)',
    border: ready ? '1px solid rgba(74,222,128,0.4)' : '1px solid rgba(255,255,255,0.08)',
    color: ready ? '#86efac' : '#8b8299',
    fontWeight: 600,
    fontSize: '0.85rem',
  }),

  completeWrap: {
    textAlign: 'center',
    padding: '1rem 0',
  },
  checkCircle: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    background: 'linear-gradient(90deg, #4ade80, #22c55e)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1.5rem',
    fontSize: '2rem',
    fontWeight: 900,
    color: '#0a0612',
  },
  itemBoxLeft: {
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '12px',
    padding: '1.2rem',
    textAlign: 'left',
  },
}

const NEGOTIATION_REPLIES = [
  "Hmm, that's a bit lower than I hoped — can you come up a little?",
  'I could work with that, let me think for a sec.',
  "That's fair, I'm okay meeting somewhere around there.",
  'Can we settle a little closer to the middle?',
  'Alright, that works for me honestly.',
]

const DealRoom = () => {
  const navigate = useNavigate()

  const [step, setStep] = useState('setup') // setup -> inviting -> room -> complete
  const [partnerId, setPartnerId] = useState('')
  const [roomCode, setRoomCode] = useState('')

  const [myRole, setMyRole] = useState(null)
  const [otherRole, setOtherRole] = useState(null)
  const [otherJoined, setOtherJoined] = useState(false)

  const [messages, setMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [otherTyping, setOtherTyping] = useState(false)

  const [showFinalize, setShowFinalize] = useState(false)
  const [myPriceInput, setMyPriceInput] = useState('')
  const [myConfirmed, setMyConfirmed] = useState(false)
  const [otherConfirmed, setOtherConfirmed] = useState(false)
  const [dealPrice, setDealPrice] = useState(null)

  const timers = useRef([])
  const scrollRef = useRef(null)
  const msgId = useRef(0)

  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, otherTyping])

  const nextId = () => ++msgId.current

  const pushMessage = (msg) =>
    setMessages((prev) => [...prev, { id: nextId(), time: formatTime(), ...msg }])

  const initials = (label) => label?.charAt(0).toUpperCase() || '?'

  // ---- Step 1: invite by user ID ----
  const handleInvite = () => {
    if (!partnerId.trim()) return
    setRoomCode(generateCode())
    setStep('inviting')

    const t = setTimeout(() => {
      setStep('room')
      const t1 = setTimeout(() => {
        pushMessage({
          kind: 'bot',
          from: 'DealBot',
          text: `@${partnerId.trim()} has accepted the invite. Before we start, are you joining as the Buyer or the Seller?`,
          roleChoice: true,
        })
      }, 400)
      timers.current.push(t1)
    }, 2000)
    timers.current.push(t)
  }

  // ---- Step 2: bot asks role ----
  const chooseRole = (role) => {
    if (myRole) return
    setMyRole(role)

    pushMessage({ kind: 'mine', from: 'You', text: `I'll be the ${role}.` })

    const opposite = role === 'buyer' ? 'seller' : 'buyer'
    const t1 = setTimeout(() => {
      pushMessage({
        kind: 'bot',
        from: 'DealBot',
        text: `Got it — you're the ${role}. Let me confirm with @${partnerId.trim()}...`,
      })
      const t2 = setTimeout(() => {
        setOtherRole(opposite)
        setOtherJoined(true)
        pushMessage({
          kind: 'bot',
          from: 'DealBot',
          text: `@${partnerId.trim()} is in as the ${opposite}. You're both set — feel free to start negotiating whenever you're ready.`,
        })
      }, 2000)
      timers.current.push(t2)
    }, 600)
    timers.current.push(t1)
  }

  // ---- Step 3: free negotiation ----
  const sendChat = () => {
    if (!chatInput.trim() || !otherJoined) return
    pushMessage({ kind: 'mine', from: 'You', text: chatInput })
    setChatInput('')
    setOtherTyping(true)

    const t = setTimeout(() => {
      setOtherTyping(false)
      const reply = NEGOTIATION_REPLIES[Math.floor(Math.random() * NEGOTIATION_REPLIES.length)]
      pushMessage({ kind: 'other', from: partnerId.trim(), text: reply })
    }, 1300 + Math.random() * 900)
    timers.current.push(t)
  }

  // ---- Step 4: each side locks in their own final price ----
  const confirmMyPrice = () => {
    if (!myPriceInput.trim()) return
    setMyConfirmed(true)
    pushMessage({
      kind: 'system',
      text: `You locked in ${myPriceInput}$ ✅`,
    })

    const t = setTimeout(() => {
      setOtherConfirmed(true)
      pushMessage({
        kind: 'system',
        text: `@${partnerId.trim()} locked in ${myPriceInput}$ ✅`,
      })
      setDealPrice(myPriceInput)
    }, 1800)
    timers.current.push(t)
  }

  useEffect(() => {
    if (myConfirmed && otherConfirmed) {
      const t = setTimeout(() => setStep('complete'), 1500)
      timers.current.push(t)
    }
  }, [myConfirmed, otherConfirmed])

  return (
    <div style={styles.page}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>

      {step === 'setup' && (
        <div style={styles.card}>
          <h1 style={styles.title}>Start a Deal</h1>
          <p style={styles.subtitle}>
            Enter the unique User ID of the person you want to trade with. DealBot will invite
            them and guide you both through the room.
          </p>

          <label style={styles.label}>Trading partner's User ID</label>
          <div style={styles.inputWrap}>
            <span style={styles.atPrefix}>@</span>
            <input
              style={{ ...styles.input, ...styles.inputWithPrefix }}
              placeholder="e.g. vathana_92"
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
            />
          </div>
          <p style={styles.hint}>
            You can find this on their profile. IDs are unique to every user.
          </p>

          <button
            style={styles.primaryBtn(!partnerId.trim())}
            disabled={!partnerId.trim()}
            onClick={handleInvite}
          >
            Invite to Deal Room
          </button>
          <button style={styles.secondaryBtn} onClick={() => navigate('/')}>
            Cancel
          </button>
        </div>
      )}

      {step === 'inviting' && (
        <div style={styles.card}>
          <h1 style={styles.title}>Sending Invite</h1>
          <p style={styles.inviteTarget}>@{partnerId.trim()}</p>
          <p style={{ ...styles.subtitle, textAlign: 'center' }}>
            Room <span style={styles.codeBadge}>{roomCode}</span>
          </p>
          <div style={styles.spinnerWrap}>
            <div style={styles.spinner} />
            <p style={{ color: '#a89db8', fontSize: '0.9rem' }}>
              Waiting for @{partnerId.trim()} to accept...
            </p>
          </div>
        </div>
      )}

      {step === 'room' && (
        <div style={styles.wideCard}>
          <h1 style={styles.title}>Deal Room</h1>
          <p style={styles.subtitle}>
            Room <span style={styles.codeBadge}>{roomCode}</span>
          </p>

          <div style={styles.partiesRow}>
            <div style={styles.personCard}>
              <span style={styles.statusDot(true)} />
              You {myRole ? `— ${myRole}` : '(choosing role...)'}
            </div>
            <div style={styles.personCard}>
              <span style={styles.statusDot(otherJoined)} />
              @{partnerId.trim()} {otherJoined ? `(${otherRole})` : '(pending)'}
            </div>
          </div>

          <div style={styles.chatWindow}>
            <div style={styles.chatScroll} ref={scrollRef}>
              {messages.map((m) => {
                if (m.kind === 'system') {
                  return (
                    <div key={m.id} style={styles.systemMsg}>
                      {m.text}
                    </div>
                  )
                }
                const mine = m.kind === 'mine'
                const bot = m.kind === 'bot'
                return (
                  <div key={m.id} style={styles.messageRow(mine)}>
                    {!mine && (
                      <div style={styles.avatar(bot ? 'bot' : 'other')}>
                        {bot ? '🤖' : initials(m.from)}
                      </div>
                    )}
                    <div style={styles.bubbleGroup(mine)}>
                      <div style={styles.bubble(mine ? 'mine' : bot ? 'bot' : 'other')}>
                        {m.text}
                        {m.roleChoice && !myRole && (
                          <div style={styles.roleBtnRow}>
                            <button
                              style={styles.roleChoiceBtn(false)}
                              onClick={() => chooseRole('buyer')}
                            >
                              I'm the Buyer
                            </button>
                            <button
                              style={styles.roleChoiceBtn(false)}
                              onClick={() => chooseRole('seller')}
                            >
                              I'm the Seller
                            </button>
                          </div>
                        )}
                      </div>
                      <div style={styles.timestamp(mine)}>{m.time}</div>
                    </div>
                    {mine && <div style={styles.avatar('mine')}>{initials('You')}</div>}
                  </div>
                )
              })}

              {otherTyping && (
                <div style={styles.messageRow(false)}>
                  <div style={styles.avatar('other')}>{initials(partnerId.trim())}</div>
                  <div style={styles.typingBubble}>
                    <span style={styles.typingDot(0)} />
                    <span style={styles.typingDot(0.2)} />
                    <span style={styles.typingDot(0.4)} />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={styles.chatInputRow}>
            <input
              style={styles.chatInput}
              placeholder={
                otherJoined ? 'Send a message or offer...' : 'Waiting for the room to be ready...'
              }
              value={chatInput}
              disabled={!otherJoined}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendChat()}
            />
            <button
              style={styles.sendBtn(!chatInput.trim() || !otherJoined)}
              disabled={!chatInput.trim() || !otherJoined}
              onClick={sendChat}
            >
              ➤
            </button>
          </div>

          {otherJoined && !showFinalize && (
            <button style={styles.primaryBtn(false)} onClick={() => setShowFinalize(true)}>
              Ready to Finalize the Deal
            </button>
          )}

          {showFinalize && (
            <div style={styles.finalizeBox}>
              <p style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: '#e6e0ef' }}>
                Enter the final price you're agreeing to. Once both sides lock in, the deal closes.
              </p>
              <div style={styles.finalizeRow}>
                <input
                  style={{ ...styles.input, marginBottom: 0 }}
                  placeholder="Final price (e.g. 95)"
                  type="number"
                  value={myPriceInput}
                  disabled={myConfirmed}
                  onChange={(e) => setMyPriceInput(e.target.value)}
                />
                <button
                  style={{ ...styles.primaryBtn(myConfirmed || !myPriceInput.trim()), width: 'auto', padding: '0 1.4rem', marginBottom: 0 }}
                  disabled={myConfirmed || !myPriceInput.trim()}
                  onClick={confirmMyPrice}
                >
                  {myConfirmed ? 'Locked' : 'Lock In'}
                </button>
              </div>

              <div style={styles.readyRow}>
                <div style={styles.readyBox(myConfirmed)}>
                  {myConfirmed ? '✓ You locked in' : 'Not locked in yet'}
                </div>
                <div style={styles.readyBox(otherConfirmed)}>
                  {otherConfirmed ? `✓ @${partnerId.trim()} locked in` : `Waiting on @${partnerId.trim()}`}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {step === 'complete' && (
        <div style={styles.card}>
          <div style={styles.completeWrap}>
            <div style={styles.checkCircle}>✓</div>
            <h1 style={styles.title}>Deal Completed</h1>
            <p style={styles.subtitle}>
              Both sides agreed on {dealPrice}$. Funds and item have exchanged hands securely.
            </p>
            <div style={styles.itemBoxLeft}>
              <div>Room #{roomCode} — closed</div>
              <div>You & @{partnerId.trim()} both confirmed</div>
            </div>
            <button style={{ ...styles.primaryBtn(false), marginTop: '1.25rem' }} onClick={() => navigate('/User')}>
              Back to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DealRoom