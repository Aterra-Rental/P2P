import { useCallback, useEffect, useState } from "react";
import { FaBalanceScale, FaRedo, FaShieldAlt } from "react-icons/fa";

import AdminLayout from "../../../Components/Layout/AdminLayout";
import {
  getAdminDisputeDetail,
  getAdminDisputeProof,
  getAdminDisputes,
  resolveAdminDispute,
} from "../../../../lib/adminDisputes";

import "./AdminDisputes.css";

const STATUS_FILTERS = ["Open", "UnderReview", "Resolved", "Rejected", "All"];

const formatMoney = (value) => {
  return Number(value || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
};

const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString();
};

const AdminDisputes = () => {
  const [status, setStatus] = useState("Open");
  const [page, setPage] = useState(1);
  const [disputes, setDisputes] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 25,
    total_count: 0,
    total_pages: 0,
  });
  const [selectedDisputeId, setSelectedDisputeId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [loadingProof, setLoadingProof] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadDisputes = useCallback(async () => {
    try {
      setLoadingList(true);
      setError("");

      const data = await getAdminDisputes({
        status,
        page,
        perPage: 25,
      });

      const nextDisputes = data.disputes || [];

      setDisputes(nextDisputes);
      setPagination(
        data.pagination || {
          page,
          per_page: 25,
          total_count: 0,
          total_pages: 0,
        },
      );

      setSelectedDisputeId((currentId) => {
        const currentStillExists = nextDisputes.some(
          (item) => item.dispute_id === currentId,
        );

        if (currentStillExists) {
          return currentId;
        }

        return nextDisputes[0]?.dispute_id || null;
      });
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoadingList(false);
    }
  }, [page, status]);

  const loadDetail = useCallback(async () => {
    if (!selectedDisputeId) {
      setDetail(null);
      return;
    }

    try {
      setLoadingDetail(true);
      setError("");

      const data = await getAdminDisputeDetail(selectedDisputeId);

      setDetail(data.dispute || null);
    } catch (loadError) {
      setError(loadError.message);
      setDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  }, [selectedDisputeId]);

  useEffect(() => {
    const initialLoadTimer = window.setTimeout(() => {
      loadDisputes();
    }, 0);

    return () => {
      window.clearTimeout(initialLoadTimer);
    };
  }, [loadDisputes]);

  useEffect(() => {
    const detailLoadTimer = window.setTimeout(() => {
      loadDetail();
    }, 0);

    return () => {
      window.clearTimeout(detailLoadTimer);
    };
  }, [loadDetail]);

  useEffect(() => {
    const handleDisputesUpdated = () => {
      loadDisputes();
      loadDetail();
    };

    window.addEventListener(
      "admin-disputes-updated",
      handleDisputesUpdated
    );

    return () => {
      window.removeEventListener(
        "admin-disputes-updated",
        handleDisputesUpdated
      );
    };
  }, [loadDetail, loadDisputes]);

  const chooseStatus = (nextStatus) => {
    setStatus(nextStatus);
    setPage(1);
    setDetail(null);
    setResolutionNote("");
    setSuccess("");
  };

  const handleRefresh = async () => {
    await loadDisputes();
    await loadDetail();
  };

  const handleViewProof = async () => {
    if (!detail?.dispute_id) {
      return;
    }

    const proofWindow = window.open("", "_blank");

    try {
      setLoadingProof(true);
      setError("");

      const proofBlob = await getAdminDisputeProof(
        detail.dispute_id
      );

      const proofUrl = URL.createObjectURL(proofBlob);

      if (proofWindow) {
        proofWindow.location.href = proofUrl;
      } else {
        window.open(proofUrl, "_blank");
      }

      window.setTimeout(() => {
        URL.revokeObjectURL(proofUrl);
      }, 60000);
    } catch (proofError) {
      if (proofWindow) {
        proofWindow.close();
      }

      setError(proofError.message);
    } finally {
      setLoadingProof(false);
    }
  };
  const handleDecision = async (decision) => {
    if (!detail || resolutionNote.trim().length < 10) {
      setError("Enter a resolution note containing at least 10 characters.");
      return;
    }

    const decisionLabels = {
      ReleaseToSeller: "release escrow to the seller",
      RefundBuyer: "refund the buyer and cancel the deal",
      RejectDispute: "reject this dispute",
    };

    const confirmed = window.confirm(
      `Are you sure you want to ${
        decisionLabels[decision]
      }? This admin decision is permanent.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setResolving(true);
      setError("");
      setSuccess("");

      const result = await resolveAdminDispute(detail.dispute_id, {
        decision,
        resolutionNote: resolutionNote.trim(),
      });

      setSuccess(result.message);
      setResolutionNote("");

      await loadDisputes();

      const refreshed = await getAdminDisputeDetail(detail.dispute_id);

      setDetail(refreshed.dispute || null);
    } catch (resolveError) {
      setError(resolveError.message);
    } finally {
      setResolving(false);
    }
  };

  const totalPages = Math.max(1, pagination.total_pages || 1);

  const isResolvable =
    detail && ["Open", "UnderReview"].includes(detail.status);

  return (
    <AdminLayout>
      <section className="admin-disputes-page">
        <header className="admin-disputes-header">
          <div>
            <span className="admin-disputes-eyebrow">Escrow protection</span>

            <h1>Dispute Resolution</h1>

            <p>
              Review participant claims, escrow values, fulfillment evidence,
              and conversation history before issuing a final decision.
            </p>
          </div>

          <button
            type="button"
            className="admin-disputes-refresh"
            onClick={handleRefresh}
            disabled={loadingList || loadingDetail}
          >
            <FaRedo /> Refresh
          </button>
        </header>

        <div className="admin-disputes-filters">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              className={[
                "admin-disputes-filter",
                status === filter ? "is-active" : "",
              ].join(" ")}
              onClick={() => chooseStatus(filter)}
            >
              {filter === "UnderReview" ? "Under Review" : filter}
            </button>
          ))}
        </div>

        {error && <div className="admin-disputes-error">{error}</div>}

        {success && <div className="admin-disputes-success">{success}</div>}

        <div className="admin-disputes-layout">
          <section className="admin-disputes-list">
            {loadingList && (
              <div className="admin-disputes-state">Loading disputes...</div>
            )}

            {!loadingList && disputes.length === 0 && (
              <div className="admin-disputes-state">
                No disputes match this filter.
              </div>
            )}

            {!loadingList &&
              disputes.map((item) => (
                <button
                  key={item.dispute_id}
                  type="button"
                  className={[
                    "admin-dispute-card",
                    selectedDisputeId === item.dispute_id ? "is-selected" : "",
                  ].join(" ")}
                  onClick={() => {
                    setSelectedDisputeId(item.dispute_id);
                    setResolutionNote("");
                    setSuccess("");
                  }}
                >
                  <div className="admin-dispute-card-top">
                    <h3>
                      #{item.dispute_id} · {item.room_code}
                    </h3>

                    <span
                      className={[
                        "admin-dispute-status",
                        item.status.replace(/\s/g, "").toLowerCase(),
                      ].join(" ")}
                    >
                      {item.status}
                    </span>
                  </div>

                  <p>{item.reason}</p>

                  <div className="admin-dispute-card-meta">
                    <span>{item.requested_resolution}</span>

                    <span>{formatDate(item.created_at)}</span>
                  </div>
                </button>
              ))}

            {!loadingList && disputes.length > 0 && (
              <footer className="admin-disputes-pagination">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1}
                >
                  Previous
                </button>

                <span>
                  {page} / {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                  disabled={page >= totalPages}
                >
                  Next
                </button>
              </footer>
            )}
          </section>

          <section className="admin-dispute-detail">
            {!selectedDisputeId && (
              <div className="admin-disputes-state">
                Select a dispute to review its details.
              </div>
            )}

            {selectedDisputeId && loadingDetail && (
              <div className="admin-disputes-state">
                Loading dispute details...
              </div>
            )}

            {detail && !loadingDetail && (
              <>
                <header className="admin-dispute-detail-title">
                  <div>
                    <span className="admin-disputes-eyebrow">
                      Room {detail.room_code}
                    </span>

                    <h2>{detail.item_name}</h2>

                    <p>
                      Opened by User #{detail.opened_by}
                      {" · "}
                      Requested: {detail.requested_resolution}
                    </p>
                  </div>

                  <span
                    className={[
                      "admin-dispute-status",
                      detail.status.replace(/\s/g, "").toLowerCase(),
                    ].join(" ")}
                  >
                    {detail.status}
                  </span>
                </header>

                <section className="admin-dispute-section">
                  <h3>Escrow summary</h3>

                  <div className="admin-dispute-grid">
                    <div className="admin-dispute-info">
                      <span>Held amount</span>
                      <strong>{formatMoney(detail.escrow.held_amount)}</strong>
                    </div>

                    <div className="admin-dispute-info">
                      <span>Platform fee</span>
                      <strong>{formatMoney(detail.escrow.fee_amount)}</strong>
                    </div>

                    <div className="admin-dispute-info">
                      <span>Seller receives</span>
                      <strong>
                        {formatMoney(detail.escrow.seller_receive)}
                      </strong>
                    </div>

                    <div className="admin-dispute-info">
                      <span>Payment method</span>
                      <strong>{detail.escrow.payment_method}</strong>
                    </div>

                    <div className="admin-dispute-info">
                      <span>Escrow status</span>
                      <strong>{detail.escrow.status}</strong>
                    </div>

                    <div className="admin-dispute-info">
                      <span>Product type</span>
                      <strong>{detail.product_type}</strong>
                    </div>
                  </div>
                </section>

                <section className="admin-dispute-section">
                  <h3>Participants</h3>

                  <div className="admin-dispute-grid">
                    <div className="admin-dispute-info">
                      <span>Buyer</span>
                      <strong>{detail.buyer.name}</strong>
                      <span>
                        User #{detail.buyer.user_id}
                        {" · "}
                        {detail.buyer.email}
                      </span>
                    </div>

                    <div className="admin-dispute-info">
                      <span>Seller</span>
                      <strong>{detail.seller.name}</strong>
                      <span>
                        User #{detail.seller.user_id}
                        {" · "}
                        {detail.seller.email}
                      </span>
                    </div>

                    <div className="admin-dispute-info">
                      <span>Claim against</span>
                      <strong>User #{detail.against_user}</strong>
                    </div>
                  </div>
                </section>

                <section className="admin-dispute-section">
                  <h3>Dispute reason</h3>

                  <div className="admin-dispute-reason">{detail.reason}</div>
                </section>

                <section className="admin-dispute-section">
                  <h3>Fulfillment evidence</h3>

                  <div className="admin-dispute-proof">
                    {detail.fulfillment ? (
                      <>
                        <button
                          type="button"
                          className="admin-disputes-refresh"
                          onClick={handleViewProof}
                          disabled={loadingProof}
                        >
                          {loadingProof
                            ? "Loading evidence..."
                            : "View Evidence"}
                        </button>
                        <p>
                          <strong>Description:</strong>{" "}
                          {detail.fulfillment.description || "No description"}
                        </p>

                        <p>
                          <strong>Courier:</strong>{" "}
                          {detail.fulfillment.courier_name || "Not applicable"}
                        </p>

                        <p>
                          <strong>Tracking:</strong>{" "}
                          {detail.fulfillment.tracking_number || "Not provided"}
                        </p>

                        <p>
                          <strong>Uploaded:</strong>{" "}
                          {formatDate(detail.fulfillment.uploaded_at)}
                        </p>
                      </>
                    ) : (
                      <p>No fulfillment evidence was submitted.</p>
                    )}
                  </div>
                </section>

                <section className="admin-dispute-section">
                  <h3>Deal conversation ({detail.messages.length})</h3>

                  <div className="admin-dispute-chat">
                    {detail.messages.length === 0 && (
                      <div className="admin-disputes-state">
                        No room messages were recorded.
                      </div>
                    )}

                    {detail.messages.map((message) => (
                      <article
                        key={message.message_id}
                        className={[
                          "admin-dispute-message",
                          message.sender_id === detail.buyer.user_id
                            ? "is-buyer"
                            : "",
                        ].join(" ")}
                      >
                        <small>
                          User #{message.sender_id}
                          {" · "}
                          {formatDate(message.created_at)}
                        </small>

                        <p>{message.message}</p>
                      </article>
                    ))}
                  </div>
                </section>

                {detail.resolution && (
                  <section className="admin-dispute-section">
                    <h3>Final resolution</h3>

                    <div className="admin-dispute-resolution">
                      <p>
                        <strong>Decision:</strong> {detail.resolution.decision}
                      </p>

                      <p>
                        <strong>Admin note:</strong>{" "}
                        {detail.resolution.resolution_note}
                      </p>

                      <p>
                        <strong>Refund:</strong>{" "}
                        {formatMoney(detail.resolution.refund_amount)}
                      </p>

                      <p>
                        <strong>Seller release:</strong>{" "}
                        {formatMoney(detail.resolution.seller_release_amount)}
                      </p>

                      <p>
                        <strong>Retained fee:</strong>{" "}
                        {formatMoney(detail.resolution.retained_fee)}
                      </p>
                    </div>
                  </section>
                )}

                {isResolvable && (
                  <section className="admin-dispute-section">
                    <div className="admin-dispute-decision">
                      <h3>
                        <FaBalanceScale /> Final decision
                      </h3>

                      <label htmlFor="resolution-note">
                        Required resolution note
                      </label>

                      <textarea
                        id="resolution-note"
                        value={resolutionNote}
                        maxLength={2000}
                        placeholder={
                          "Explain the evidence and reason " +
                          "for this permanent decision..."
                        }
                        onChange={(event) =>
                          setResolutionNote(event.target.value)
                        }
                      />

                      <span className="admin-dispute-note-count">
                        {resolutionNote.length}/2000
                      </span>

                      <div className="admin-dispute-actions">
                        <button
                          type="button"
                          className="admin-dispute-action release"
                          disabled={resolving}
                          onClick={() => handleDecision("ReleaseToSeller")}
                        >
                          Release to Seller
                        </button>

                        <button
                          type="button"
                          className="admin-dispute-action refund"
                          disabled={resolving}
                          onClick={() => handleDecision("RefundBuyer")}
                        >
                          Refund Buyer
                        </button>

                        <button
                          type="button"
                          className="admin-dispute-action reject"
                          disabled={resolving}
                          onClick={() => handleDecision("RejectDispute")}
                        >
                          Reject Dispute
                        </button>
                      </div>

                      <p>
                        <FaShieldAlt /> Escrow remains locked until one decision
                        succeeds.
                      </p>
                    </div>
                  </section>
                )}
              </>
            )}
          </section>
        </div>
      </section>
    </AdminLayout>
  );
};

export default AdminDisputes;
