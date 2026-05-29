import React, { useState } from "react";
import { Settings2, Play, Plus, Zap, AlertCircle, Trash2 } from "lucide-react";

export const AutomationEngine: React.FC = () => {
  const [automations, setAutomations] = useState([
    {
      id: "1",
      name: "Auto-assign High Priority Tasks ⚡",
      isEnabled: true,
      trigger: "TASK_PRIORITY_CHANGED",
      condition: "Priority equals HIGH",
      action: "Assign to Project Manager",
      runCount: 14,
    },
    {
      id: "2",
      name: "Slack notification on Status DONE",
      isEnabled: false,
      trigger: "TASK_STATUS_CHANGED",
      condition: "Status equals DONE",
      action: "Post message to #roadmap-announcements",
      runCount: 42,
    },
  ]);

  const [newAuto, setNewAuto] = useState({
    name: "",
    trigger: "TASK_CREATED",
    action: "SEND_NOTIFICATION",
  });
  const [addingAuto, setAddingAuto] = useState(false);

  const toggleAutomation = (id: string) => {
    setAutomations((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          return { ...a, isEnabled: !a.isEnabled };
        }
        return a;
      })
    );
  };

  const handleCreateAuto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAuto.name.trim()) return;

    const newObj = {
      id: Date.now().toString(),
      name: newAuto.name,
      isEnabled: true,
      trigger: newAuto.trigger,
      condition: "Any task matching triggers",
      action: newAuto.action,
      runCount: 0,
    };

    setAutomations([...automations, newObj]);
    setNewAuto({ name: "", trigger: "TASK_CREATED", action: "SEND_NOTIFICATION" });
    setAddingAuto(false);
  };

  return (
    <div style={{ padding: "24px", display: "flex", flexDirection: "column", height: "100%", overflowY: "auto" }}>
      {/* Header sections */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: "700" }}>Workflow Automations</h2>
          <p style={{ fontSize: "12px", color: "hsl(var(--text-muted-hsl))" }}>Configure event-driven workflows mapping custom trigger states to automated workspace actions.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setAddingAuto(true)}>
          <Plus size={16} />
          Create Automation
        </button>
      </div>

      {/* Creation form modal dialog */}
      {addingAuto && (
        <form onSubmit={handleCreateAuto} className="card glass-panel animate-slide-up" style={{ padding: "20px", borderRadius: "var(--radius-lg)", border: "1px solid hsl(var(--border-hsl))", display: "flex", flexDirection: "column", gap: "16px", marginBottom: "20px" }}>
          <h3 style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "15px", color: "hsl(var(--primary-light-hsl))" }}>
            <Zap size={16} />
            New Workflow Automation Builder
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "11px", fontWeight: "600", textTransform: "uppercase", color: "hsl(var(--text-muted-hsl))" }}>Automation Name</label>
            <input
              type="text"
              placeholder="e.g. notify slack on priority urgent..."
              value={newAuto.name}
              onChange={(e) => setNewAuto({ ...newAuto, name: e.target.value })}
              className="input-field"
              required
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "11px", fontWeight: "600", textTransform: "uppercase", color: "hsl(var(--text-muted-hsl))" }}>WHEN Event Triggers</label>
              <select
                value={newAuto.trigger}
                onChange={(e) => setNewAuto({ ...newAuto, trigger: e.target.value })}
                className="input-field"
                style={{ height: "36px" }}
              >
                <option value="TASK_CREATED">Task is created</option>
                <option value="TASK_STATUS_CHANGED">Status changes</option>
                <option value="TASK_PRIORITY_CHANGED">Priority changes</option>
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "11px", fontWeight: "600", textTransform: "uppercase", color: "hsl(var(--text-muted-hsl))" }}>THEN Run Action</label>
              <select
                value={newAuto.action}
                onChange={(e) => setNewAuto({ ...newAuto, action: e.target.value })}
                className="input-field"
                style={{ height: "36px" }}
              >
                <option value="SEND_NOTIFICATION">In-app alert</option>
                <option value="ASSIGN_USER">Assign standard user</option>
                <option value="SEND_EMAIL">Dispatch status email</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
            <button type="button" className="btn btn-secondary" onClick={() => setAddingAuto(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Publish flow</button>
          </div>
        </form>
      )}

      {/* Automations listing flow panel */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {automations.map((a) => (
          <div
            key={a.id}
            className="card glass-panel animate-fade-in"
            style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "20px", background: "rgba(10, 12, 18, 0.4)", borderRadius: "var(--radius-lg)", border: "1px solid hsl(var(--border-hsl))" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: a.isEnabled ? "rgba(142,70,229,0.15)" : "rgba(255,255,255,0.02)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid hsl(var(--border-hsl))" }}>
                  <Zap size={14} style={{ color: a.isEnabled ? "hsl(var(--primary-light-hsl))" : "hsl(var(--text-muted-hsl))" }} />
                </div>
                <div>
                  <h3 style={{ fontSize: "14.5px", fontWeight: "600", color: a.isEnabled ? "white" : "hsl(var(--text-muted-hsl))" }}>{a.name}</h3>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "hsl(var(--text-muted-hsl))", marginTop: "2px" }}>
                    <span>Trigger: {a.trigger}</span>
                    <span>•</span>
                    <span>Action: {a.action}</span>
                  </div>
                </div>
              </div>

              {/* Toggle Enable checkbox button */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "11px", fontWeight: "700", background: "rgba(255,255,255,0.04)", padding: "2px 6px", borderRadius: "var(--radius-sm)", color: "hsl(var(--text-muted-hsl))" }}>{a.runCount} runs</span>
                <button
                  onClick={() => toggleAutomation(a.id)}
                  style={{
                    width: "44px",
                    height: "22px",
                    borderRadius: "11px",
                    background: a.isEnabled ? "hsl(var(--success-hsl))" : "rgba(255,255,255,0.06)",
                    border: "1px solid hsl(var(--border-hsl))",
                    position: "relative",
                    cursor: "pointer",
                    transition: "var(--transition-smooth)",
                  }}
                >
                  <div
                    style={{
                      width: "16px",
                      height: "16px",
                      borderRadius: "50%",
                      background: "white",
                      position: "absolute",
                      top: "2px",
                      left: a.isEnabled ? "24px" : "2px",
                      transition: "var(--transition-smooth)",
                    }}
                  ></div>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
