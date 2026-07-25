
import { useEffect, useRef, useState } from "react";
import "./CameraModal.css";

export default function CameraModal({ onCapture, onClose }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    const [stream, setStream] = useState(null);

    useEffect(() => {

        async function startCamera() {
            try {

                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: "environment"
                    }
                });

                setStream(mediaStream);

                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }

            } catch (err) {
                alert("Unable to access camera.");
                onClose();
            }
        }

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

        ctx.drawImage(video, 0, 0);

        canvas.toBlob((blob) => {

            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }

            const file = new File(
                [blob],
                "capture.jpg",
                {
                    type: "image/jpeg"
                }
            );

            onCapture(file);

        }, "image/jpeg", 0.9);

    };

    return (

        <div className="camera-overlay">

            <div className="camera-container">

                <h2>Take Photo</h2>

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
                        className="cancel"
                        onClick={() => {

                            if (stream) {
                                stream.getTracks().forEach(track => track.stop());
                            }

                            onClose();

                        }}
                    >
                        Cancel
                    </button>

                </div>

            </div>

        </div>

    );
}