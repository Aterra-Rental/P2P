import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./CameraModal.css";

const CameraPage = () => {

    const navigate = useNavigate();
    const { type } = useParams();

    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    const [stream, setStream] = useState(null);

    useEffect(() => {

        const startCamera = async () => {

            try {

                const mediaStream =
                    await navigator.mediaDevices.getUserMedia({

                        video: {
                            facingMode: "user"
                        }

                    });

                setStream(mediaStream);

                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }

            } catch (err) {

                console.error(err);
                alert("Unable to access camera.");

                navigate("/Dashboard");

            }

        };

        startCamera();

        return () => {

            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }

        };

    }, []);

    const captureImage = () => {

        const video = videoRef.current;
        const canvas = canvasRef.current;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext("2d");

        ctx.drawImage(
            video,
            0,
            0,
            canvas.width,
            canvas.height
        );

        canvas.toBlob(blob => {

            if (!blob) return;

            const image = URL.createObjectURL(blob);

            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }

            navigate(`/camera/${type}/preview`, {

                state: {

                    image,
                    file: blob,
                    type

                }

            });

        }, "image/jpeg", 0.95);

    };

    const cancelCamera = () => {

        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }

        navigate("/Dashboard");

    };

    return (

        <div className="camera-page">

            <div className="camera-container">

                <h2>Take Profile Picture</h2>

                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                />

                <canvas
                    ref={canvasRef}
                    style={{ display: "none" }}
                />

                <div className="camera-buttons">

                    <button
                        className="capture-btn"
                        onClick={captureImage}
                    >
                        Capture
                    </button>

                    <button
                        className="cancel-btn"
                        onClick={cancelCamera}
                    >
                        Cancel
                    </button>

                </div>

            </div>

        </div>

    );

};

export default CameraPage;