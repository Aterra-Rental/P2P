from decimal import Decimal, InvalidOperation


class WalletError(Exception):
    """Expected wallet operation failure."""


def to_money(value, field_name="amount"):
    try:
        money = Decimal(str(value)).quantize(
            Decimal("0.01")
        )
    except (InvalidOperation, TypeError, ValueError) as error:
        raise WalletError(
            f"{field_name} must be a valid amount."
        ) from error

    if money < 0:
        raise WalletError(
            f"{field_name} cannot be negative."
        )

    return money


def get_or_create_locked_wallet(cursor, user_id):
    """
    Create a wallet when missing and lock it until the
    surrounding database transaction finishes.
    """
    cursor.execute(
        """
        INSERT INTO user_wallet (user_id)
        VALUES (%s)
        ON CONFLICT (user_id) DO NOTHING
        """,
        (user_id,),
    )

    cursor.execute(
        """
        SELECT
            wallet_id,
            available_balance,
            pending_balance,
            total_received,
            total_withdrawn
        FROM user_wallet
        WHERE user_id = %s
        FOR UPDATE
        """,
        (user_id,),
    )

    wallet = cursor.fetchone()

    if not wallet:
        raise WalletError(
            "Unable to load the user's wallet."
        )

    return {
        "wallet_id": wallet[0],
        "available_balance": to_money(
            wallet[1],
            "available balance",
        ),
        "pending_balance": to_money(
            wallet[2],
            "pending balance",
        ),
        "total_received": to_money(
            wallet[3],
            "total received",
        ),
        "total_withdrawn": to_money(
            wallet[4],
            "total withdrawn",
        ),
    }


def hold_wallet_funds(
    cursor,
    *,
    room_id,
    room_code,
    buyer_id,
    seller_id,
    held_amount,
    fee_amount,
    seller_receive,
):
    """
    Move buyer funds from available_balance to
    pending_balance and create the active escrow record.

    The caller must commit or roll back the transaction.
    """
    held_amount = to_money(
        held_amount,
        "held amount",
    )
    fee_amount = to_money(
        fee_amount,
        "fee amount",
    )
    seller_receive = to_money(
        seller_receive,
        "seller receive",
    )

    if held_amount <= 0:
        raise WalletError(
            "Held amount must be greater than zero."
        )

    if seller_receive > held_amount:
        raise WalletError(
            "Seller receive cannot exceed the held amount."
        )

    reference_key = (
        f"deal:{room_code}:wallet_hold"
    )

    # Lock any existing escrow selection for this room.
    cursor.execute(
        """
        SELECT
            payment_method,
            status,
            buyer_id,
            held_amount
        FROM deal_escrow
        WHERE room_id = %s
        FOR UPDATE
        """,
        (room_id,),
    )

    existing_escrow = cursor.fetchone()

    if existing_escrow:
        (
            existing_method,
            existing_status,
            existing_buyer_id,
            existing_amount,
        ) = existing_escrow

        # A repeated request returns the existing result
        # instead of freezing money twice.
        if (
            existing_method == "Wallet"
            and existing_status == "Held"
            and existing_buyer_id == buyer_id
            and to_money(existing_amount) == held_amount
        ):
            wallet = get_or_create_locked_wallet(
                cursor,
                buyer_id,
            )

            return {
                "reused": True,
                "held_amount": held_amount,
                "available_balance": (
                    wallet["available_balance"]
                ),
                "pending_balance": (
                    wallet["pending_balance"]
                ),
            }

        raise WalletError(
            "A payment method or escrow operation "
            "already exists for this deal."
        )

    wallet = get_or_create_locked_wallet(
        cursor,
        buyer_id,
    )

    # Secondary idempotency protection.
    cursor.execute(
        """
        SELECT wallet_transaction_id
        FROM wallet_transactions
        WHERE reference_key = %s
        """,
        (reference_key,),
    )

    if cursor.fetchone():
        raise WalletError(
            "This deal's wallet hold already exists."
        )

    if wallet["available_balance"] < held_amount:
        raise WalletError(
            "Insufficient available wallet balance."
        )

    new_available = (
        wallet["available_balance"] - held_amount
    )
    new_pending = (
        wallet["pending_balance"] + held_amount
    )

    cursor.execute(
        """
        UPDATE user_wallet
        SET
            available_balance = %s,
            pending_balance = %s,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = %s
        """,
        (
            new_available,
            new_pending,
            buyer_id,
        ),
    )

    cursor.execute(
        """
        INSERT INTO deal_escrow (
            room_id,
            room_code,
            buyer_id,
            seller_id,
            payment_method,
            held_amount,
            fee_amount,
            seller_receive,
            status,
            held_at,
            updated_at
        )
        VALUES (
            %s, %s, %s, %s,
            'Wallet',
            %s, %s, %s,
            'Held',
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        )
        """,
        (
            room_id,
            room_code,
            buyer_id,
            seller_id,
            held_amount,
            fee_amount,
            seller_receive,
        ),
    )

    cursor.execute(
        """
        INSERT INTO wallet_transactions (
            user_id,
            room_id,
            room_code,
            transaction_type,
            amount,
            available_change,
            pending_change,
            available_balance_after,
            pending_balance_after,
            reference_key,
            description
        )
        VALUES (
            %s, %s, %s,
            'DealHold',
            %s, %s, %s, %s, %s, %s,
            %s
        )
        """,
        (
            buyer_id,
            room_id,
            room_code,
            held_amount,
            -held_amount,
            held_amount,
            new_available,
            new_pending,
            reference_key,
            f"Funds held for deal {room_code}.",
        ),
    )

    return {
        "reused": False,
        "held_amount": held_amount,
        "available_balance": new_available,
        "pending_balance": new_pending,
    }

