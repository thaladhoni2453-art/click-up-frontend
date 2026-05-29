// frontend/src/components/views/RepliesView.tsx
import React, { useState } from "react";
import { MessageSquare, Inbox, Eye } from "lucide-react";

export const RepliesView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"unread" | "read">("unread");

  return (
    <div style={{ padding: "24px 30px", height: "100%", overflowY: "auto", background: "rgba(0,0,0,0.08)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid hsl(var(--border-hsl))", paddingBottom: "16px", marginBottom: "24px" }}>
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: "600", color: "white" }}>Replies</h2>
          <p style={{ fontSize: "12px", color: "hsl(var(--text-muted-hsl))", marginTop: "2px" }}>
            Track comments, replies, and threads you are participating in
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "16px", borderBottom: "1px solid hsl(var(--border-hsl))", paddingBottom: "8px", marginBottom: "24px" }}>
        <button
          onClick={() => setActiveTab("unread")}
          style={{
            background: "transparent", border: "none", fontSize: "13px", cursor: "pointer",
            color: activeTab === "unread" ? "hsl(var(--primary-light-hsl))" : "hsl(var(--text-secondary-hsl))",
            fontWeight: activeTab === "unread" ? "600" : "400",
            borderBottom: activeTab === "unread" ? "2px solid hsl(var(--primary-hsl))" : "none",
            padding: "6px 12px", transition: "all 0.2s"
          }}
        >
          Unread
        </button>
        <button
          onClick={() => setActiveTab("read")}
          style={{
            background: "transparent", border: "none", fontSize: "13px", cursor: "pointer",
            color: activeTab === "read" ? "hsl(var(--primary-light-hsl))" : "hsl(var(--text-secondary-hsl))",
            fontWeight: activeTab === "read" ? "600" : "400",
            borderBottom: activeTab === "read" ? "2px solid hsl(var(--primary-hsl))" : "none",
            padding: "6px 12px", transition: "all 0.2s"
          }}
        >
          Read
        </button>
      </div>

      {/* Content Canvas */}
      {activeTab === "unread" ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "350px", textAlign: "center", padding: "40px" }}>
          {/* Card stack illustration container */}
          <div style={{ position: "relative", width: "100px", height: "80px", marginBottom: "20px" }}>
            <div style={{ position: "absolute", width: "60px", height: "40px", background: "rgba(139, 92, 246, 0.1)", border: "1px solid rgba(139, 92, 246, 0.2)", borderRadius: "6px", top: "10px", left: "10px", transform: "rotate(-10deg)" }}></div>
            <div style={{ position: "absolute", width: "60px", height: "40px", background: "rgba(139, 92, 246, 0.15)", border: "1px solid rgba(139, 92, 246, 0.25)", borderRadius: "6px", top: "5px", left: "20px", transform: "rotate(5deg)" }}></div>
            <div style={{ position: "absolute", width: "60px", height: "40px", background: "rgba(139, 92, 246, 0.25)", border: "1px solid rgba(139, 92, 246, 0.4)", borderRadius: "6px", top: "15px", left: "25px", display: "flex", alignItems: "center", justifyContent: "center", color: "hsl(var(--primary-light-hsl))" }}>
              <Eye size={16} />
            </div>
          </div>

          <h3 style={{ color: "white", fontSize: "16px", fontWeight: "600", marginBottom: "6px" }}>You're all caught up!</h3>
          <p style={{ color: "hsl(var(--text-muted-hsl))", fontSize: "13px", marginBottom: "24px", maxWidth: "280px", lineHeight: "1.4" }}>
            Looks like you don't have any unread replies
          </p>

          <button 
            onClick={() => setActiveTab("read")}
            className="btn btn-primary"
            style={{ padding: "8px 18px", fontSize: "13px", height: "36px", background: "linear-gradient(135deg, hsl(var(--primary-hsl)), hsl(var(--accent-hsl)))" }}
          >
            Read old replies
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "800px" }}>
          {/* Mock read replies */}
          <div className="card" style={{ padding: "16px 20px", background: "rgba(22, 24, 35, 0.4)", border: "1px solid hsl(var(--border-hsl))", borderRadius: "var(--radius-md)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontWeight: "600", fontSize: "13px", color: "white" }}>Sarah Jenkins</span>
              <span style={{ fontSize: "11px", color: "hsl(var(--text-muted-hsl))" }}>3 days ago</span>
            </div>
            <p style={{ fontSize: "13px", color: "hsl(var(--text-secondary-hsl))", lineHeight: "1.4" }}>
              "Let's finalize the landing page grid spacing first. The responsive breakpoint looks slightly off on smaller resolutions."
            </p>
          </div>

          <div className="card" style={{ padding: "16px 20px", background: "rgba(22, 24, 35, 0.4)", border: "1px solid hsl(var(--border-hsl))", borderRadius: "var(--radius-md)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontWeight: "600", fontSize: "13px", color: "white" }}>Alex Carter</span>
              <span style={{ fontSize: "11px", color: "hsl(var(--text-muted-hsl))" }}>Last week</span>
            </div>
            <p style={{ fontSize: "13px", color: "hsl(var(--text-secondary-hsl))", lineHeight: "1.4" }}>
              "Just merged the authentication proxy controllers. Tested JWT token refreshes offline and they work stably."
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
