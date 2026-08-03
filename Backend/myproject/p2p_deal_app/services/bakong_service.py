from config import Config


PAYMENT_VERIFICATION_MODE = (
    Config.PAYMENT_VERIFICATION_MODE
)


if PAYMENT_VERIFICATION_MODE == "mock":
    from services.mock_payment_provider import (
        IS_MOCK_PAYMENT_PROVIDER,
        PAYMENT_PROVIDER_NAME,
        PaymentProviderError,
        generate_qr,
        verification_is_configured,
        verify_transaction_by_md5,
    )
elif PAYMENT_VERIFICATION_MODE == "bakong":
    from services.bakong_open_api_provider import (
        IS_MOCK_PAYMENT_PROVIDER,
        PAYMENT_PROVIDER_NAME,
        PaymentProviderError,
        generate_qr,
        verification_is_configured,
        verify_transaction_by_md5,
    )
else:
    raise RuntimeError(
        "Unsupported payment verification mode."
    )


# Preserve the existing route exception name while providers
# use a neutral internal exception name.
BakongServiceError = PaymentProviderError


def get_payment_provider_name():
    return PAYMENT_PROVIDER_NAME


def is_mock_payment_provider():
    return IS_MOCK_PAYMENT_PROVIDER