
import { useNavigate } from 'react-router-dom' 
// 1. IMPORT GRAPH UTILITIES
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts'
import '../Global.css'
import './Home.css'
import Footer from '../../Router/Footer'
const Home = () => {
  const navigate = useNavigate();

  // Handler for Create Deals button
  const handleCreateDealClick = () => {
    navigate('/create-deal'); 
  };

  // New handler for How It Works button targeting the /Feature route
  const handleHowItWorksClick = () => {
    navigate('/Feature');
  };

  // 2. KHMER CURRENCY FORMATTER FUNCTION FOR THE GRAPH AXIS
  const formatKhmerCurrency = (value) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M ៛`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K ៛`;
    return `${value} ៛`;
  };

  return (
    <div className='Global'>
 
      
        <Footer />
      </div>
  )
}

export default Home