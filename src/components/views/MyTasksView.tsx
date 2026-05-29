// frontend/src/components/views/MyTasksView.tsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../../app/providers";
import { api } from "../../lib/api";
import { 
  Calendar, CheckCircle, Clock, ChevronRight, 
  Layers, Folder, CalendarDays, ExternalLink, ShieldAlert
} from "lucide-react";

export const MyTasksView: React.FC = () => {
  const { user } = useAuth();
  const [activeWorkTab, setActiveWorkTab] = useState<"todo" | "done" | "delegated">("todo");
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState("Welcome back");

  useEffect(() => {
    // Dynamic Greeting based on local time
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");

    // Fetch active task assignments
    const fetchTasks = async () => {
      try {
        const { data } = await api.get("/tasks?listId=demo-list");
        setTasks(data);
      } catch (e) {
        setTasks([
          { id: "demo-task-1", name: "Welcome to WaveWork! 🚀", priority: "NORMAL", status: { name: "TO DO", color: "#8E8E93" }, dueDate: new Date() },
          { id: "demo-task-2", name: "Configure dynamic websockets presença", priority: "HIGH", status: { name: "IN PROGRESS", color: "#007AFF" } },
          { id: "demo-task-3", name: "Establish Ethereal SMTP fallback logic", priority: "URGENT", status: { name: "TO DO", color: "#8E8E93" } }
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, []);

  const todoTasks = tasks.filter(t => t.status?.name !== "DONE");
  const doneTasks = tasks.filter(t => t.status?.name === "DONE");

  return (
    <div style={{ padding: "24px 30px", height: "100%", overflowY: "auto", background: "rgba(0,0,0,0.06)" }}>
      
      {/* Greetings Header */}
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: "700", color: "white", fontFamily: "var(--font-display)" }}>
          {greeting}, {user?.fullName || "Member"}
        </h1>
        <p style={{ fontSize: "12.5px", color: "hsl(var(--text-muted-hsl))", marginTop: "4px" }}>
          Here is your centralized workspace agenda for today
        </p>
      </div>

      {/* Recents list section */}
      <div style={{ marginBottom: "28px" }}>
        <h4 style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", color: "hsl(var(--text-muted-hsl))", marginBottom: "12px" }}>Recents</h4>
        <div style={{ display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "4px" }}>
          <div className="card" style={{ padding: "12px 16px", minWidth: "180px", background: "hsl(var(--card-hsl))", border: "1px solid hsl(var(--border-hsl))", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
            <Layers size={14} style={{ color: "hsl(var(--primary-light-hsl))" }} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "12.5px", fontWeight: "600", color: "white" }}>Roadmap List</span>
              <span style={{ fontSize: "10px", color: "hsl(var(--text-muted-hsl))" }}>Sprint tasks</span>
            </div>
          </div>

          <div className="card" style={{ padding: "12px 16px", minWidth: "180px", background: "hsl(var(--card-hsl))", border: "1px solid hsl(var(--border-hsl))", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
            <Folder size={14} style={{ color: "hsl(var(--warning-hsl))" }} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "12.5px", fontWeight: "600", color: "white" }}>Project Space</span>
              <span style={{ fontSize: "10px", color: "hsl(var(--text-muted-hsl))" }}>Active folder</span>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        
        {/* LEFT COLUMN: MY WORK CARD */}
        <div className="card" style={{ padding: "20px", background: "hsl(var(--card-hsl))", border: "1px solid hsl(var(--border-hsl))", borderRadius: "var(--radius-lg)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: "600", color: "white" }}>My Work</h3>
            <span style={{ fontSize: "11px", color: "hsl(var(--text-muted-hsl))" }}>{todoTasks.length} Pending</span>
          </div>

          {/* Work Tabs */}
          <div style={{ display: "flex", gap: "10px", borderBottom: "1px solid hsl(var(--border-hsl))", paddingBottom: "8px", marginBottom: "16px" }}>
            <button
              onClick={() => setActiveWorkTab("todo")}
              style={{
                background: "transparent", border: "none", fontSize: "12.5px", cursor: "pointer",
                color: activeWorkTab === "todo" ? "hsl(var(--primary-light-hsl))" : "hsl(var(--text-secondary-hsl))",
                fontWeight: activeWorkTab === "todo" ? "600" : "500",
                borderBottom: activeWorkTab === "todo" ? "2px solid hsl(var(--primary-hsl))" : "none",
                padding: "4px 8px"
              }}
            >
              To Do
            </button>
            <button
              onClick={() => setActiveWorkTab("done")}
              style={{
                background: "transparent", border: "none", fontSize: "12.5px", cursor: "pointer",
                color: activeWorkTab === "done" ? "hsl(var(--primary-light-hsl))" : "hsl(var(--text-secondary-hsl))",
                fontWeight: activeWorkTab === "done" ? "600" : "500",
                borderBottom: activeWorkTab === "done" ? "2px solid hsl(var(--primary-hsl))" : "none",
                padding: "4px 8px"
              }}
            >
              Done
            </button>
            <button
              onClick={() => setActiveWorkTab("delegated")}
              style={{
                background: "transparent", border: "none", fontSize: "12.5px", cursor: "pointer",
                color: activeWorkTab === "delegated" ? "hsl(var(--primary-light-hsl))" : "hsl(var(--text-secondary-hsl))",
                fontWeight: activeWorkTab === "delegated" ? "600" : "500",
                borderBottom: activeWorkTab === "delegated" ? "2px solid hsl(var(--primary-hsl))" : "none",
                padding: "4px 8px"
              }}
            >
              Delegated
            </button>
          </div>

          {/* Task lists container */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "300px", overflowY: "auto" }}>
            {activeWorkTab === "todo" && (
              todoTasks.length === 0 ? (
                <div style={{ textAlign: "center", color: "hsl(var(--text-muted-hsl))", fontSize: "12.5px", padding: "20px" }}>No tasks pending!</div>
              ) : (
                todoTasks.map((t) => (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.03)", borderRadius: "var(--radius-sm)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <CheckCircle size={14} style={{ color: "hsl(var(--text-muted-hsl))", cursor: "pointer" }} />
                      <span style={{ fontSize: "13px", color: "white" }}>{t.name}</span>
                    </div>
                    {t.priority && (
                      <span className="badge badge-priority-high" style={{ fontSize: "10px", padding: "2px 6px" }}>{t.priority}</span>
                    )}
                  </div>
                ))
              )
            )}

            {activeWorkTab === "done" && (
              doneTasks.length === 0 ? (
                <div style={{ textAlign: "center", color: "hsl(var(--text-muted-hsl))", fontSize: "12.5px", padding: "20px" }}>No completed tasks found.</div>
              ) : (
                doneTasks.map((t) => (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "rgba(255,255,255,0.01)", borderRadius: "var(--radius-sm)" }}>
                    <span style={{ fontSize: "13px", color: "hsl(var(--text-muted-hsl))", textDecoration: "line-through" }}>{t.name}</span>
                    <span style={{ fontSize: "10px", color: "hsl(var(--success-hsl))" }}>COMPLETED</span>
                  </div>
                ))
              )
            )}

            {activeWorkTab === "delegated" && (
              <div style={{ textAlign: "center", color: "hsl(var(--text-muted-hsl))", fontSize: "12.5px", padding: "20px" }}>No delegated assignments found.</div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: AGENDA & ASSIGNED TO ME */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* AGENDA CONNECTS CARD */}
          <div className="card" style={{ padding: "20px", background: "hsl(var(--card-hsl))", border: "1px solid hsl(var(--border-hsl))", borderRadius: "var(--radius-lg)" }}>
            <h3 style={{ fontSize: "15px", fontWeight: "600", color: "white", marginBottom: "16px" }}>Agenda</h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button 
                onClick={() => alert("Google Calendar Connect launched!")}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid hsl(var(--border-hsl))", borderRadius: "var(--radius-sm)", color: "white", cursor: "pointer" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <CalendarDays size={15} style={{ color: "#4285F4" }} />
                  <span style={{ fontSize: "12.5px" }}>Connect Google Calendar</span>
                </div>
                <ExternalLink size={12} style={{ color: "hsl(var(--text-muted-hsl))" }} />
              </button>

              <button 
                onClick={() => alert("Outlook Connect launched!")}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid hsl(var(--border-hsl))", borderRadius: "var(--radius-sm)", color: "white", cursor: "pointer" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <CalendarDays size={15} style={{ color: "#0078D4" }} />
                  <span style={{ fontSize: "12.5px" }}>Connect Microsoft Outlook</span>
                </div>
                <ExternalLink size={12} style={{ color: "hsl(var(--text-muted-hsl))" }} />
              </button>
            </div>
          </div>

          {/* ASSIGNED TO ME CARD */}
          <div className="card" style={{ padding: "20px", background: "hsl(var(--card-hsl))", border: "1px solid hsl(var(--border-hsl))", borderRadius: "var(--radius-lg)" }}>
            <h3 style={{ fontSize: "15px", fontWeight: "600", color: "white", marginBottom: "14px" }}>Assigned to me</h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {todoTasks.slice(0, 3).map((t) => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "4px 0" }}>
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: t.priority === "URGENT" || t.priority === "HIGH" ? "hsl(var(--error-hsl))" : "hsl(var(--primary-hsl))" }}></div>
                  <span style={{ fontSize: "13px", color: "hsl(var(--text-secondary-hsl))" }}>{t.name}</span>
                </div>
              ))}
              {todoTasks.length === 0 && (
                <div style={{ color: "hsl(var(--text-muted-hsl))", fontSize: "12.5px", fontStyle: "italic" }}>No tasks assigned.</div>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
