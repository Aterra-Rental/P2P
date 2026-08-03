import { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import Home from '../Menu/Home/Home.jsx'
import Feature from '../Menu/Feature/Feature.jsx'
import Navbar from './Navbar.jsx'
import FQA from '../Menu/FQA/FQA.jsx'
import Footer from './Footer.jsx'
import Dashboard from '../Menu/User/Dashboard.jsx'
import Register from '../pages/Register.jsx'
import Login from '../pages/Login.jsx'
import CompleteProfile from '../pages/CompleteProfile.jsx'
import CameraPage from '../components/Camera/CameraPage.jsx'
import PreviewPage from '../components/Camera/PreviewPage.jsx'
import AdminLogin from '../Admin/Components/Login/AdminLogin.jsx'
import ProtectedAdminRoute from '../Admin/Components/ProtectedRoute/ProtectedAdminRoute.jsx'
import AdminDashboard from '../Admin/Dashboard/Dashboard.jsx'
import UsersPage from '../Admin/Users/UsersPage.jsx'
import ProtectedRoute from '../components/ProtectedRoute.jsx'
import TransactionHistory from "../pages/TransactionHistory/TransactionHistory.jsx";
import TransactionDetails from "../pages/TransactionDetails/TransactionDetails.jsx";
import DealHub from "../Menu/Home/pages/Dealhub.jsx";
import DealWorkspace from "../Menu/Home/pages/DealWorkspace";
import Settings from "../pages/Setting/Settings.jsx";
import VerifiedRoute from "../components/VerifiedRoute.jsx" 
import Verification from '../Admin/Verification/Verification.jsx'
import FaqPage from '../Admin/Faq/FaqPage.jsx'

import PrivacyPolicy from '../pages/Legal/PrivacyPolicy';
import TermsOfService from '../pages/Legal/TermsOfService';
import Status from '../pages/Legal/Status';






const Layout = () => {
  const location = useLocation();

  const [notification, setNotification] = useState({
    visible: false,
    message: "",
    type: "info",
  });

  useEffect(() => {
    const handleNotification = (event) => {
      const {
        message = "Something happened.",
        type = "info",
        duration = 4000,
      } = event.detail || {};

      setNotification({
        visible: true,
        message,
        type,
      });

      const timer = window.setTimeout(() => {
        setNotification((current) => ({
          ...current,
          visible: false,
        }));
      }, duration);

      return () => window.clearTimeout(timer);
    };

    window.addEventListener("show-top-notification", handleNotification);

    return () => {
      window.removeEventListener(
        "show-top-notification",
        handleNotification
      );
    };
  }, []);

  const hideLayout =
  ['/Register', '/Login', '/admin/login'].includes(location.pathname) ||
  location.pathname.startsWith('/camera') ||
  location.pathname.startsWith('/admin');

 return (
  <>
    {!hideLayout && <Navbar />}

    {notification.visible && (
      <div
        className={`global-top-notification notification-${notification.type}`}
        role="status"
      >
        <span className="global-top-notification-icon">
          {notification.type === "success" && "✓"}
          {notification.type === "warning" && "!"}
          {notification.type === "error" && "×"}
          {notification.type === "info" && "i"}
        </span>

        <span className="global-top-notification-message">
          {notification.message}
        </span>

        <button
          type="button"
          className="global-top-notification-close"
          onClick={() =>
            setNotification((current) => ({
              ...current,
              visible: false,
            }))
          }
          aria-label="Close notification"
        >
          ×
        </button>
      </div>
    )}

    <Routes>
        <Route path='/' element={<Home/>}/>
        <Route path='/Home' element={<Home/>}/>
        <Route path='/Feature' element={<Feature/>}/>
        <Route path='/FQA' element={<FQA/>}/>
        <Route path="/Dashboard" element={ <ProtectedRoute> <Dashboard /> </ProtectedRoute>} />
        <Route path='/Register' element={<Register/>}/>
        <Route path='/Login' element={<Login/>}/>
        <Route path="/CompleteProfile" element={ <ProtectedRoute> <CompleteProfile /> </ProtectedRoute>} />
        <Route path="/create-deal"element={<VerifiedRoute><DealHub /></VerifiedRoute> } />      
        <Route path="/camera/:type" element={ <ProtectedRoute> <CameraPage /> </ProtectedRoute> } />
        <Route path="/camera/:type/preview" element={ <ProtectedRoute> <PreviewPage /> </ProtectedRoute> }/>
        <Route path="/admin/login" element={<AdminLogin />}/>
        <Route path="/admin/dashboard" element={<ProtectedAdminRoute><AdminDashboard /></ProtectedAdminRoute>}/>
        <Route path="/admin/users" element={<ProtectedAdminRoute><UsersPage /></ProtectedAdminRoute>}/>
        <Route path="/transactions" element={ <VerifiedRoute> <TransactionHistory /> </VerifiedRoute> }/>
        <Route path="/transaction/:transactionId" element={<VerifiedRoute> <TransactionDetails /> </VerifiedRoute> }/>
        <Route path="/deal/:roomCode" element={ <VerifiedRoute> <DealWorkspace /> </VerifiedRoute> }/>
        <Route path="/admin/verification" element={<ProtectedAdminRoute><Verification /></ProtectedAdminRoute>}/>
        <Route path="/admin/faq" element={<ProtectedAdminRoute><FaqPage /></ProtectedAdminRoute>}/>
        <Route path="/deals" element={ <VerifiedRoute> <DealHub />  </VerifiedRoute> } />

<Route path="/privacy-policy" element={<PrivacyPolicy />} />
<Route path="/terms-of-service" element={<TermsOfService />} />
<Route path="/status" element={<Status />} />

        <Route path="/settings" element={ <ProtectedRoute> <Settings /> </ProtectedRoute> } />

        {/* Temporary Bakong testing page */}
      {/* <Route
          path="/bakong-test"
          element={<BakongTest />}
        /> */}

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