import React from 'react'
import { QRCodeSVG } from 'qrcode.react'

const PaymentQRCode = ({ room, currentUserId, onClose }) => {
  // Determine who receives the funds based on who created the room
  const recipientId = room.created_by === currentUserId ? room.partner_id : room.created_by
  const dealAmount = room.amount || room.proposedamount || '0.00'

  // Construct structured payment payload for scanning
  const payload = JSON.stringify({
    type: 'DEAL_PAYMENT',
    roomId: room.room_id,
    roomCode: room.room_code || room.room_id,
    recipientId: recipientId,
    amount: dealAmount,
  })

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span style={{ fontWeight: 700, color: '#f3d9ff' }}>Payment QR Code</span>
        <button onClick={onClose} style={styles.closeBtn}>✕</button>
      </div>

      <div style={styles.qrContainer}>
        <QRCodeSVG
          value={payload}
          size={180}
          bgColor="#0a0612"
          fgColor="#d946ef"
          level="H"
          includeMargin={true}
        />
      </div>

      <div style={styles.details}>
        <div style={{ color: '#ec4899', fontSize: '1.4rem', fontWeight: 'bold' }}>
          ${dealAmount}
        </div>
        <div style={{ fontSize: '0.85rem', color: '#a89db8', marginTop: '0.2rem' }}>
          Recipient User ID: <strong>#{recipientId}</strong>
        </div>
      </div>

      <p style={{ fontSize: '0.75rem', color: '#6f6785', textAlign: 'center', marginTop: '0.8rem' }}>
        Scan with your application scanner or payment app to complete the transaction.
      </p>
    </div>
  )
}

const styles = {
  card: {
    background: '#141224',
    border: '1px solid rgba(217,70,239,0.3)',
    borderRadius: '12px',
    padding: '1.2rem',
    marginTop: '1rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  header: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.8rem',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#a89db8',
    cursor: 'pointer',
    fontSize: '1rem',
  },
  qrContainer: {
    background: '#0a0612',
    padding: '12px',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  details: {
    textAlign: 'center',
    marginTop: '0.8rem',
  },
}

export default PaymentQRCode