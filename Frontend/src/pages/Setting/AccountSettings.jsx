import React, { useEffect, useState } from "react";
import "./AccountSettings.css";
import { useNavigate } from "react-router-dom";
import {
    User,
    ShieldCheck,
    FileText,
    MapPin,
    Save,
    Settings,
} from "lucide-react";

const API_URL = "http://localhost:8000/api";

const AccountSettings = () => {
    const userId = localStorage.getItem("user_id");
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);

    const [form, setForm] = useState({
        firstname: "",
        lastname: "",
        username: "",
        bio: "",
        address: "",
        verify_status: "",
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const response = await fetch(`${API_URL}/profile/${userId}`);
            const data = await response.json();

            if (response.ok) {
                setForm({
                    firstname: data.firstname || "",
                    lastname: data.lastname || "",
                    username: data.username || "",
                    bio: data.bio || "",
                    address: data.address || "",
                    verify_status: data.verify_status || "",
                });
            } else {
                alert(data.error || "Failed to load profile.");
            }
        } catch (err) {
            console.error(err);
            alert("Unable to connect to server.");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const response = await fetch(`${API_URL}/profile/${userId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    username: form.username,
                    bio: form.bio,
                    address: form.address,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                alert("Profile updated successfully.");
                navigate("/Dashboard");
            } else {
                alert(data.error || "Update failed.");
            }
        } catch (err) {
            console.error(err);
            alert("Server connection failed.");
        }
    };

    if (loading) {
        return <h4>Loading...</h4>;
    }

    return (
        <div className="account-settings">

            <div className="settings-hero">

                <div className="hero-icon">
                    <Settings size={32} />
                </div>

                <div>
                    <h2>Account Settings</h2>
                    <p>
                        Manage your account information and personalise
                        your profile.
                    </p>
                </div>

            </div>

            <form onSubmit={handleSubmit}>

                {/* =============================
                    Personal Information
                ============================== */}

                <div className="settings-card">

                    <div className="card-header">

                        <User size={22} />

                        <div>
                            <h3>Personal Information</h3>
                            <p>
                                Basic information about your account.
                            </p>
                        </div>

                    </div>

                    <div className="readonly-group">

                        <div className="form-group">
                            <label>First Name</label>

                            <input
                                type="text"
                                value={form.firstname}
                                disabled
                            />
                        </div>

                        <div className="form-group">
                            <label>Last Name</label>

                            <input
                                type="text"
                                value={form.lastname}
                                disabled
                            />
                        </div>

                    </div>

                    <div className="form-group">

                        <label>Username</label>

                        <input
                            type="text"
                            name="username"
                            value={form.username}
                            onChange={handleChange}
                            placeholder="Choose a username"
                        />

                    </div>

                </div>
                                {/* =============================
                    Verification
                ============================== */}

                <div className="settings-card">

                    <div className="card-header">

                        <ShieldCheck size={22} />

                        <div>
                            <h3>Verification Status</h3>
                            <p>
                                Your identity verification status.
                            </p>
                        </div>

                    </div>

                    <div
                        className={`verification-badge ${
                            form.verify_status.toLowerCase() === "verified"
                                ? "verified"
                                : form.verify_status.toLowerCase() === "pending"
                                ? "pending"
                                : "rejected"
                        }`}
                    >
                        <ShieldCheck size={18} />
                        {form.verify_status}
                    </div>

                </div>

                {/* =============================
                    About You
                ============================== */}

                <div className="settings-card">

                    <div className="card-header">

                        <FileText size={22} />

                        <div>
                            <h3>About You</h3>
                            <p>
                                Tell other users more about yourself.
                            </p>
                        </div>

                    </div>

                    <div className="form-group">

                        <label>Bio</label>

                        <textarea
                            rows="5"
                            name="bio"
                            value={form.bio}
                            onChange={handleChange}
                            placeholder="Write something about yourself..."
                        />

                    </div>

                    <div className="form-group">

                        <label>

                            <MapPin
                                size={16}
                                style={{
                                    marginRight: "6px",
                                    verticalAlign: "middle",
                                }}
                            />

                            Address

                        </label>

                        <textarea
                            rows="3"
                            name="address"
                            value={form.address}
                            onChange={handleChange}
                            placeholder="Enter your address"
                        />

                    </div>

                </div>

                {/* =============================
                    Save Button
                ============================== */}

                <div className="save-section">

                    <button
                        type="submit"
                        className="save-btn"
                    >
                        <Save size={18} />
                        Save Changes
                    </button>

                </div>

            </form>

        </div>
    );
};

export default AccountSettings;