def hold_external_payment_in_escrow(
    cursor,
    *,
    room_id,
    room_code,
    buyer_id,
    seller_id,
    payment_attempt_id,
    held_amount,
    fee_amount,
    seller_receive,
):
    """
    Record verified external KHQR funds as held escrow.

    External funds do not change the buyer's wallet balance.
    The caller must commit or roll back the surrounding
    database transaction.
    """
    held_amount = to_money(
        held_amount,
        "held amount",
    )
    fee_amount = to_money(
        fee_amount,
        "fee amount",
    )
    seller_receive = to_money(
        seller_receive,
        "seller receive",
    )

    if held_amount <= 0:
        raise WalletError(
            "Held amount must be greater than zero."
        )

    if seller_receive > held_amount:
        raise WalletError(
            "Seller receive cannot exceed the held amount."
        )

    if seller_receive + fee_amount != held_amount:
        raise WalletError(
            "Held amount must equal seller receive plus fee."
        )

    if not payment_attempt_id:
        raise WalletError(
            "A verified payment attempt is required."
        )

    cursor.execute(
        """
        SELECT
            payment_method,
            payment_attempt_id,
            buyer_id,
            seller_id,
            held_amount,
            fee_amount,
            seller_receive,
            status
        FROM deal_escrow
        WHERE room_id = %s
        FOR UPDATE
        """,
        (room_id,),
    )

    existing_escrow = cursor.fetchone()

    if existing_escrow:
        (
            existing_method,
            existing_payment_attempt_id,
            existing_buyer_id,
            existing_seller_id,
            existing_held_amount,
            existing_fee_amount,
            existing_seller_receive,
            existing_status,
        ) = existing_escrow

        same_verified_escrow = (
            existing_method == "KHQR"
            and existing_payment_attempt_id
            == payment_attempt_id
            and existing_buyer_id == buyer_id
            and existing_seller_id == seller_id
            and to_money(existing_held_amount)
            == held_amount
            and to_money(existing_fee_amount)
            == fee_amount
            and to_money(existing_seller_receive)
            == seller_receive
            and existing_status == "Held"
        )

        if same_verified_escrow:
            return {
                "reused": True,
                "payment_method": "KHQR",
                "held_amount": held_amount,
                "fee_amount": fee_amount,
                "seller_receive": seller_receive,
            }

        raise WalletError(
            "A different escrow operation already exists "
            "for this deal."
        )

    cursor.execute(
        """
        INSERT INTO deal_escrow (
            room_id,
            room_code,
            buyer_id,
            seller_id,
            payment_method,
            payment_attempt_id,
            held_amount,
            fee_amount,
            seller_receive,
            status,
            held_at,
            updated_at
        )
        VALUES (
            %s,
            %s,
            %s,
            %s,
            'KHQR',
            %s,
            %s,
            %s,
            %s,
            'Held',
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        )
        """,
        (
            room_id,
            room_code,
            buyer_id,
            seller_id,
            payment_attempt_id,
            held_amount,
            fee_amount,
            seller_receive,
        ),
    )

    return {
        "reused": False,
        "payment_method": "KHQR",
        "held_amount": held_amount,
        "fee_amount": fee_amount,
        "seller_receive": seller_receive,
    }

