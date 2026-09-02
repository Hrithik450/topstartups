"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Product {
  id: number;
  rank: number;
  companyName: string;
  url: string;
  category: string | null;
  pricePaid: number;
  claimedAt: string | null;
}

interface UserItem {
  id: number;
  email: string;
  name: string | null;
  phone: string | null;
  createdAt: string;
  productCount: number;
  products: Product[];
}

interface AdminStats {
  totalUsers: number;
  totalClaimedFloors: number;
  availableFloors: number;
  totalRevenue: number;
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Check existing session
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/admin/users");
      if (res.status === 401) {
        setIsAuthenticated(false);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setIsAuthenticated(true);
        setStats(data.stats);
        setUsers(data.users || []);
      } else {
        setIsAuthenticated(false);
      }
    } catch {
      setIsAuthenticated(false);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Invalid admin credentials");
      }

      setIsAuthenticated(true);
      fetchUsers();
    } catch (err: any) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    setIsAuthenticated(false);
    setUsers([]);
    setStats(null);
  };

  // Filtered users by search query
  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const matchUser =
      u.email.toLowerCase().includes(q) ||
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.phone && u.phone.toLowerCase().includes(q));
    const matchProduct = u.products.some(
      (p) =>
        p.companyName.toLowerCase().includes(q) ||
        p.url.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q))
    );
    return matchUser || matchProduct;
  });

  // Loading state
  if (isAuthenticated === null) {
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: "center", color: "#9ca3af" }}>Checking admin credentials...</div>
      </div>
    );
  }

  // ─── LOGIN SCREEN ───
  if (!isAuthenticated) {
    return (
      <div style={containerStyle}>
        <div style={loginCardStyle}>
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <div style={{ fontSize: "36px", marginBottom: "8px" }}>🏢</div>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#fff", margin: 0 }}>
              GeTopFloor Admin
            </h1>
            <p style={{ fontSize: "13px", color: "#9ca3af", marginTop: "4px" }}>
              Sign in to manage registered founders and skyscraper products
            </p>
          </div>

          {loginError && (
            <div style={errorBadgeStyle}>
              ⚠ {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={labelStyle}>Admin Email</label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="admin@getopfloor.com"
                style={inputStyle}
                autoFocus
              />
            </div>

            <div>
              <label style={labelStyle}>Admin Password</label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                style={inputStyle}
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading || !loginEmail || !loginPassword}
              style={submitBtnStyle}
            >
              {loginLoading ? "Signing in..." : "Sign In to Admin"}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: "20px" }}>
            <Link href="/" style={{ color: "#6b7280", fontSize: "12px", textDecoration: "none" }}>
              ← Return to Skyscraper Tower
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── DASHBOARD SCREEN ───
  return (
    <div style={{ minHeight: "100vh", background: "#060913", color: "#fff", padding: "24px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Top Navigation */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingBottom: "20px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            marginBottom: "28px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "28px" }}>🏢</span>
            <div>
              <h1 style={{ fontSize: "20px", fontWeight: 700, margin: 0 }}>
                GeTopFloor Admin Dashboard
              </h1>
              <span style={{ fontSize: "12px", color: "#9ca3af" }}>
                Founder Accounts & Product Ranks
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Link
              href="/"
              style={{
                color: "#9ca3af",
                fontSize: "13px",
                textDecoration: "none",
                padding: "8px 14px",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              View Skyscraper ↗
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              style={{
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#f87171",
                padding: "8px 14px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* 4 Summary Stat Cards */}
        {stats && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "16px",
              marginBottom: "28px",
            }}
          >
            <div style={statCardStyle}>
              <span style={{ fontSize: "13px", color: "#9ca3af" }}>Registered Founders</span>
              <div style={{ fontSize: "28px", fontWeight: 800, color: "#fff", marginTop: "4px" }}>
                {stats.totalUsers}
              </div>
            </div>

            <div style={statCardStyle}>
              <span style={{ fontSize: "13px", color: "#9ca3af" }}>Claimed Skyscraper Floors</span>
              <div style={{ fontSize: "28px", fontWeight: 800, color: "#ff6b1a", marginTop: "4px" }}>
                {stats.totalClaimedFloors} <span style={{ fontSize: "14px", color: "#6b7280" }}>/ 50</span>
              </div>
            </div>

            <div style={statCardStyle}>
              <span style={{ fontSize: "13px", color: "#9ca3af" }}>Available Floors</span>
              <div style={{ fontSize: "28px", fontWeight: 800, color: "#34d399", marginTop: "4px" }}>
                {stats.availableFloors}
              </div>
            </div>

            <div style={statCardStyle}>
              <span style={{ fontSize: "13px", color: "#9ca3af" }}>Total Revenue Collected</span>
              <div style={{ fontSize: "28px", fontWeight: 800, color: "#a78bfa", marginTop: "4px" }}>
                ₹{stats.totalRevenue.toLocaleString("en-IN")}
              </div>
            </div>
          </div>
        )}

        {/* Table Controls & Search */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            marginBottom: "16px",
          }}
        >
          <div style={{ position: "relative", minWidth: "300px", flex: 1, maxWidth: "480px" }}>
            <input
              type="text"
              placeholder="Search by founder name, email, phone, or startup..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "10px",
                padding: "10px 14px",
                color: "#fff",
                fontSize: "13px",
                outline: "none",
              }}
            />
          </div>

          <button
            type="button"
            onClick={fetchUsers}
            disabled={loadingUsers}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#fff",
              padding: "10px 16px",
              borderRadius: "10px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {loadingUsers ? "Refreshing..." : "↻ Refresh"}
          </button>
        </div>

        {/* Users & Products Table */}
        <div
          style={{
            background: "#0c1322",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "16px",
            overflow: "hidden",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  <th style={thStyle}>Founder / User</th>
                  <th style={thStyle}>Contact Number</th>
                  <th style={thStyle}>Floors Owned</th>
                  <th style={thStyle}>Claimed Startups / Products</th>
                  <th style={thStyle}>Joined Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: "40px 20px", textAlign: "center", color: "#6b7280" }}>
                      {searchQuery ? "No matching founders or products found." : "No registered users yet."}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                        transition: "background 0.15s",
                      }}
                    >
                      {/* Founder info */}
                      <td style={tdStyle}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div
                            style={{
                              width: "34px",
                              height: "34px",
                              borderRadius: "50%",
                              background: "linear-gradient(135deg, #ff6b1a, #ea580c)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 700,
                              fontSize: "14px",
                              color: "#fff",
                              flexShrink: 0,
                            }}
                          >
                            {(u.name?.[0] || u.email[0] || "U").toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: "#fff" }}>
                              {u.name || "Founder"}
                            </div>
                            <div style={{ color: "#9ca3af", fontSize: "12px" }}>
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact phone */}
                      <td style={tdStyle}>
                        {u.phone ? (
                          <a
                            href={`tel:${u.phone}`}
                            style={{
                              color: "#818cf8",
                              textDecoration: "none",
                              fontFamily: "monospace",
                              fontSize: "12px",
                            }}
                          >
                            📞 {u.phone}
                          </a>
                        ) : (
                          <span style={{ color: "#4b5563" }}>—</span>
                        )}
                      </td>

                      {/* Product count */}
                      <td style={tdStyle}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 10px",
                            borderRadius: "9999px",
                            fontSize: "12px",
                            fontWeight: 600,
                            background: u.productCount > 0 ? "rgba(16, 185, 129, 0.15)" : "rgba(255,255,255,0.06)",
                            color: u.productCount > 0 ? "#34d399" : "#9ca3af",
                            border: u.productCount > 0 ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(255,255,255,0.08)",
                          }}
                        >
                          {u.productCount} {u.productCount === 1 ? "floor" : "floors"}
                        </span>
                      </td>

                      {/* Products list */}
                      <td style={tdStyle}>
                        {u.products.length === 0 ? (
                          <span style={{ color: "#6b7280", fontStyle: "italic" }}>No active floors</span>
                        ) : (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                            {u.products.map((p) => (
                              <a
                                key={p.id}
                                href={p.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  background: "rgba(255, 107, 26, 0.12)",
                                  border: "1px solid rgba(255, 107, 26, 0.3)",
                                  padding: "4px 8px",
                                  borderRadius: "6px",
                                  color: "#ffedd5",
                                  textDecoration: "none",
                                  fontSize: "12px",
                                  fontWeight: 500,
                                }}
                              >
                                <span style={{ color: "#ff6b1a", fontWeight: 700 }}>#{p.rank}</span>
                                <span>{p.companyName}</span>
                                <span style={{ color: "#9ca3af", fontSize: "11px" }}>(₹{p.pricePaid})</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Joined Date */}
                      <td style={{ ...tdStyle, color: "#9ca3af", whiteSpace: "nowrap" }}>
                        {new Date(u.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── STYLES ───
const containerStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#060913",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
  fontFamily: "inherit",
};

const loginCardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "420px",
  background: "#0d1525",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "20px",
  padding: "32px",
  boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
};

const statCardStyle: React.CSSProperties = {
  background: "#0c1322",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "14px",
  padding: "16px 20px",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "#9ca3af",
  marginBottom: "6px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "10px",
  padding: "11px 14px",
  color: "#fff",
  fontSize: "14px",
  outline: "none",
};

const submitBtnStyle: React.CSSProperties = {
  width: "100%",
  background: "linear-gradient(135deg, #ff7a29, #ff5500)",
  color: "#fff",
  border: "none",
  borderRadius: "10px",
  padding: "12px",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
  marginTop: "8px",
};

const errorBadgeStyle: React.CSSProperties = {
  padding: "10px 14px",
  background: "rgba(239, 68, 68, 0.15)",
  border: "1px solid rgba(239, 68, 68, 0.3)",
  color: "#f87171",
  borderRadius: "8px",
  fontSize: "13px",
  marginBottom: "16px",
};

const thStyle: React.CSSProperties = {
  padding: "12px 16px",
  fontWeight: 600,
  color: "#9ca3af",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const tdStyle: React.CSSProperties = {
  padding: "14px 16px",
  verticalAlign: "middle",
};
