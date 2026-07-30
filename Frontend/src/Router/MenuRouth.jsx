
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom'
import Home from '../Menu/Home/Home.jsx'
import Feature from '../Menu/Feature/Feature.jsx'
import Navbar from './Navbar.jsx'
import FQA from '../Menu/FQA/FQA.jsx'
import Footer from './Footer.jsx'
import Dashboard from '../Menu/User/Dashboard.jsx'
import Register from '../pages/Register.jsx'
import Login from '../pages/Login.jsx'
import CompleteProfile from '../pages/CompleteProfile.jsx'
import DealRoom from '../Menu/Home/DealRoom.jsx'
import CameraPage from '../components/Camera/CameraPage.jsx'
import PreviewPage from '../components/Camera/PreviewPage.jsx'
import AdminLogin from '../Admin/Components/Login/AdminLogin.jsx'
import ProtectedAdminRoute from '../Admin/Components/ProtectedRoute/ProtectedAdminRoute.jsx'
import AdminDashboard from '../Admin/Dashboard/Dashboard.jsx'
import ProtectedRoute from '../components/ProtectedRoute.jsx'
import TransactionHistory from "../pages/TransactionHistory/TransactionHistory.jsx";
import TransactionDetails from "../pages/TransactionDetails/TransactionDetails.jsx";
import DealHub from "../Menu/Home/pages/Dealhub.jsx";
import DealWorkspace from "../Menu/Home/pages/DealWorkspace";
import Settings from "../pages/Setting/Settings.jsx";
// import InvitationPage from "../Menu/Home/pages/InvitationPage.jsx";

// Temporary import
import BakongTest from "../testComponents/BakongTest.jsx";
const Layout = () => {
  const location = useLocation()
  const hideLayout =
  ['/Register', '/Login', '/admin/login'].includes(location.pathname) ||
  location.pathname.startsWith('/camera') ||
  location.pathname.startsWith('/admin');

  return (
    <>
      {!hideLayout && <Navbar/>}
      <Routes>
        <Route path='/' element={<Home/>}/>
        <Route path='/Home' element={<Home/>}/>
        <Route path='/Feature' element={<Feature/>}/>
        <Route path='/FQA' element={<FQA/>}/>
        <Route path="/Dashboard" element={ <ProtectedRoute> <Dashboard /> </ProtectedRoute>} />
        <Route path='/Register' element={<Register/>}/>
        <Route path='/Login' element={<Login/>}/>
        <Route path="/CompleteProfile" element={ <ProtectedRoute> <CompleteProfile /> </ProtectedRoute>} />
        <Route path="/create-deal" element={ <ProtectedRoute requireVerified={true}> <DealRoom /></ProtectedRoute>}/>
        <Route path="/camera/:type" element={ <ProtectedRoute> <CameraPage /> </ProtectedRoute> } />
        <Route path="/camera/:type/preview" element={ <ProtectedRoute> <PreviewPage /> </ProtectedRoute> }/>
        <Route path="/admin/login" element={<AdminLogin />}/>
        <Route path="/admin/dashboard" element={<ProtectedAdminRoute><AdminDashboard /></ProtectedAdminRoute>}/>
        <Route path="/transactions" element={<ProtectedRoute><TransactionHistory /></ProtectedRoute>}/>
        <Route path="/transaction/:transactionId" element={<TransactionDetails />}/>
        <Route
          path="/deal/:roomCode"
          element={
            <ProtectedRoute requireVerified={true}>
              <DealWorkspace />
            </ProtectedRoute>
          }
        />

        <Route path="/deals" element={<DealHub />} />

        <Route path="/settings" element={<Settings />} />

        {/* Temporary Bakong testing page */}
        <Route
          path="/bakong-test"
          element={<BakongTest />}
        />

        {/* Future invitation page */}
        {/* <Route path="/invitations" element={<InvitationPage />} /> */}

        {/* Old testing route (kept for reference) */}
        {/*
        <Route
          path="/transaction/:transactionId"
          element={<h1 style={{ padding: 40 }}>Transaction Route Works!</h1>}
        />
        */}
        <Route path="*" element={<Home />} />
      </Routes>
      {!hideLayout && <Footer/>}
    </>
  )
}

const MenuRouth = () => {
  return (
    <Router>
      <Layout/>
    </Router>
  )
}

export default MenuRouth