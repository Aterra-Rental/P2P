import '../Global.css'
import Footer from '../../Router/Footer'

const features = [
  { icon: '🔒', title: 'Escrow Protection', text: 'Payments are held securely and only released once both parties confirm the deal is complete.' },
  { icon: '🤖', title: 'Automated Rooms', text: 'Every deal gets a private room with a bot that logs terms, timestamps, and confirmations automatically.' },
  { icon: '⚖️', title: 'Dispute Resolution', text: 'If something goes wrong, either side can open a dispute for a human admin to review the full logged history.' },
  { icon: '🚩', title: 'Scam Detection', text: 'The bot watches for common scam patterns — like pressure to pay off-platform — and flags them instantly.' },
  { icon: '⚡', title: 'Fast Releases', text: 'Funds release the moment the buyer confirms, or automatically after a holding window if no dispute is raised.' },
  { icon: '📜', title: 'Full Transparency', text: 'Every message and offer is logged with a timestamp, so nothing is left to memory or screenshots.' },
]

const Feature = () => {
  return (
    <div className='Global'>
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '4.5rem 1.25rem 4rem' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '1rem' }}>Features</h1>
        <p style={{ textAlign: 'center', maxWidth: '520px', margin: '0 auto 3rem' }}>
          Everything built into the platform to keep your deals safe from start to finish.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
          {features.map((f, i) => (
            <div key={i} className='card' style={{ padding: '1.75rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{f.icon}</div>
              <h3 style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>{f.title}</h3>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>{f.text}</p>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  )
}

export default Feature