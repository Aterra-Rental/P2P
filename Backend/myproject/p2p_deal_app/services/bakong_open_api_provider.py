import requests

from config import Config


PAYMENT_PROVIDER_NAME = "Bakong"
IS_MOCK_PAYMENT_PROVIDER = False

NODE_SERVICE_URL = Config.BAKONG_NODE_SERVICE_URL
BAKONG_API_BASE_URL = Config.BAKONG_API_BASE_URL
BAKONG_API_TOKEN = str(
    Config.BAKONG_API_TOKEN or ""
).strip()


class PaymentProviderError(Exception):
    """Raised when real Bakong processing cannot continue."""

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
            raise PaymentProviderError(
                "The KHQR generator returned invalid data."
            ) from error

        if not response.ok or not data.get("success"):
            raise PaymentProviderError(
                data.get(
                    "message",
                    "KHQR generation failed.",
                )
            )

        qr_payload = data.get("qr")
        qr_md5 = data.get("md5")
        expires_at = data.get("expiresAt")
        receiver_account = data.get("receiverAccount")
        currency = str(
            data.get("currency", "")
        ).strip().upper()

        if (
            not qr_payload
            or not qr_md5
            or not expires_at
            or not receiver_account
        ):
            raise PaymentProviderError(
                "The KHQR generator returned incomplete data."
            )

        if currency != "USD":
            raise PaymentProviderError(
                "Only USD KHQR payments are supported."
            )

        return {
            "qr": qr_payload,
            "md5": qr_md5,
            "expires_at": expires_at,
            "currency": "USD",
            "receiver_account": receiver_account,
            "provider": PAYMENT_PROVIDER_NAME,
            "mock": False,
        }

    except requests.exceptions.Timeout as error:
        raise PaymentProviderError(
            "KHQR generation timed out."
        ) from error

    except requests.exceptions.ConnectionError as error:
        raise PaymentProviderError(
            "Cannot connect to the local KHQR generator."
        ) from error

    except requests.exceptions.RequestException as error:
        raise PaymentProviderError(
            f"KHQR generation failed: {error}"
        ) from error


def verification_is_configured():
    return bool(
        BAKONG_API_BASE_URL
        and BAKONG_API_TOKEN
    )


def verify_transaction_by_md5(
    md5,
    *,
    expected_amount,
    expected_currency,
    expected_receiver,
):
    clean_md5 = str(md5 or "").strip()
    currency = str(
        expected_currency or ""
    ).strip().upper()
    receiver = str(expected_receiver or "").strip()

    if not clean_md5:
        raise PaymentProviderError(
            "A KHQR MD5 value is required."
        )

    if currency != "USD":
        raise PaymentProviderError(
            "Only USD Bakong payments are supported."
        )

    if not expected_amount or not receiver:
        raise PaymentProviderError(
            "Expected payment details are incomplete."
        )

    if not BAKONG_API_TOKEN:
        raise PaymentProviderError(
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
                "md5": clean_md5,
            },
            timeout=10,
        )

        try:
            data = response.json()
        except ValueError as error:
            raise PaymentProviderError(
                "Bakong verification returned invalid JSON."
            ) from error

        if response.status_code in {401, 403}:
            raise PaymentProviderError(
                "Bakong rejected the API credentials."
            )

        if not response.ok:
            raise PaymentProviderError(
                data.get("responseMessage")
                or data.get("message")
                or (
                    "Bakong verification failed "
                    f"({response.status_code})."
                )
            )

        response_code = data.get("responseCode")
        transaction = data.get("data")

        if str(response_code) == "0" and transaction:
            return {
                "verified": True,
                "transaction": transaction,
            }

        if str(response_code) == "1" and not transaction:
            return {
                "verified": False,
                "transaction": None,
            }

        raise PaymentProviderError(
            data.get("responseMessage")
            or data.get("message")
            or "Bakong returned an unknown verification result."
        )

    except requests.exceptions.Timeout as error:
        raise PaymentProviderError(
            "Bakong verification timed out."
        ) from error

    except requests.exceptions.ConnectionError as error:
        raise PaymentProviderError(
            "Cannot connect to the Bakong Open API."
        ) from error

    except requests.exceptions.RequestException as error:
        raise PaymentProviderError(
            f"Bakong verification failed: {error}"
        ) from error