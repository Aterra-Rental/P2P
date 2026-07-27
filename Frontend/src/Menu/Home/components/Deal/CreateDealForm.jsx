import { useState } from "react";
import { checkUser, createRoom } from "../../lib/room";

const CreateDealForm = ({ onCreated }) => {
    const [partnerUserId, setPartnerUserId] = useState("");
    const [itemName, setItemName] = useState("");
    const [itemDescription, setItemDescription] = useState("");
    const [amount, setAmount] = useState("");

    const [partner, setPartner] = useState(null);

    const [loading, setLoading] = useState(false);
    const [checkingUser, setCheckingUser] = useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const verifyPartner = async (id) => {
        setPartner(null);

        if (!id) return;

        setCheckingUser(true);

        try {
            const result = await checkUser(id);

            if (result.success) {
                setPartner(result.user);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setCheckingUser(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();

        setError("");
        setSuccess("");

        if (
            !partnerUserId ||
            !itemName ||
            !itemDescription ||
            !amount
        ) {
            setError("Please fill in all fields.");
            return;
        }

        const currentUserId = localStorage.getItem("user_id");

        if (partnerUserId === currentUserId) {
            setError("You cannot create a deal with yourself.");
            return;
        }

        setLoading(true);

        try {
            const result = await checkUser(partnerUserId);

            

            if (!result.success) {
                setError(result.message);
                return;
            }

            setPartner(result.user);

            if (result.user.verify_status !== "Verified") {
                setError("The selected user is not verified.");
                return;
            }


            const response = await createRoom({
                created_by: currentUserId,
                invited_user_id: partnerUserId,
                item_name: itemName,
                item_description: itemDescription,
                agreed_price: amount,
            });

            if (response.success) {
                setSuccess("Deal created successfully.");

                setPartnerUserId("");
                setItemName("");
                setItemDescription("");
                setAmount("");
                setPartner(null);

                if (onCreated) {
                    onCreated();
                }
            } else {
                setError(response.message || "Failed to create deal.");
            }
        } catch (err) {
            console.error(err);
            setError("Server error.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card shadow-sm p-4">

            <h4 className="mb-4">Create New Deal</h4>

            <form onSubmit={handleCreate}>

                <div className="mb-3">
                    <label className="form-label">
                        Other User ID
                    </label>

                    <input
                        type="number"
                        className="form-control"
                        value={partnerUserId}
                        onChange={(e) => {
                            setPartnerUserId(e.target.value);
                            verifyPartner(e.target.value);
                        }}
                    />
                </div>

                <div className="mb-3">
                    <label className="form-label">
                        Item Name
                    </label>

                    <input
                        type="text"
                        className="form-control"
                        value={itemName}
                        onChange={(e) =>
                            setItemName(e.target.value)
                        }
                    />
                </div>

                <div className="mb-3">
                    <label className="form-label">
                        Item Description
                    </label>

                    <textarea
                        className="form-control"
                        rows="3"
                        value={itemDescription}
                        onChange={(e) =>
                            setItemDescription(e.target.value)
                        }
                    />
                </div>

                <div className="mb-3">
                    <label className="form-label">
                        Agreed Price (៛)
                    </label>

                    <input
                        type="number"
                        className="form-control"
                        value={amount}
                        onChange={(e) =>
                            setAmount(e.target.value)
                        }
                    />
                </div>

                <hr />

                <h5>Partner Information</h5>

                {checkingUser && (
                    <p className="text-muted">
                        Checking user...
                    </p>
                )}

                {partner && (
                    <div className="alert alert-light border">

                        <strong>
                            {partner.firstname} {partner.lastname}
                        </strong>

                        <br />

                        Email: {partner.email}

                        <br />

                        Status:
                        {" "}
                        <span
                            className={
                                partner.verify_status === "Verified"
                                    ? "text-success"
                                    : "text-warning"
                            }
                        >
                            {partner.verify_status}
                        </span>

                    </div>
                )}

                {error && (
                    <div className="alert alert-danger">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="alert alert-success">
                        {success}
                    </div>
                )}

                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                >
                    {loading
                        ? "Creating..."
                        : "Create Deal"}
                </button>

            </form>

        </div>
    );
};

export default CreateDealForm;