def credit_wallet_deposit(
    cursor,
    *,
    user_id,
    amount,
    reference_key,
    description="Wallet deposit.",
):
    """
    Credit a verified or simulated deposit to a wallet.

    The caller must commit or roll back the surrounding
    database transaction.
    """
    amount = to_money(
        amount,
        "deposit amount",
    )

    if amount <= 0:
        raise WalletError(
            "Deposit amount must be greater than zero."
        )

    reference_key = str(reference_key).strip()

    if not reference_key:
        raise WalletError(
            "A deposit reference is required."
        )

    wallet = get_or_create_locked_wallet(
        cursor,
        user_id,
    )

    # Prevent the same bank/mock deposit from being
    # credited more than once.
    cursor.execute(
        """
        SELECT
            wallet_transaction_id,
            transaction_type
        FROM wallet_transactions
        WHERE reference_key = %s
        """,
        (reference_key,),
    )

    existing_transaction = cursor.fetchone()

    if existing_transaction:
        if existing_transaction[1] != "Deposit":
            raise WalletError(
                "The payment reference is already used "
                "by another wallet operation."
            )

        return {
            "reused": True,
            "amount": amount,
            "available_balance": (
                wallet["available_balance"]
            ),
            "pending_balance": (
                wallet["pending_balance"]
            ),
        }

    new_available = (
        wallet["available_balance"] + amount
    )
    new_total_received = (
        wallet["total_received"] + amount
    )

    cursor.execute(
        """
        UPDATE user_wallet
        SET
            available_balance = %s,
            total_received = %s,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = %s
        """,
        (
            new_available,
            new_total_received,
            user_id,
        ),
    )

    cursor.execute(
        """
        INSERT INTO wallet_transactions (
            user_id,
            room_id,
            room_code,
            payment_attempt_id,
            transaction_type,
            amount,
            available_change,
            pending_change,
            available_balance_after,
            pending_balance_after,
            reference_key,
            description
        )
        VALUES (
            %s,
            NULL,
            NULL,
            NULL,
            'Deposit',
            %s,
            %s,
            0.00,
            %s,
            %s,
            %s,
            %s
        )
        """,
        (
            user_id,
            amount,
            amount,
            new_available,
            wallet["pending_balance"],
            reference_key,
            description,
        ),
    )

    return {
        "reused": False,
        "amount": amount,
        "available_balance": new_available,
        "pending_balance": (
            wallet["pending_balance"]
        ),
    }

