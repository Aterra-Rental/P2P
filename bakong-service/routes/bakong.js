const express = require("express");
const router = express.Router();

const { generateQR } = require("../services/khqrService");

router.get("/health", (req, res) => {
    res.json({
        success: true,
        message: "Bakong Service is running"
    });
});

router.post("/generate-qr", (req, res) => {

    try {

        const { amount, roomCode } = req.body;

        if (!amount || !roomCode) {
            return res.status(400).json({
                success: false,
                message: "amount and roomCode are required"
            });
        }

        const result = generateQR(amount, roomCode);

        return res.json(result);

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            success: false,
            message: err.message
        });

    }

});

module.exports = router;