// frontend/src/components/views/PersonalSpaceView.tsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../../app/providers";
import { 
  User as UserIcon, Calendar, CheckSquare, 
  MessageSquare, Sparkles, BookOpen, Clock, Check
} from "lucide-react";

export const PersonalSpaceView: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"chat" | "calendar" | "tasks">("chat");
  
  // Notepad state (persists notes locally in browser per user session)
  const [personalNotes, setPersonalNotes] = useState("");
  const [saveStatus, setSaveStatus] = useState("Drafts saved locally");

  useEffect(() => {
    if (user?.id) {
      const stored = localStorage.getItem(`personal_notes_${user.id}`);
      if (stored) setPersonalNotes(stored);
    }
  }, [user]);

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setPersonalNotes(val);
    if (user?.id) {
      localStorage.setItem(`personal_notes_${user.id}`, val);
    }
    setSaveStatus("Saving...");
    setTimeout(() => setSaveStatus("All changes saved locally ✓"), 500);
  };

  return (
    <div style={{ padding: "24px 30px", height: "100%", overflowY: "auto", background: "rgba(0,0,0,0.06)", display: "grid", gridTemplateRows: "auto auto 1fr", gap: "20px" }}>
      
      {/* Header section with User Profile avatar */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <div 
          style={{ 
            width: "48px", height: "48px", borderRadius: "50%", 
            background: "linear-gradient(135deg, hsl(var(--primary-hsl)), hsl(var(--accent-hsl)))", 
            border: "2px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", 
            justifyContent: "center", fontSize: "18px", fontWeight: "bold", color: "white" 
          }}
        >
          {user?.fullName?.charAt(0).toUpperCase() || "U"}
        </div>
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: "700", color: "white", display: "flex", alignItems: "center", gap: "6px" }}>
            {user?.fullName || "Member"}
            <span style={{ fontSize: "10px", color: "hsl(var(--text-muted-hsl))", fontWeight: "400" }}>(Personal Space)</span>
          </h2>
          <p style={{ fontSize: "12px", color: "hsl(var(--text-muted-hsl))" }}>
            This is your private sandbox for drafting, brainstorming, and tracking ideas
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "12px", borderBottom: "1px solid hsl(var(--border-hsl))", paddingBottom: "4px" }}>
        <button
          onClick={() => setActiveTab("chat")}
          style={{
            background: "transparent", border: "none", fontSize: "13px", cursor: "pointer",
            color: activeTab === "chat" ? "hsl(var(--primary-light-hsl))" : "hsl(var(--text-secondary-hsl))",
            fontWeight: activeTab === "chat" ? "600" : "500",
            borderBottom: activeTab === "chat" ? "2px solid hsl(var(--primary-hsl))" : "none",
            padding: "6px 12px", transition: "all 0.2s"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <MessageSquare size={14} />
            Chat Notepad
          </div>
        </button>
        
        <button
          onClick={() => setActiveTab("calendar")}
          style={{
            background: "transparent", border: "none", fontSize: "13px", cursor: "pointer",
            color: activeTab === "calendar" ? "hsl(var(--primary-light-hsl))" : "hsl(var(--text-secondary-hsl))",
            fontWeight: activeTab === "calendar" ? "600" : "500",
            borderBottom: activeTab === "calendar" ? "2px solid hsl(var(--primary-hsl))" : "none",
            padding: "6px 12px", transition: "all 0.2s"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Calendar size={14} />
            My Calendar
          </div>
        </button>

        <button
          onClick={() => setActiveTab("tasks")}
          style={{
            background: "transparent", border: "none", fontSize: "13px", cursor: "pointer",
            color: activeTab === "tasks" ? "hsl(var(--primary-light-hsl))" : "hsl(var(--text-secondary-hsl))",
            fontWeight: activeTab === "tasks" ? "600" : "500",
            borderBottom: activeTab === "tasks" ? "2px solid hsl(var(--primary-hsl))" : "none",
            padding: "6px 12px", transition: "all 0.2s"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <CheckSquare size={14} />
            My Tasks
          </div>
        </button>
      </div>

      {/* TAB CONTENT */}
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        {activeTab === "chat" && (
          <div style={{ display: "grid", gridTemplateRows: "1fr auto", height: "100%", gap: "16px" }}>
            
            {/* Center Personal Space Hero + Textarea */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "20px", height: "100%", overflow: "hidden" }}>
              
              {/* Notepad textarea editor */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", height: "100%", overflow: "hidden" }}>
                <textarea
                  value={personalNotes}
                  onChange={handleNotesChange}
                  placeholder="Write draft messages, store code snippets, take daily notes, or dump scratch ideas here... Everything is fully persistent!"
                  className="input-field"
                  style={{
                    flex: 1, resize: "none", padding: "16px", fontSize: "14px",
                    fontFamily: "monospace", background: "rgba(0,0,0,0.25)",
                    border: "1px solid hsl(var(--border-hsl))", borderRadius: "var(--radius-md)",
                    color: "#cdd6f4", lineHeight: "1.6", outline: "none"
                  }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", color: "hsl(var(--text-muted-hsl))" }}>
                  <span>{personalNotes.length} Characters typed</span>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <Clock size={11} />
                    {saveStatus}
                  </span>
                </div>
              </div>

              {/* Side personal space detail card */}
              <div 
                className="card" 
                style={{ 
                  padding: "24px 20px", background: "hsl(var(--card-hsl))", border: "1px solid hsl(var(--border-hsl))", 
                  borderRadius: "var(--radius-lg)", display: "flex", flexDirection: "column", alignItems: "center", 
                  justifyContent: "center", textAlign: "center", gap: "16px", height: "fit-content" 
                }}
              >
                <div 
                  style={{ 
                    width: "48px", height: "48px", borderRadius: "50%", background: "rgba(139, 92, 246, 0.1)", 
                    border: "1px solid rgba(139, 92, 246, 0.2)", display: "flex", alignItems: "center", 
                    justifyContent: "center", color: "hsl(var(--primary-light-hsl))" 
                  }}
                >
                  <Sparkles size={22} />
                </div>
                
                <div>
                  <h4 style={{ fontSize: "14px", fontWeight: "600", color: "white" }}>This is your personal space</h4>
                  <p style={{ fontSize: "12px", color: "hsl(var(--text-muted-hsl))", marginTop: "6px", lineHeight: "1.5" }}>
                    It's just you and your brilliant ideas! Draft messages, set reminders, or store ideas and files for easy access later.
                  </p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", width: "100%", gap: "8px" }}>
                  <button 
                    onClick={() => alert("Profile View opened!")} 
                    className="btn btn-primary" 
                    style={{ width: "100%", height: "32px", fontSize: "12px", gap: "4px" }}
                  >
                    View Profile
                  </button>
                  <button 
                    onClick={() => setActiveTab("calendar")} 
                    className="btn btn-secondary" 
                    style={{ width: "100%", height: "32px", fontSize: "12px", gap: "4px", background: "rgba(255,255,255,0.03)" }}
                  >
                    View your calendar
                  </button>
                </div>
              </div>

            </div>

          </div>
        )}

        {activeTab === "calendar" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", minHeight: "300px", textAlign: "center" }}>
            <Calendar size={36} style={{ color: "hsl(var(--text-muted-hsl))", marginBottom: "12px" }} />
            <h4 style={{ color: "white", fontSize: "14.5px", fontWeight: "600", marginBottom: "4px" }}>Private Personal Calendar</h4>
            <p style={{ color: "hsl(var(--text-muted-hsl))", fontSize: "12px", maxWidth: "260px" }}>
              Connect Google Calendar or Microsoft Outlook inside the "My Tasks" view to load your schedule.
            </p>
          </div>
        )}

        {activeTab === "tasks" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", minHeight: "300px", textAlign: "center" }}>
            <CheckSquare size={36} style={{ color: "hsl(var(--text-muted-hsl))", marginBottom: "12px" }} />
            <h4 style={{ color: "white", fontSize: "14.5px", fontWeight: "600", marginBottom: "4px" }}>Private Reminders list</h4>
            <p style={{ color: "hsl(var(--text-muted-hsl))", fontSize: "12px", maxWidth: "260px" }}>
              No private reminders set. Create a reminder by typing inside your scratch Notepad!
            </p>
          </div>
        )}
      </div>

    </div>
  );
};
