const express = require("express");
const router = express.Router();

const { generateQR } = require("../services/khqrService");

router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Bakong Service is running",
  });
});

router.post("/generate-qr", (req, res) => {
  try {
    const { amount, roomCode } = req.body;

    const numericAmount = Number(amount);

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0 ||
      !roomCode
    ) {
      return res.status(400).json({
        success: false,
        message:
          "A valid amount and roomCode are required.",
      });
    }

    const result = generateQR(
      numericAmount,
      String(roomCode)
    );

    if (
      result?.status?.code !== 0 ||
      !result?.data?.qr ||
      !result?.data?.md5
    ) {
      return res.status(500).json({
        success: false,
        message:
          result?.status?.message ||
          "KHQR generation failed.",
      });
    }

    const expireMinutes = Number(
      process.env.QR_EXPIRE_MINUTES || 10
    );

    return res.json({
        success: true,
        qr: result.data.qr,
        md5: result.data.md5,
        expiresAt: new Date(
            Date.now() + expireMinutes * 60 * 1000
        ).toISOString(),
        currency: "USD",
        receiverAccount: process.env.MERCHANT_ACCOUNT,
    });
  } catch (error) {
    console.error("KHQR generation failed:", error);

    return res.status(500).json({
      success: false,
      message:
        error.message || "KHQR generation failed.",
    });
  }
});

module.exports = router;