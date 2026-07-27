const {
    BakongKHQR,
    MerchantInfo,
    khqrData
} = require("bakong-khqr");

function generateQR(amount, roomCode) {

    const expireMinutes = Number(process.env.QR_EXPIRE_MINUTES || 10);

    const expirationTimestamp =
    Date.now() + expireMinutes * 60 * 1000;

    const merchant = new MerchantInfo(
        process.env.MERCHANT_ACCOUNT,
        process.env.MERCHANT_NAME,
        process.env.MERCHANT_CITY,
        process.env.MERCHANT_ID,
        "Bakong",
        {
            currency: khqrData.currency.usd,
            amount: Number(amount),
            billNumber: roomCode,
            storeLabel: "P2P",
            terminalLabel: "WEB",
            expirationTimestamp
        }
    );

    const khqr = new BakongKHQR();

    return khqr.generateMerchant(merchant);
}

module.exports = {
    generateQR
};