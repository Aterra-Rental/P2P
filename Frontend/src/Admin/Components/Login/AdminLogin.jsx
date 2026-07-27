import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaUserShield, FaEye, FaEyeSlash } from "react-icons/fa";
import API_URL from "../../../lib/api";
import "./AdminLogin.css";

const AdminLogin = () => {

    const navigate = useNavigate();

    const [email, setEmail] = useState("");

    const [password, setPassword] = useState("");

    const [showPassword, setShowPassword] = useState(false);

    const [loading, setLoading] = useState(false);

    const [error, setError] = useState("");

    

    return (

        <div className="admin-login-page">

            <div className="admin-login-card">

                <div className="admin-logo">

                    <FaUserShield />

                </div>

                <h1>P2P Deal</h1>

                <h2>Administrator Portal</h2>

                <p className="admin-description">
                    Manage users, identity verification and escrow transactions.
                </p>

                

            </div>

        </div>

    );

};

export default AdminLogin;