
import { useNavigate } from 'react-router-dom'
import '../Global.css'
import './Home.css' // Re-uses your fonts and styles if needed

const Deal = () => {
  const navigate = useNavigate();

  return (
    <div className='Global d-flex flex-column min-vh-100'>
      
      {/* Top Navbar Header */}
      <header className="row p-3">
        <div className="col-12">
          {/* Simple back button using React Router */}
          <button 
            className="button_under2" 
            style={{ backgroundColor: '#333', padding: '10px 20px' }}
            onClick={() => navigate('/')}
          >
            ← Back to Home
          </button>
        </div>
      </header>

      {/* Main Page Content */}
      <main className="container-fluid d-flex flex-column justify-content-center align-items-start ps-5"> 
        <div className="row w-100">
          
          <div className="col-12 welcometext">
            <h2>Start Your Automated Escrow</h2>
            <div className="underwelcome">
              <h2>Fill out the step-by-step transaction details below to securely protect both parties.</h2>
            </div>
          </div>

          <div className="col-12 mt-4 ps-5">
            {/* --- YOUR ESCROW FORM INTERFACE GOES HERE --- */}
            <div style={{ padding: '20px', border: '1px solid gray', borderRadius: '14px', maxWidth: '500px' }}>
              <p style={{ color: 'white' }}>[ Deal Creation Form / Content Will Go Here ]</p>
            </div>
          </div>
          
        </div>
      </main>
      
    </div>
  )
}

export default Deal