def release_escrow_to_seller(
    cursor,
    *,
    room_id,
    room_code,
):
    """
    Release held escrow funds to the seller.

    Wallet-funded deals remove the held amount from the
    buyer's pending balance. KHQR-funded deals do not
    modify the buyer wallet during release.

    The caller must verify authorization and commit or
    roll back the surrounding transaction.
    """
    cursor.execute(
        """
        SELECT
            buyer_id,
            seller_id,
            payment_method,
            held_amount,
            fee_amount,
            seller_receive,
            status
        FROM deal_escrow
        WHERE room_id = %s
          AND room_code = %s
        FOR UPDATE
        """,
        (
            room_id,
            room_code,
        ),
    )

    escrow = cursor.fetchone()

    if not escrow:
        raise WalletError(
            "Active escrow was not found for this deal."
        )

    (
        buyer_id,
        seller_id,
        payment_method,
        held_amount,
        fee_amount,
        seller_receive,
        escrow_status,
    ) = escrow

    held_amount = to_money(
        held_amount,
        "held amount",
    )
    fee_amount = to_money(
        fee_amount,
        "fee amount",
    )
    seller_receive = to_money(
        seller_receive,
        "seller receive",
    )

    # Lock wallets in user-ID order to reduce the chance
    # of deadlocks during concurrent wallet operations.
    locked_wallets = {}

    for user_id in sorted({buyer_id, seller_id}):
        locked_wallets[user_id] = (
            get_or_create_locked_wallet(
                cursor,
                user_id,
            )
        )

    buyer_wallet = locked_wallets[buyer_id]
    seller_wallet = locked_wallets[seller_id]

    if escrow_status == "Released":
        return {
            "reused": True,
            "payment_method": payment_method,
            "held_amount": held_amount,
            "fee_amount": fee_amount,
            "seller_receive": seller_receive,
            "buyer_available_balance": (
                buyer_wallet["available_balance"]
            ),
            "buyer_pending_balance": (
                buyer_wallet["pending_balance"]
            ),
            "seller_available_balance": (
                seller_wallet["available_balance"]
            ),
        }

    if escrow_status == "Refunded":
        raise WalletError(
            "Refunded escrow cannot be released."
        )

    if escrow_status not in {
        "Held",
        "Disputed",
    }:
        raise WalletError(
            "This escrow is not ready for release."
        )

    buyer_release_reference = (
        f"deal:{room_code}:escrow_release"
    )
    seller_credit_reference = (
        f"deal:{room_code}:seller_credit"
    )

    cursor.execute(
        """
        SELECT reference_key
        FROM wallet_transactions
        WHERE reference_key IN (%s, %s)
        """,
        (
            buyer_release_reference,
            seller_credit_reference,
        ),
    )

    existing_references = {
        row[0]
        for row in cursor.fetchall()
    }

    if existing_references:
        raise WalletError(
            "A release ledger operation already exists "
            "for this deal."
        )

    # Wallet-funded money was previously moved into the
    # buyer's pending balance.
    if payment_method == "Wallet":
        if (
            buyer_wallet["pending_balance"]
            < held_amount
        ):
            raise WalletError(
                "The buyer's held wallet balance is "
                "lower than the escrow amount."
            )

        new_buyer_pending = (
            buyer_wallet["pending_balance"]
            - held_amount
        )

        cursor.execute(
            """
            UPDATE user_wallet
            SET
                pending_balance = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = %s
            """,
            (
                new_buyer_pending,
                buyer_id,
            ),
        )

        cursor.execute(
            """
            INSERT INTO wallet_transactions (
                user_id,
                room_id,
                room_code,
                transaction_type,
                amount,
                available_change,
                pending_change,
                available_balance_after,
                pending_balance_after,
                reference_key,
                description
            )
            VALUES (
                %s,
                %s,
                %s,
                'EscrowRelease',
                %s,
                0.00,
                %s,
                %s,
                %s,
                %s,
                %s
            )
            """,
            (
                buyer_id,
                room_id,
                room_code,
                held_amount,
                -held_amount,
                buyer_wallet["available_balance"],
                new_buyer_pending,
                buyer_release_reference,
                (
                    f"Escrow released for deal "
                    f"{room_code}."
                ),
            ),
        )

    elif payment_method == "KHQR":
        # KHQR funds came from an external account, so
        # nothing was frozen in the buyer's wallet.
        new_buyer_pending = (
            buyer_wallet["pending_balance"]
        )

    else:
        raise WalletError(
            "The escrow payment method is invalid."
        )

    new_seller_available = (
        seller_wallet["available_balance"]
        + seller_receive
    )
    new_seller_total_received = (
        seller_wallet["total_received"]
        + seller_receive
    )

    cursor.execute(
        """
        UPDATE user_wallet
        SET
            available_balance = %s,
            total_received = %s,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = %s
        """,
        (
            new_seller_available,
            new_seller_total_received,
            seller_id,
        ),
    )

    cursor.execute(
        """
        INSERT INTO wallet_transactions (
            user_id,
            room_id,
            room_code,
            transaction_type,
            amount,
            available_change,
            pending_change,
            available_balance_after,
            pending_balance_after,
            reference_key,
            description
        )
        VALUES (
            %s,
            %s,
            %s,
            'SellerCredit',
            %s,
            %s,
            0.00,
            %s,
            %s,
            %s,
            %s
        )
        """,
        (
            seller_id,
            room_id,
            room_code,
            seller_receive,
            seller_receive,
            new_seller_available,
            seller_wallet["pending_balance"],
            seller_credit_reference,
            (
                f"Seller proceeds received from deal "
                f"{room_code}."
            ),
        ),
    )

    cursor.execute(
        """
        UPDATE deal_escrow
        SET
            status = 'Released',
            released_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE room_id = %s
        """,
        (room_id,),
    )

    return {
        "reused": False,
        "payment_method": payment_method,
        "held_amount": held_amount,
        "fee_amount": fee_amount,
        "seller_receive": seller_receive,
        "buyer_available_balance": (
            buyer_wallet["available_balance"]
        ),
        "buyer_pending_balance": (
            new_buyer_pending
        ),
        "seller_available_balance": (
            new_seller_available
        ),
    }

