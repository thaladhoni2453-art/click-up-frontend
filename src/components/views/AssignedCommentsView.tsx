// frontend/src/components/views/AssignedCommentsView.tsx
import React, { useState } from "react";
import { MessageSquare, ShieldAlert } from "lucide-react";

export const AssignedCommentsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"assigned" | "delegated">("assigned");

  return (
    <div style={{ padding: "24px 30px", height: "100%", overflowY: "auto", background: "rgba(0,0,0,0.08)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid hsl(var(--border-hsl))", paddingBottom: "16px", marginBottom: "24px" }}>
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: "600", color: "white" }}>Assigned Comments</h2>
          <p style={{ fontSize: "12px", color: "hsl(var(--text-muted-hsl))", marginTop: "2px" }}>
            Review tasks and docs comments requiring your action or delegated to others
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "16px", borderBottom: "1px solid hsl(var(--border-hsl))", paddingBottom: "8px", marginBottom: "24px" }}>
        <button
          onClick={() => setActiveTab("assigned")}
          style={{
            background: "transparent", border: "none", fontSize: "13px", cursor: "pointer",
            color: activeTab === "assigned" ? "hsl(var(--primary-light-hsl))" : "hsl(var(--text-secondary-hsl))",
            fontWeight: activeTab === "assigned" ? "600" : "400",
            borderBottom: activeTab === "assigned" ? "2px solid hsl(var(--primary-hsl))" : "none",
            padding: "6px 12px", transition: "all 0.2s"
          }}
        >
          Assigned to me
        </button>
        <button
          onClick={() => setActiveTab("delegated")}
          style={{
            background: "transparent", border: "none", fontSize: "13px", cursor: "pointer",
            color: activeTab === "delegated" ? "hsl(var(--primary-light-hsl))" : "hsl(var(--text-secondary-hsl))",
            fontWeight: activeTab === "delegated" ? "600" : "400",
            borderBottom: activeTab === "delegated" ? "2px solid hsl(var(--primary-hsl))" : "none",
            padding: "6px 12px", transition: "all 0.2s"
          }}
        >
          Delegated by me
        </button>
      </div>

      {/* Filter and Empty State */}
      <div style={{ display: "flex", flexDirection: "column", minHeight: "380px", alignItems: "center", justifyContent: "center" }}>
        {/* ClickUp Assigned comment empty icon illustration */}
        <div 
          style={{ 
            width: "60px", height: "60px", borderRadius: "50%", background: "rgba(255,255,255,0.03)", 
            border: "1px solid hsl(var(--border-hsl))", display: "flex", alignItems: "center", 
            justifyContent: "center", color: "hsl(var(--text-muted-hsl))", marginBottom: "16px" 
          }}
        >
          <MessageSquare size={26} />
        </div>

        <h3 style={{ color: "white", fontSize: "15px", fontWeight: "600", marginBottom: "4px" }}>No results found</h3>
        <p style={{ color: "hsl(var(--text-muted-hsl))", fontSize: "12px", marginBottom: "20px" }}>
          There are no resolved or unresolved comments currently assigned to you
        </p>

        <button 
          onClick={() => alert("Filters cleared!")}
          className="btn btn-secondary"
          style={{ padding: "6px 16px", fontSize: "12px", height: "32px", background: "rgba(255,255,255,0.04)" }}
        >
          Clear filters
        </button>
      </div>
    </div>
  );
};
