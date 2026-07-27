import { useNavigate } from 'react-router-dom'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts'
import '../Global.css'
import './Home.css'
import { useEffect, useState } from 'react';
import { getUserProfile } from '../../lib/profile'
// import {getDashboard} from '../../lib/dashboard'
import { getWallet } from "../../lib/wallet";
const rielData = [
  { date: 'Feb 1', value: 1200000 },
  { date: 'Feb 3', value: 2500000 },
  { date: 'Feb 5', value: 1800000 },
  { date: 'Feb 8', value: 4500000 },
  { date: 'Feb 10', value: 3800000 },
  { date: 'Feb 12', value: 6000000 },
];

const Home = () => {
  const [profile, setProfile] = useState(null);
  const [wallet, setWallet] = useState(null);
  const navigate = useNavigate();

  const handleCreateDealClick = () => {
    navigate('/create-deal');
  };

  const handleHowItWorksClick = () => {
    navigate('/Feature');
  };

  const formatKhmerCurrency = (value) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M ៛`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K ៛`;
    return `${value} ៛`;
  };

  useEffect(() => {
  const loadProfile = async () => {
  
    try {
      const data = await getUserProfile();
      setProfile(data);
      
      const walletData = await getWallet();
      setWallet(walletData);
    } catch (error) {
      console.error(error);
    }
  };

  loadProfile();
}, []);

  return (
    <div className='Global d-flex flex-column min-vh-100 overflow-hidden'>

      <header className="row sticky-top bg-dark">
        <div className="col-12">

        </div>
      </header>

      <main className="container-fluid d-flex justify-content-center align-items-center px-0 pe-0 overflow-hidden">
        <div className="row w-100 g-0 me-0 align-items-center justify-content-between">

          <div className="col-6 welcometext">
            <h2>Secure deals with automated Escrow</h2>
            <div className="underwelcome">
              <h2>Automate your deals with step-by-step escrow designed to protect both parties from payment to release</h2>
            </div>
            <div className="mt-5 flex justify-content-center gap-3">
              <button type="button" id="Create_deal" className="btn-primary btn-1 button_under1" onClick={handleCreateDealClick}>
                Create Deals <i className="fa-solid fa-arrow-up-long rotatearrow"></i>
              </button>
              <button className="button_under2" onClick={handleHowItWorksClick}>
                How it works <i className="fa-solid fa-arrow-up-long rotatearrow"></i>
              </button>
            </div>
          </div>

          <div className="col-6 pe-0">
            <div className="rightsidehomepage p-5 pt-5">
              <div className="dashboard-header mb-4">
                <h3 className="text-white fw-semibold mb-2">
                Welcome Back, {profile?.firstname || "User"}
                </h3>
                <p className="text-gray small mb-0 ms-4">
                    Verification Status:
                    <strong> {profile?.verify_status ?? "Pending"}</strong>
                </p>
                <p className="text-gray small mb-0 ms-4">Manage your escrow deals and wallet.</p>
              </div>
              <div className="row g-3">
                <div className="col-6">
                  <div className="stat-card">
                    <div className="stat-label">
                      Available Balance
                    </div>
                    <div className="stat-value-container">
                      <span className="stat-number">
                          <span className="stat-number">
                          ${wallet?.available_balance?.toFixed(2) ?? "0.00"}
                      </span>
                      </span>
                      <span className="stat-badge text-success">
                        ↑ 74.5%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="col-6">
                  <div className="stat-card">
                    <div className="stat-label">
                      Pending Balance
                    </div>
                    <div className="stat-value-container">
                      <span className="stat-number">
                          <span className="stat-number">
                          ${wallet?.pending_balance?.toFixed(2) ?? "0.00"}
                      </span>
                      </span>
                      <span className="stat-badge text-success">
                        ↑ 74.5%
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              <div className="chart-container mt-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <div className="chart-title text-white small fw-semibold">Wallet Activity</div>
                  <div className="chart-subtitle text-muted ultra-small">Transaction Overview</div>
                </div>

                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={rielData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3fb950" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#3fb950" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" stroke="#8b949e" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis
                      stroke="#8b949e"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={formatKhmerCurrency}
                    />
                    <Tooltip
                      formatter={(value) => [`${value.toLocaleString()} ៛`, 'Volume']}
                      contentStyle={{ backgroundColor: '#1a1532', borderColor: '#35295c', borderRadius: '8px', color: '#fff' }}
                    />
                    <Area type="monotone" dataKey="value" stroke="#3fb950" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* <Footer /> */}
    </div>
  )
}

export default Home