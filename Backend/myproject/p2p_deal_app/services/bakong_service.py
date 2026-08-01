import requests

from config import Config


NODE_SERVICE_URL = Config.BAKONG_NODE_SERVICE_URL
BAKONG_API_BASE_URL = Config.BAKONG_API_BASE_URL
BAKONG_API_TOKEN = Config.BAKONG_API_TOKEN





class BakongServiceError(Exception):
    """Raised when the local Bakong service returns an error."""

    pass


def generate_qr(amount, room_code):
    payload = {
        "amount": float(amount),
        "roomCode": str(room_code),
    }

    try:
        response = requests.post(
            f"{NODE_SERVICE_URL}/api/bakong/generate-qr",
            json=payload,
            timeout=10,
        )

        try:
            data = response.json()
        except ValueError as error:
            raise BakongServiceError(
                "Bakong service returned an invalid response."
            ) from error

        if not response.ok or not data.get("success"):
            raise BakongServiceError(
                data.get("message", "QR generation failed.")
            )

        if not data.get("qr") or not data.get("md5"):
            raise BakongServiceError(
                "Bakong service did not return QR and MD5 data."
            )

        receiver_account = data.get("receiverAccount")
        currency = data.get("currency")

        if not receiver_account or currency not in ["USD", "KHR"]:
            raise BakongServiceError(
                "Bakong service returned incomplete payment details."
            )

        return {
            "qr": data["qr"],
            "md5": data["md5"],
            "expires_at": data.get("expiresAt"),
            "currency": currency,
            "receiver_account": receiver_account,
        }

    except requests.exceptions.Timeout as error:
        raise BakongServiceError(
            "Bakong QR generation timed out."
        ) from error

    except requests.exceptions.ConnectionError as error:
        raise BakongServiceError(
            "Cannot connect to the local Bakong service."
        ) from error

    except requests.exceptions.RequestException as error:
        raise BakongServiceError(
            f"Bakong service request failed: {error}"
        ) from error


def verification_is_configured():
    return bool(
        BAKONG_API_TOKEN
        and BAKONG_API_BASE_URL
    )
def verify_transaction_by_md5(md5):
    if not md5:
        raise BakongServiceError(
            "A KHQR MD5 value is required."
        )

    if not BAKONG_API_TOKEN:
        raise BakongServiceError(
            "BAKONG_API_TOKEN is not configured."
        )

    try:
        response = requests.post(
            (
                f"{BAKONG_API_BASE_URL}"
                "/v1/check_transaction_by_md5"
            ),
            headers={
                "Authorization": (
                    f"Bearer {BAKONG_API_TOKEN}"
                ),
                "Content-Type": "application/json",
            },
            json={
                "md5": str(md5),
            },
            timeout=10,
        )

        try:
            data = response.json()
        except ValueError as error:
            raise BakongServiceError(
                "Bakong verification returned invalid JSON."
            ) from error

        if response.status_code == 401:
            raise BakongServiceError(
                "Bakong rejected the access token."
            )

        if not response.ok:
            raise BakongServiceError(
                data.get("responseMessage")
                or data.get("message")
                or (
                    "Bakong verification failed "
                    f"({response.status_code})."
                )
            )

        response_code = data.get("responseCode")
        transaction = data.get("data")

        if response_code == 0 and transaction:
            return {
                "verified": True,
                "transaction": transaction,
            }

        if response_code == 1 and not transaction:
            return {
                "verified": False,
                "transaction": None,
            }

        raise BakongServiceError(
            data.get("responseMessage")
            or data.get("message")
            or "Bakong returned an unknown verification result."
        )

    except requests.exceptions.Timeout as error:
        raise BakongServiceError(
            "Bakong verification timed out."
        ) from error

    except requests.exceptions.ConnectionError as error:
        raise BakongServiceError(
            "Cannot connect to the Bakong verification API."
        ) from error

    except requests.exceptions.RequestException as error:
        raise BakongServiceError(
            f"Bakong verification request failed: {error}"
        ) from error