def refund_escrow_to_buyer(
    cursor,
    *,
    room_id,
    room_code,
):
    """
    Refund a cancelled funded deal to the buyer while
    retaining the non-refundable platform service fee.

    refund_amount = held_amount - fee_amount

    The caller must verify cancellation authorization and
    commit or roll back the surrounding transaction.
    """
    cursor.execute(
        """
        SELECT
            e.buyer_id,
            e.payment_method,
            e.held_amount,
            e.fee_amount,
            e.status,
            f.fee_payer
        FROM deal_escrow e
        JOIN deal_fee_agreement f
            ON f.room_id = e.room_id
        WHERE e.room_id = %s
          AND e.room_code = %s
        FOR UPDATE OF e, f
        """,
        (
            room_id,
            room_code,
        ),
    )

    escrow = cursor.fetchone()

    if not escrow:
        raise WalletError(
            "Active escrow was not found for this deal."
        )

    (
        buyer_id,
        payment_method,
        held_amount,
        fee_amount,
        escrow_status,
        agreed_fee_payer,
    ) = escrow

    held_amount = to_money(
        held_amount,
        "held amount",
    )
    fee_amount = to_money(
        fee_amount,
        "fee amount",
    )

    refund_amount = held_amount - fee_amount

    if refund_amount < 0:
        raise WalletError(
            "The service fee exceeds the held amount."
        )

    if agreed_fee_payer not in {
        "buyer",
        "seller",
    }:
        raise WalletError(
            "The agreed fee payer is invalid."
        )

    buyer_wallet = get_or_create_locked_wallet(
        cursor,
        buyer_id,
    )

    if escrow_status == "Refunded":
        return {
            "reused": True,
            "payment_method": payment_method,
            "held_amount": held_amount,
            "refund_amount": refund_amount,
            "retained_fee": fee_amount,
            "available_balance": (
                buyer_wallet["available_balance"]
            ),
            "pending_balance": (
                buyer_wallet["pending_balance"]
            ),
        }

    if escrow_status == "Released":
        raise WalletError(
            "Released escrow cannot be refunded."
        )

    if escrow_status not in {
        "Held",
        "Disputed",
    }:
        raise WalletError(
            "This escrow is not ready for refund."
        )

    refund_reference = (
        f"deal:{room_code}:refund"
    )
    wallet_fee_reference = (
        f"deal:{room_code}:cancelled_wallet_fee"
    )
    platform_fee_reference = (
        f"deal:{room_code}:cancelled_fee"
    )

    cursor.execute(
        """
        SELECT reference_key
        FROM wallet_transactions
        WHERE reference_key IN (%s, %s)
        """,
        (
            refund_reference,
            wallet_fee_reference,
        ),
    )

    if cursor.fetchall():
        raise WalletError(
            "A refund wallet operation already exists "
            "for this deal."
        )

    cursor.execute(
        """
        SELECT platform_fee_transaction_id
        FROM platform_fee_transactions
        WHERE reference_key = %s
        """,
        (platform_fee_reference,),
    )

    if cursor.fetchone():
        raise WalletError(
            "A cancellation fee already exists "
            "for this deal."
        )

    if payment_method == "Wallet":
        if (
            buyer_wallet["pending_balance"]
            < held_amount
        ):
            raise WalletError(
                "The buyer's held wallet balance is "
                "lower than the escrow amount."
            )

        # First return the refundable portion.
        refund_available_after = (
            buyer_wallet["available_balance"]
            + refund_amount
        )
        refund_pending_after = (
            buyer_wallet["pending_balance"]
            - refund_amount
        )

        # Then consume the non-refundable fee from the
        # remaining held balance.
        final_available = refund_available_after
        final_pending = (
            refund_pending_after - fee_amount
        )
        final_total_received = (
            buyer_wallet["total_received"]
        )

        if final_pending < 0:
            raise WalletError(
                "The buyer's held balance cannot cover "
                "the service fee."
            )

        if refund_amount > 0:
            cursor.execute(
                """
                INSERT INTO wallet_transactions (
                    user_id,
                    room_id,
                    room_code,
                    transaction_type,
                    amount,
                    available_change,
                    pending_change,
                    available_balance_after,
                    pending_balance_after,
                    reference_key,
                    description
                )
                VALUES (
                    %s,
                    %s,
                    %s,
                    'Refund',
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s
                )
                """,
                (
                    buyer_id,
                    room_id,
                    room_code,
                    refund_amount,
                    refund_amount,
                    -refund_amount,
                    refund_available_after,
                    refund_pending_after,
                    refund_reference,
                    (
                        f"Escrow refund after service fee "
                        f"for deal {room_code}."
                    ),
                ),
            )

        if fee_amount > 0:
            cursor.execute(
                """
                INSERT INTO wallet_transactions (
                    user_id,
                    room_id,
                    room_code,
                    transaction_type,
                    amount,
                    available_change,
                    pending_change,
                    available_balance_after,
                    pending_balance_after,
                    reference_key,
                    description
                )
                VALUES (
                    %s,
                    %s,
                    %s,
                    'Fee',
                    %s,
                    0.00,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s
                )
                """,
                (
                    buyer_id,
                    room_id,
                    room_code,
                    fee_amount,
                    -fee_amount,
                    final_available,
                    final_pending,
                    wallet_fee_reference,
                    (
                        f"Non-refundable service fee "
                        f"for cancelled deal {room_code}."
                    ),
                ),
            )

    elif payment_method == "KHQR":
        # The original payment came from outside the
        # wallet. Only the refundable portion enters it.
        final_available = (
            buyer_wallet["available_balance"]
            + refund_amount
        )
        final_pending = (
            buyer_wallet["pending_balance"]
        )
        final_total_received = (
            buyer_wallet["total_received"]
            + refund_amount
        )

        if refund_amount > 0:
            cursor.execute(
                """
                INSERT INTO wallet_transactions (
                    user_id,
                    room_id,
                    room_code,
                    transaction_type,
                    amount,
                    available_change,
                    pending_change,
                    available_balance_after,
                    pending_balance_after,
                    reference_key,
                    description
                )
                VALUES (
                    %s,
                    %s,
                    %s,
                    'Refund',
                    %s,
                    %s,
                    0.00,
                    %s,
                    %s,
                    %s,
                    %s
                )
                """,
                (
                    buyer_id,
                    room_id,
                    room_code,
                    refund_amount,
                    refund_amount,
                    final_available,
                    final_pending,
                    refund_reference,
                    (
                        f"KHQR refund after service fee "
                        f"for deal {room_code}."
                    ),
                ),
            )

    else:
        raise WalletError(
            "The escrow payment method is invalid."
        )

    cursor.execute(
        """
        UPDATE user_wallet
        SET
            available_balance = %s,
            pending_balance = %s,
            total_received = %s,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = %s
        """,
        (
            final_available,
            final_pending,
            final_total_received,
            buyer_id,
        ),
    )

    if fee_amount > 0:
        cursor.execute(
            """
            INSERT INTO platform_fee_transactions (
                room_id,
                room_code,
                transaction_id,
                charged_user_id,
                agreed_fee_payer,
                event_type,
                payment_method,
                fee_amount,
                currency,
                reference_key
            )
            VALUES (
                %s,
                %s,
                NULL,
                %s,
                %s,
                'Cancelled',
                %s,
                %s,
                'USD',
                %s
            )
            """,
            (
                room_id,
                room_code,
                buyer_id,
                agreed_fee_payer,
                payment_method,
                fee_amount,
                platform_fee_reference,
            ),
        )

    cursor.execute(
        """
        UPDATE deal_escrow
        SET
            status = 'Refunded',
            refunded_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE room_id = %s
        """,
        (room_id,),
    )

    return {
        "reused": False,
        "payment_method": payment_method,
        "held_amount": held_amount,
        "refund_amount": refund_amount,
        "retained_fee": fee_amount,
        "available_balance": final_available,
        "pending_balance": final_pending,
    }

