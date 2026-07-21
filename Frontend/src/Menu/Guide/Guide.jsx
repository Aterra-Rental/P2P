import '../Global.css'
import Footer from '../../Router/Footer'

const steps = [
  { title: '1. Create a Room', text: 'Start a deal by inviting the other party into a private room. Both sides confirm what\'s being exchanged before anything moves forward.' },
  { title: '2. Confirm the Terms', text: 'Agree on item, price, and conditions. Either side can propose changes, but nothing locks in until both people re-confirm.' },
  { title: '3. Buyer Pays Into Escrow', text: 'Funds are held securely by the platform — never sent directly to the seller until the deal is confirmed complete.' },
  { title: '4. Seller Delivers', text: 'Once the seller delivers the agreed item or service, the buyer reviews and confirms everything checks out.' },
  { title: '5. Funds Released', text: 'The moment the buyer confirms, funds release to the seller automatically. Disputes pause this step for admin review.' },
]

const Guide = () => {
  return (
    <div className='Global'>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '4.5rem 1.25rem 4rem' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '1rem' }}>How It Works</h1>
        <p style={{ textAlign: 'center', maxWidth: '520px', margin: '0 auto 3rem' }}>
          A simple step-by-step walkthrough of how a deal moves from start to finish on the platform.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {steps.map((step, i) => (
            <div key={i} className='card' style={{ padding: '1.5rem 1.75rem' }}>
              <h3 style={{ marginBottom: '0.5rem', fontSize: '1.2rem' }}>{step.title}</h3>
              <p style={{ margin: 0 }}>{step.text}</p>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  )
}

export default Guide