import React, { useState } from "react";
import QRCode from "react-qr-code";

import {
  BakongKHQR,
  IndividualInfo,
  khqrData,
} from "bakong-khqr";

export default function BakongTest() {
  const [qr, setQr] = useState("");
  const [md5, setMd5] = useState("");

  const generateQR = () => {
    const bakong = new BakongKHQR();

    const individual = new IndividualInfo(
      "YOUR_BAKONG_ACCOUNT",
      khqrData.currency.usd,
      "P2P Escrow",
      "Phnom Penh"
    );

    const response = bakong.generateIndividual(individual);

    console.log(response);

    if (response?.data) {
      setQr(response.data.qr);
      setMd5(response.data.md5);
    }
  };

  return (
    <div style={{ padding: 30 }}>
      <h1>Bakong SDK Test</h1>

      <button onClick={generateQR}>
        Generate QR
      </button>

      {qr && (
        <>
          <div style={{ marginTop: 20 }}>
            <QRCode value={qr} size={220} />
          </div>

          <p>
            <strong>MD5</strong>
          </p>

          <code>{md5}</code>

          <p>
            <strong>KHQR String</strong>
          </p>

          <textarea
            rows={10}
            cols={90}
            readOnly
            value={qr}
          />
        </>
      )}
    </div>
  );
}