def charge_unfunded_cancellation_fee(
    cursor,
    *,
    room_id,
    room_code,
    buyer_id,
    fee_amount,
    agreed_fee_payer,
):
    """
    Charge the buyer's available wallet for an approved
    cancellation while the deal is at Payment but has
    not yet created or funded escrow.

    The caller owns the surrounding transaction and must
    commit or roll back.
    """
    fee_amount = to_money(
        fee_amount,
        "service fee",
    )

    if fee_amount <= 0:
        raise WalletError(
            "The cancellation fee must be greater "
            "than zero."
        )

    if agreed_fee_payer not in {
        "buyer",
        "seller",
    }:
        raise WalletError(
            "The agreed fee payer is invalid."
        )

    wallet_reference = (
        f"deal:{room_code}:"
        "unfunded_cancel_wallet_fee"
    )
    platform_reference = (
        f"deal:{room_code}:"
        "unfunded_cancelled_fee"
    )

    wallet = get_or_create_locked_wallet(
        cursor,
        buyer_id,
    )

    cursor.execute(
        """
        SELECT wallet_transaction_id
        FROM wallet_transactions
        WHERE reference_key = %s
        """,
        (wallet_reference,),
    )

    wallet_fee_exists = cursor.fetchone() is not None

    cursor.execute(
        """
        SELECT platform_fee_transaction_id
        FROM platform_fee_transactions
        WHERE reference_key = %s
        """,
        (platform_reference,),
    )

    platform_fee_exists = (
        cursor.fetchone() is not None
    )

    if wallet_fee_exists and platform_fee_exists:
        return {
            "reused": True,
            "fee_amount": fee_amount,
            "available_balance": (
                wallet["available_balance"]
            ),
            "pending_balance": (
                wallet["pending_balance"]
            ),
        }

    if wallet_fee_exists or platform_fee_exists:
        raise WalletError(
            "The cancellation fee ledger is incomplete."
        )

    if wallet["available_balance"] < fee_amount:
        raise WalletError(
            "The buyer needs at least "
            f"${fee_amount:.2f} in available wallet "
            "balance to complete this cancellation."
        )

    new_available_balance = (
        wallet["available_balance"] - fee_amount
    )

    cursor.execute(
        """
        UPDATE user_wallet
        SET
            available_balance = %s,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = %s
        """,
        (
            new_available_balance,
            buyer_id,
        ),
    )

    cursor.execute(
        """
        INSERT INTO wallet_transactions (
            user_id,
            room_id,
            room_code,
            payment_attempt_id,
            transaction_type,
            amount,
            available_change,
            pending_change,
            available_balance_after,
            pending_balance_after,
            reference_key,
            description
        )
        VALUES (
            %s,
            %s,
            %s,
            NULL,
            'Fee',
            %s,
            %s,
            0.00,
            %s,
            %s,
            %s,
            %s
        )
        """,
        (
            buyer_id,
            room_id,
            room_code,
            fee_amount,
            -fee_amount,
            new_available_balance,
            wallet["pending_balance"],
            wallet_reference,
            (
                "Service fee for mutually cancelling "
                f"unfunded deal {room_code}."
            ),
        ),
    )

    cursor.execute(
        """
        INSERT INTO platform_fee_transactions (
            room_id,
            room_code,
            transaction_id,
            charged_user_id,
            agreed_fee_payer,
            event_type,
            payment_method,
            fee_amount,
            currency,
            reference_key
        )
        VALUES (
            %s,
            %s,
            NULL,
            %s,
            %s,
            'Cancelled',
            'Wallet',
            %s,
            'USD',
            %s
        )
        """,
        (
            room_id,
            room_code,
            buyer_id,
            agreed_fee_payer,
            fee_amount,
            platform_reference,
        ),
    )

    return {
        "reused": False,
        "fee_amount": fee_amount,
        "available_balance": (
            new_available_balance
        ),
        "pending_balance": (
            wallet["pending_balance"]
        ),
    }