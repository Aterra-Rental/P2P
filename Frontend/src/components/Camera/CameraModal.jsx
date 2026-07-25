// import { useEffect, useRef, useState } from "react";
// import "./CameraModal.css";
// import { useNavigate, useParams } from "react-router-dom";
// import { useLocation, Navigate } from "react-router-dom";

// export default function CameraPage() {
//     const videoRef = useRef(null);
//     const canvasRef = useRef(null);
//     const { type, side } = useParams();
//     const [stream, setStream] = useState(null);
//     const navigate = useNavigate();
    
//     useEffect(() => {
        

//         async function startCamera() {
//             try {
//                 const mediaStream = await navigator.mediaDevices.getUserMedia({
//                     video: {
//                         facingMode: "user",
//                     },
//                 });

//                 setStream(mediaStream);

//                 if (videoRef.current) {
//                     videoRef.current.srcObject = mediaStream;
//                 }

//             } catch (err) {
//                 alert("Unable to access camera.");
//                 navigate(-1);
//             }
//         }

//         startCamera();

//         return () => {
//             if (stream) {
//                 stream.getTracks().forEach(track => track.stop());
//             }
//         };

//     }, []);

//     const captureImage = () => {

//         const video = videoRef.current;
//         const canvas = canvasRef.current;

//         canvas.width = video.videoWidth;
//         canvas.height = video.videoHeight;

//         const ctx = canvas.getContext("2d");

//         ctx.drawImage(video, 0, 0);

//         canvas.toBlob((blob) => {

//     if (stream) {
//         stream.getTracks().forEach(track => track.stop());
//     }

//     // If taking National ID
//     if (type === "id") {

//         const capturedFile = new File(
//             [blob],
//             `${side}.jpg`,
//             {
//                 type: "image/jpeg",
//             }
//         );

//         navigate("/CompleteProfile", {
//             state: {
//                 side,
//                 capturedFile,
//             },
//             replace: true,
//         });

//         return;
//     }

//     // Otherwise it's a profile picture
//     const image = URL.createObjectURL(blob);

//     navigate("/camera/profile/preview", {
//         state: {
//             image,
//             file: blob,
//             type: "profile",
//         },
//     });

// }, "image/jpeg", 0.9);
// };


//     return (

//         <div className="camera-page">
//             <div className="camera-container">

//                 <h2>Take Profile Picture</h2>

//                 <video
//                     ref={videoRef}
//                     autoPlay
//                     playsInline
//                 />

//                 <canvas
//                     ref={canvasRef}
//                     style={{ display: "none" }}
//                 />

//                 <div className="camera-buttons">

//                     <button className="capture-btn" onClick={captureImage}>
//                         Capture
//                     </button>

//                     <button
//                         className="cancel"
//                         onClick={() => {

//                             if (stream) {
//                                 stream.getTracks().forEach(track => track.stop());
//                             }

//                             navigate(-1);

//                         }}
//                     >
//                         Cancel
//                     </button>

//                 </div>

//             </div>
            

//         </div>

//     );
// };
// 
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