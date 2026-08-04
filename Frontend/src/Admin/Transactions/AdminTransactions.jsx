import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  FaChartLine,
  FaCoins,
  FaMoneyBillWave,
  FaReceipt,
} from "react-icons/fa";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import AdminLayout from "../Components/Layout/AdminLayout";
import { getAdminTransactionReport } from "../../lib/adminTransactions";

import "./AdminTransactions.css";


const PERIODS = [
  {
    value: "today",
    label: "Today",
  },
  {
    value: "week",
    label: "This Week",
  },
  {
    value: "month",
    label: "This Month",
  },
  {
    value: "year",
    label: "This Year",
  },
];


const EMPTY_REPORT = {
  summary: {
    transaction_count: 0,
    gross_volume: 0,
    platform_income: 0,
    seller_payout: 0,
  },
  series: [],
  transactions: [],
  pagination: {
    page: 1,
    per_page: 25,
    total: 0,
  },
};


const formatMoney = (value) => {
  return Number(value || 0).toLocaleString(
    "en-US",
    {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }
  );
};


const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString();
};


const AdminTransactions = () => {
  const [period, setPeriod] = useState("month");
  const [page, setPage] = useState(1);
  const [report, setReport] = useState(EMPTY_REPORT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReport = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getAdminTransactionReport({
        period,
        page,
        perPage: 25,
      });

      setReport({
        summary: data.summary || EMPTY_REPORT.summary,
        series: data.series || [],
        transactions: data.transactions || [],
        pagination: (
          data.pagination
          || EMPTY_REPORT.pagination
        ),
      });
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [page, period]);

  useEffect(() => {
    const initialLoadTimer = window.setTimeout(() => {
      loadReport();
    }, 0);

    const handleTransactionUpdated = () => {
      loadReport();
    };

    window.addEventListener(
      "admin-transaction-updated",
      handleTransactionUpdated
    );

    return () => {
      window.clearTimeout(initialLoadTimer);

      window.removeEventListener(
        "admin-transaction-updated",
        handleTransactionUpdated
      );
    };
  }, [loadReport]);

  const selectPeriod = (nextPeriod) => {
    setPeriod(nextPeriod);
    setPage(1);
  };

  const totalPages = Math.max(
    1,
    Math.ceil(
      report.pagination.total
      / report.pagination.per_page
    )
  );

  return (
    <AdminLayout>
      <section className="admin-transactions-page">
        <header className="admin-transactions-header">
          <div>
            <span className="admin-transactions-eyebrow">
              Financial reporting
            </span>

            <h1>Transactions</h1>

            <p>
              Review completed escrow deals, volume,
              seller payouts, and platform income.
            </p>
          </div>

          <div
            className="admin-period-filter"
            aria-label="Transaction report period"
          >
            {PERIODS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={
                  period === option.value
                    ? "admin-period-button active"
                    : "admin-period-button"
                }
                onClick={() =>
                  selectPeriod(option.value)
                }
              >
                {option.label}
              </button>
            ))}
          </div>
        </header>

        {error && (
          <div className="admin-transactions-error">
            {error}
          </div>
        )}

        <div className="admin-transaction-stats">
          <article className="admin-transaction-stat">
            <span className="admin-stat-icon purple">
              <FaReceipt />
            </span>

            <div>
              <span>Completed transactions</span>
              <strong>
                {report.summary.transaction_count}
              </strong>
            </div>
          </article>

          <article className="admin-transaction-stat">
            <span className="admin-stat-icon blue">
              <FaMoneyBillWave />
            </span>

            <div>
              <span>Gross volume</span>
              <strong>
                {formatMoney(
                  report.summary.gross_volume
                )}
              </strong>
            </div>
          </article>

          <article className="admin-transaction-stat">
            <span className="admin-stat-icon green">
              <FaCoins />
            </span>

            <div>
              <span>Seller payouts</span>
              <strong>
                {formatMoney(
                  report.summary.seller_payout
                )}
              </strong>
            </div>
          </article>

          <article className="admin-transaction-stat">
            <span className="admin-stat-icon pink">
              <FaChartLine />
            </span>

            <div>
              <span>Platform income</span>
              <strong>
                {formatMoney(
                  report.summary.platform_income
                )}
              </strong>
            </div>
          </article>
        </div>

        <section className="admin-transaction-chart-card">
          <div className="admin-section-heading">
            <div>
              <h2>Transaction comparison</h2>
              <p>
                Completed deal count and gross transaction
                volume for the selected period.
              </p>
            </div>
          </div>

          <div className="admin-transaction-chart">
            {loading ? (
              <div className="admin-transactions-state">
                Loading transaction report…
              </div>
            ) : (
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <ComposedChart data={report.series}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(148, 163, 184, 0.16)"
                  />

                  <XAxis
                    dataKey="label"
                    stroke="#94a3b8"
                    tick={{
                      fill: "#94a3b8",
                      fontSize: 12,
                    }}
                  />

                  <YAxis
                    yAxisId="count"
                    allowDecimals={false}
                    stroke="#a855f7"
                    tick={{
                      fill: "#94a3b8",
                      fontSize: 12,
                    }}
                  />

                  <YAxis
                    yAxisId="money"
                    orientation="right"
                    stroke="#38bdf8"
                    tick={{
                      fill: "#94a3b8",
                      fontSize: 12,
                    }}
                    tickFormatter={(value) => `$${value}`}
                  />

                  <Tooltip
                    contentStyle={{
                      background: "#171127",
                      border: (
                        "1px solid "
                        + "rgba(168, 85, 247, 0.45)"
                      ),
                      borderRadius: "12px",
                      color: "#f8fafc",
                    }}
                    formatter={(value, name) => {
                      if (name === "Gross volume") {
                        return [
                          formatMoney(value),
                          name,
                        ];
                      }

                      return [value, name];
                    }}
                  />

                  <Legend />

                  <Bar
                    yAxisId="count"
                    dataKey="transaction_count"
                    name="Transactions"
                    fill="#a855f7"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={46}
                  />

                  <Line
                    yAxisId="money"
                    type="monotone"
                    dataKey="gross_volume"
                    name="Gross volume"
                    stroke="#38bdf8"
                    strokeWidth={3}
                    dot={{
                      fill: "#38bdf8",
                      r: 4,
                    }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="admin-transaction-table-card">
          <div className="admin-section-heading">
            <div>
              <h2>Completed transaction records</h2>
              <p>
                Only deals that reached completion are
                permanently recorded here.
              </p>
            </div>

            <span className="admin-record-count">
              {report.pagination.total} record
              {report.pagination.total === 1 ? "" : "s"}
            </span>
          </div>

          <div className="admin-transaction-table-wrap">
            <table className="admin-transaction-table">
              <thead>
                <tr>
                  <th>Transaction</th>
                  <th>Room</th>
                  <th>Buyer</th>
                  <th>Seller</th>
                  <th>Amount</th>
                  <th>Fee</th>
                  <th>Seller receives</th>
                  <th>Payment</th>
                  <th>Completed</th>
                </tr>
              </thead>

              <tbody>
                {!loading
                  && report.transactions.length === 0 && (
                  <tr>
                    <td
                      colSpan="9"
                      className="admin-empty-table"
                    >
                      No completed transactions were found
                      for this period.
                    </td>
                  </tr>
                )}

                {report.transactions.map(
                  (transaction) => (
                    <tr key={transaction.transaction_id}>
                      <td>
                        <strong>
                          #{transaction.transaction_id}
                        </strong>

                        <span>
                          {transaction.item_name || "Deal"}
                        </span>
                      </td>

                      <td>{transaction.room_code || "—"}</td>

                      <td>
                        <strong>
                          {transaction.buyer.name}
                        </strong>

                        <span>
                          {transaction.buyer.email}
                        </span>
                      </td>

                      <td>
                        <strong>
                          {transaction.seller.name}
                        </strong>

                        <span>
                          {transaction.seller.email}
                        </span>
                      </td>

                      <td>
                        {formatMoney(
                          transaction.transaction_amount
                        )}
                      </td>

                      <td>
                        {formatMoney(
                          transaction.fee_amount
                        )}

                        <span>
                          Paid by{" "}
                          {transaction.fee_payer || "—"}
                        </span>
                      </td>

                      <td>
                        {formatMoney(
                          transaction.seller_receive
                        )}
                      </td>

                      <td>
                        {transaction.payment_provider || "—"}
                      </td>

                      <td>
                        {formatDate(
                          transaction.completed_at
                        )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>

          <footer className="admin-transaction-pagination">
            <button
              type="button"
              onClick={() =>
                setPage((current) =>
                  Math.max(1, current - 1)
                )
              }
              disabled={loading || page <= 1}
            >
              Previous
            </button>

            <span>
              Page {page} of {totalPages}
            </span>

            <button
              type="button"
              onClick={() =>
                setPage((current) =>
                  Math.min(totalPages, current + 1)
                )
              }
              disabled={
                loading || page >= totalPages
              }
            >
              Next
            </button>
          </footer>
        </section>
      </section>
    </AdminLayout>
  );
};

export default AdminTransactions;