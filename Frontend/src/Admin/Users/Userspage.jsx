import { useCallback, useEffect, useRef, useState } from "react";

import AdminLayout from "../Components/Layout/AdminLayout";
import StatCard from "../Dashboard/Components/StatCard/StatCard";
import { socket } from "../../lib/socket";

import "./UsersPage.css";

const API_BASE = "http://127.0.0.1:8000";
const PER_PAGE = 10;

const initials = (fullname, email) => {
  if (fullname && fullname.trim()) {
    return fullname
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  }

  return (email || "?")[0]?.toUpperCase() || "?";
};

const UsersPage = () => {
  const [stats, setStats] = useState({ total: 0, online: 0, offline: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [selectedUser, setSelectedUser] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const searchDebounceRef = useRef(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/stats`, {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to load stats");
      }

      const data = await res.json();

      setStats({
        total: data.total ?? 0,
        online: data.online ?? 0,
        offline: data.offline ?? 0,
      });
    } catch (err) {
      console.error("Failed to fetch user stats:", err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async (searchTerm, pageNum) => {
    setUsersLoading(true);
    setErrorMessage("");

    try {
      const params = new URLSearchParams({
        page: String(pageNum),
        per_page: String(PER_PAGE),
      });

      if (searchTerm) {
        params.set("search", searchTerm);
      }

      const res = await fetch(
        `${API_BASE}/api/admin/users?${params.toString()}`,
        { credentials: "include" }
      );

      if (!res.ok) {
        throw new Error("Failed to load users");
      }

      const data = await res.json();

      setUsers(data.users || []);
      setPage(data.page || 1);
      setPages(data.pages || 1);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("Failed to fetch users:", err);
      setErrorMessage("Couldn't load users. Please try again.");
    } finally {
      setUsersLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchStats();
    fetchUsers("", 1);
  }, [fetchStats, fetchUsers]);

  // Debounced search — resets to page 1
  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(() => {
      fetchUsers(search, 1);
    }, 350);

    return () => clearTimeout(searchDebounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const goToPage = (nextPage) => {
    if (nextPage < 1 || nextPage > pages || nextPage === page) {
      return;
    }

    fetchUsers(search, nextPage);
  };

  // Live online/offline updates — patch in place, no refetch
  useEffect(() => {
    const handleStatusChanged = (data) => {
      if (!data?.user_id) {
        return;
      }

      const changedId = String(data.user_id);
      const nowOnline = data.status === "online";

      setUsers((prev) => {
        let matched = false;

        const next = prev.map((u) => {
          if (String(u.user_id) === changedId) {
            matched = true;
            return { ...u, online: nowOnline };
          }
          return u;
        });

        if (!matched) {
          return prev;
        }

        return next;
      });

      setSelectedUser((prev) =>
        prev && String(prev.user_id) === changedId
          ? { ...prev, online: nowOnline }
          : prev
      );

      setStats((prev) => {
        const delta = nowOnline ? 1 : -1;
        const online = Math.max(prev.online + delta, 0);
        const offline = Math.max(prev.total - online, 0);
        return { ...prev, online, offline };
      });
    };

    socket.on("user_status_changed", handleStatusChanged);

    return () => {
      socket.off("user_status_changed", handleStatusChanged);
    };
  }, []);

  const openUserDetail = async (userId) => {
    setDetailLoading(true);
    setSelectedUser({ user_id: userId });

    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${userId}`, {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to load user detail");
      }

      const data = await res.json();
      setSelectedUser(data);
    } catch (err) {
      console.error("Failed to fetch user detail:", err);
      setSelectedUser(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeModal = () => setSelectedUser(null);

  return (
    <AdminLayout>
      <div className="users-page">
        <div className="users-page-header">
          <h1>Users</h1>
          <p>Everyone who's signed up, and who's here right now.</p>
        </div>

        <div className="users-stats-grid">
          <StatCard
            title="Total Users"
            value={statsLoading ? "—" : stats.total}
            icon="👥"
            color="linear-gradient(135deg, #7C5CFF, #4C2FCB)"
          />
          <StatCard
            title="Online"
            value={statsLoading ? "—" : stats.online}
            icon="🟢"
            color="linear-gradient(135deg, #34D399, #059669)"
          />
          <StatCard
            title="Offline"
            value={statsLoading ? "—" : stats.offline}
            icon="⚪"
            color="linear-gradient(135deg, #6B7280, #374151)"
          />
        </div>

        <div className="users-table-card">
          <div className="users-table-toolbar">
            <input
              type="text"
              className="users-search-input"
              placeholder="Search by name, email, username, or phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span className="users-total-count">
              {total} user{total === 1 ? "" : "s"}
            </span>
          </div>

          {errorMessage && (
            <div className="users-error-banner">{errorMessage}</div>
          )}

          <div className="users-table-scroll">
            <table className="users-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Presence</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {usersLoading && (
                  <tr>
                    <td colSpan={6} className="users-table-empty">
                      Loading users…
                    </td>
                  </tr>
                )}

                {!usersLoading && users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="users-table-empty">
                      No users found.
                    </td>
                  </tr>
                )}

                {!usersLoading &&
                  users.map((u) => (
                    <tr key={u.user_id}>
                      <td>
                        <div className="users-name-cell">
                          <span className="users-avatar">
                            {u.profile_picture ? (
                              <img
                                src={u.profile_picture}
                                alt=""
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            ) : (
                              initials(u.fullname, u.email)
                            )}
                          </span>
                          <div className="users-name-text">
                            <span className="users-fullname">
                              {u.fullname || "Unnamed"}
                            </span>
                            {u.username && (
                              <span className="users-username">
                                @{u.username}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>{u.email}</td>
                      <td>{u.phonenumber || "—"}</td>
                      <td>
                        <span
                          className={`users-verify-badge users-verify-${(
                            u.verify_status || "none"
                          ).toLowerCase()}`}
                        >
                          {u.verify_status || "Not started"}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`users-presence-badge ${
                            u.online
                              ? "users-presence-online"
                              : "users-presence-offline"
                          }`}
                        >
                          <span className="users-presence-dot" />
                          {u.online ? "Online" : "Offline"}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="users-view-btn"
                          onClick={() => openUserDetail(u.user_id)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="users-pagination">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => goToPage(page - 1)}
            >
              Previous
            </button>
            <span>
              Page {page} of {pages}
            </span>
            <button
              type="button"
              disabled={page >= pages}
              onClick={() => goToPage(page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {selectedUser && (
        <div className="users-modal-overlay" onClick={closeModal}>
          <div
            className="users-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="users-modal-close"
              onClick={closeModal}
              aria-label="Close"
            >
              ×
            </button>

            {detailLoading ? (
              <div className="users-modal-loading">Loading…</div>
            ) : (
              <>
                <div className="users-modal-header">
                  <span className="users-avatar users-avatar-lg">
                    {selectedUser.profile_picture ? (
                      <img src={selectedUser.profile_picture} alt="" />
                    ) : (
                      initials(
                        `${selectedUser.firstname || ""} ${
                          selectedUser.lastname || ""
                        }`,
                        selectedUser.email
                      )
                    )}
                  </span>
                  <div>
                    <h2>
                      {selectedUser.firstname || selectedUser.lastname
                        ? `${selectedUser.firstname || ""} ${
                            selectedUser.lastname || ""
                          }`.trim()
                        : "Unnamed user"}
                    </h2>
                    <span
                      className={`users-presence-badge ${
                        selectedUser.online
                          ? "users-presence-online"
                          : "users-presence-offline"
                      }`}
                    >
                      <span className="users-presence-dot" />
                      {selectedUser.online ? "Online" : "Offline"}
                    </span>
                  </div>
                </div>

                <div className="users-modal-grid">
                  <div>
                    <span className="users-modal-label">User ID</span>
                    <span>{selectedUser.user_id}</span>
                  </div>
                  <div>
                    <span className="users-modal-label">Email</span>
                    <span>{selectedUser.email || "—"}</span>
                  </div>
                  <div>
                    <span className="users-modal-label">Username</span>
                    <span>{selectedUser.username || "—"}</span>
                  </div>
                  <div>
                    <span className="users-modal-label">Phone</span>
                    <span>{selectedUser.phonenumber || "—"}</span>
                  </div>
                  <div>
                    <span className="users-modal-label">
                      Verification status
                    </span>
                    <span>{selectedUser.verify_status || "Not started"}</span>
                  </div>
                  <div>
                    <span className="users-modal-label">Date of birth</span>
                    <span>{selectedUser.dob || "—"}</span>
                  </div>
                  <div className="users-modal-span-2">
                    <span className="users-modal-label">Address</span>
                    <span>{selectedUser.address || "—"}</span>
                  </div>
                  <div>
                    <span className="users-modal-label">Joined</span>
                    <span>
                      {selectedUser.joined_at
                        ? new Date(selectedUser.joined_at).toLocaleDateString()
                        : "—"}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default UsersPage;
