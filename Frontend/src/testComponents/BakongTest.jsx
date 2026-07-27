import React, { useState } from "react";
import QRCode from "react-qr-code";
import {
  BakongKHQR,
  MerchantInfo,
  khqrData,
} from "bakong-khqr";

const BakongTest = () => {
  const [qr, setQr] = useState("");
  const [md5, setMd5] = useState("");

  const generateQR = () => {
    try {
      const expirationTimestamp = Date.now() + 10 * 60 * 1000;

      const merchant = new MerchantInfo(
        "sokheng_sour@bkrt",
        "P2P Escrow",
        "Phnom Penh",
        "P2P001",
        "Bakong",
        {
          currency: khqrData.currency.usd,
          amount: 1,
          billNumber: "TEST-001",
          storeLabel: "P2P",
          terminalLabel: "WEB",
          expirationTimestamp,
        }
      );

      const khqr = new BakongKHQR();

      const result = khqr.generateMerchant(merchant);

      console.log(result);

      setQr(result.data.qr);
      setMd5(result.data.md5);
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h2>Bakong KHQR Test</h2>

      <button onClick={generateQR}>
        Generate QR
      </button>

      {qr && (
        <>
          <div style={{ marginTop: 30 }}>
            <QRCode value={qr} size={250} />
          </div>

          <p>
            <b>MD5:</b> {md5}
          </p>
        </>
      )}
    </div>
  );
};

export default BakongTest;