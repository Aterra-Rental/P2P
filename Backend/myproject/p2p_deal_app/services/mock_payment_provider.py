import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation


PAYMENT_PROVIDER_NAME = "Mock"
IS_MOCK_PAYMENT_PROVIDER = True
MOCK_RECEIVER_ACCOUNT = "p2p_demo_receiver@mock"
QR_LIFETIME_MINUTES = 10


class PaymentProviderError(Exception):
    """Raised when mock payment processing cannot continue."""

    pass


def _normalize_amount(amount):
    try:
        normalized_amount = Decimal(str(amount)).quantize(
            Decimal("0.01")
        )
    except (InvalidOperation, TypeError, ValueError) as error:
        raise PaymentProviderError(
            "The demo payment amount is invalid."
        ) from error

    if normalized_amount <= 0:
        raise PaymentProviderError(
            "The demo payment amount must be greater than zero."
        )

    return normalized_amount


def generate_qr(amount, room_code):
    normalized_amount = _normalize_amount(amount)
    clean_room_code = str(room_code or "").strip()

    if not clean_room_code:
        raise PaymentProviderError(
            "A room code is required to generate a demo QR."
        )

    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=QR_LIFETIME_MINUTES
    )
    nonce = secrets.token_hex(12)

    # This payload intentionally cannot receive real bank funds.
    qr_payload = "|".join([
        "P2P_ESCROW_DEMO",
        clean_room_code,
        str(normalized_amount),
        "USD",
        MOCK_RECEIVER_ACCOUNT,
        nonce,
    ])

    qr_md5 = hashlib.md5(
        qr_payload.encode("utf-8")
    ).hexdigest()

    return {
        "qr": qr_payload,
        "md5": qr_md5,
        "expires_at": expires_at.isoformat(),
        "currency": "USD",
        "receiver_account": MOCK_RECEIVER_ACCOUNT,
        "provider": PAYMENT_PROVIDER_NAME,
        "mock": True,
    }


def verification_is_configured():
    return True


def verify_transaction_by_md5(
    md5,
    *,
    expected_amount,
    expected_currency,
    expected_receiver,
):
    clean_md5 = str(md5 or "").strip()

    if not clean_md5:
        raise PaymentProviderError(
            "A demo payment reference is required."
        )

    normalized_amount = _normalize_amount(expected_amount)
    currency = str(
        expected_currency or ""
    ).strip().upper()
    receiver = str(expected_receiver or "").strip()

    if currency != "USD":
        raise PaymentProviderError(
            "The demo payment provider supports USD only."
        )

    if not receiver:
        raise PaymentProviderError(
            "The expected payment receiver is missing."
        )

    transaction_hash = hashlib.sha256(
        f"mock-payment:{clean_md5}".encode("utf-8")
    ).hexdigest()

    return {
        "verified": True,
        "transaction": {
            "hash": transaction_hash,
            "fromAccountId": "demo_buyer@mock",
            "toAccountId": receiver,
            "currency": "USD",
            "amount": str(normalized_amount),
            "description": (
                "University demonstration payment"
            ),
            "mock": True,
        },
    }