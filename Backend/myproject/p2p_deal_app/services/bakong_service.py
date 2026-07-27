import requests

NODE_SERVICE_URL = "http://localhost:3001"


class BakongServiceError(Exception):
    """Raised when the Bakong service returns an error."""
    pass


def generate_qr(amount, room_code, description):
    payload = {
        "amount": float(amount),
        "roomCode": room_code,
        "description": description
    }

    try:
        response = requests.post(
            f"{NODE_SERVICE_URL}/api/bakong/generate",
            json=payload,
            timeout=10
        )

        response.raise_for_status()

        data = response.json()

        if not data.get("success"):
            raise BakongServiceError(
                data.get("message", "QR generation failed.")
            )

        return data

    except requests.exceptions.RequestException as e:
        raise BakongServiceError(str(e))