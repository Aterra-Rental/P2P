import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaUserShield, FaEye, FaEyeSlash } from "react-icons/fa";
import {API_URL} from "../../../lib/api";
import "./AdminLogin.css";

const AdminLogin = () => {

    const navigate = useNavigate();

    const [email, setEmail] = useState("");

    const [password, setPassword] = useState("");

    const [showPassword, setShowPassword] = useState(false);

    const [loading, setLoading] = useState(false);

    const [error, setError] = useState("");

    const handleLogin = async (e) => {

        e.preventDefault();

        setError("");

        setLoading(true);

        try {

            const response = await fetch(
                `${API_URL}/api/admin/login`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        email,
                        password
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {

                setError(data.message || "Login failed.");

                return;

            }

            localStorage.setItem(
                "admin",
                JSON.stringify({
                    admin_id: data.admin_id,
                    email: data.email
                })
            );

            navigate("/admin/dashboard");

        }

        catch (error) {

            console.error(error);

            setError("Unable to connect to server.");

        }

        finally {

            setLoading(false);

        }

    };

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

                <form onSubmit={handleLogin}>

                    <div className="input-group">

                        <label>Email</label>

                        <input

                            type="email"

                            placeholder="Enter your email"

                            value={email}

                            onChange={(e) =>
                                setEmail(e.target.value)
                            }

                            required

                        />

                    </div>

                    <div className="input-group">

    <label>Password</label>

    <div className="password-box">
        <input
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
        />

        <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword(!showPassword)}
        >
            {showPassword ? <FaEyeSlash /> : <FaEye />}
        </button>

    </div>

</div>

                    {

                        error && (

                            <div className="login-error">

                                {error}

                            </div>

                        )

                    }

                    <button

                        type="submit"

                        className="login-button"

                        disabled={loading}

                    >

                        {

                            loading
                                ? "Signing In..."
                                : "Login"

                        }

                    </button>

                </form>

            </div>

        </div>

    );

};

export default AdminLogin;