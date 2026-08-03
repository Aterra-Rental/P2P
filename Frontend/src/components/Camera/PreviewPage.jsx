import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import '../Camera/PreviewPage.css';

export default function PreviewPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(false);
    const image = location.state?.image;
    const type = location.state?.type;
    const file = location.state?.file;
    const side = location.state?.side;

    if (!image) {
        return (
            <div>
                <h2>No image found.</h2>
                <button onClick={() => navigate(-1)}>Go Back</button>
            </div>
        );
    }

    const uploadPhoto = async () => {
        if (!file) {
            alert("No image to upload.");
            return;
        }

        // National ID camera
        if (type === "id") {
            const capturedFile = new File(
                [file],
                `${side}.jpg`,
                { type: "image/jpeg" }
            );

            navigate("/CompleteProfile", {
                state: {
                    capturedFile,
                    side,
                },
                replace: true,
            });
            return;
        }

        // Profile picture upload
        try {
            setLoading(true);

            // 💡 Fix: Robust fallback for getting the user ID
            let userId = localStorage.getItem("user_id") || localStorage.getItem("id");
            if (!userId) {
                try {
                    const storedUser = JSON.parse(localStorage.getItem("user"));
                    userId = storedUser?.id || storedUser?.user_id;
                } catch (e) {
                    // Ignore parse errors
                }
            }

            if (!userId) {
                alert("User ID not found. Please log in again.");
                navigate("/Login");
                return;
            }

            const formData = new FormData();
            formData.append("profile_picture", file, "profile.jpg");

            // 💡 Fix: Changed port from 5000 to 8000 to match your backend
            const response = await fetch(`http://127.0.0.1:8000/api/profile/${userId}/picture`, {
                method: "PUT",
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.message || data.error || "Upload failed.");
                return;
            }

            navigate("/Dashboard", {
                replace: true,
            });

        } catch (err) {
            console.error(err);
            alert("Something went wrong.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="preview-page">
            <div className="preview-card">
                <h2>Preview</h2>
                <img
                    src={image}
                    alt="Preview"
                    className="preview-image"
                />
                <div className="preview-actions">
                    <button
                        className="retake-btn"
                        onClick={() =>
                            type === "profile"
                                ? navigate("/camera/profile")
                                : navigate(`/camera/id/${side}`)
                        }
                    >
                        Retake
                    </button>
                    <button
                        className="cancel-btn"
                        onClick={() =>
                            type === "profile"
                                ? navigate("/Dashboard")
                                : navigate("/CompleteProfile")
                        }
                    >
                        Cancel
                    </button>
                </div>
                <button
                    className="use-btn"
                    onClick={uploadPhoto}
                    disabled={loading}
                >
                    {loading ? "Uploading..." : "Use This Photo"}
                </button>
            </div>
        </div>
    );
}