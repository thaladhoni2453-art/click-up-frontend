// frontend/src/components/views/InboxView.tsx
import React, { useState, useEffect } from "react";
import { useUIStore } from "../../stores/uiStore";
import { api } from "../../lib/api";
import { useAuth } from "../../app/providers";
import { useQueryClient } from "@tanstack/react-query";
import { 
  Inbox, Mail, Check, X, Sparkles, Clock, 
  UserPlus, MessageCircle, HelpCircle, CheckCircle
} from "lucide-react";

export const InboxView: React.FC = () => {
  const { user } = useAuth();
  const { setActiveViewId, setActiveChannelId, setActiveDocId } = useUIStore();
  const queryClient = useQueryClient();
  
  // Tab states
  const [activeTab, setActiveTab] = useState<"primary" | "other" | "later" | "cleared">("primary");
  
  // Inbox data states
  const [inboxItems, setInboxItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite inline dialog states
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);

  const fetchInbox = async () => {
    try {
      const { data } = await api.get("/extra/inbox");
      setInboxItems(data);
    } catch (e) {
      console.error("Failed to load inbox", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInbox();
  }, []);

  const handleAcceptInvite = async (itemId: string, chatId?: string) => {
    try {
      await api.post(`/extra/inbox/${itemId}/accept`);
      fetchInbox();
      
      // Invalidate channels query to refresh the sidebar immediately!
      queryClient.invalidateQueries({ queryKey: ["channels"] });

      // Automatically pivot to the DM chat room instantly!
      if (chatId) {
        setActiveDocId(null);
        setActiveChannelId(chatId);
        setActiveViewId("chat");
      }
    } catch (e) {
      console.error("Failed to accept invitation", e);
    }
  };

  const handleDeclineInvite = async (itemId: string) => {
    try {
      await api.post(`/extra/inbox/${itemId}/accept`); // Resolves notification
      fetchInbox();
    } catch (e) {
      console.error("Failed to resolve invitation", e);
    }
  };

  const handleSendInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setSendingInvite(true);
    setInviteSuccessMsg("");

    try {
      const { data } = await api.post("/extra/invites", {
        email: inviteEmail,
        fullName: inviteName
      });

      setInviteSuccessMsg(`Invitation successfully sent to ${inviteEmail}!`);
      setInviteEmail("");
      setInviteName("");
      fetchInbox();

      // Automatically route to the new DM chat
      if (data.channelId) {
        setTimeout(() => {
          setShowInviteDialog(false);
          setActiveDocId(null);
          setActiveChannelId(data.channelId);
          setActiveViewId("chat");
        }, 1500);
      }
    } catch (err) {
      console.error("Failed to invite via mail", err);
    } finally {
      setSendingInvite(false);
    }
  };

  const unreadPrimaryInvites = inboxItems.filter((i) => !i.isRead);
  const readPrimaryInvites = inboxItems.filter((i) => i.isRead);

  return (
    <div style={{ padding: "24px 30px", height: "100%", overflowY: "auto", background: "rgba(0,0,0,0.08)", display: "flex", flexDirection: "column" }}>
      
      {/* Header section */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid hsl(var(--border-hsl))", paddingBottom: "16px", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Inbox size={20} style={{ color: "hsl(var(--primary-light-hsl))" }} />
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: "600", color: "white" }}>Inbox</h2>
            <p style={{ fontSize: "12px", color: "hsl(var(--text-muted-hsl))", marginTop: "2px" }}>
              Accept workspace chat requests and track team invitations
            </p>
          </div>
        </div>

        {unreadPrimaryInvites.length > 0 && (
          <span className="badge badge-priority-high" style={{ padding: "4px 10px", fontSize: "11px" }}>
            {unreadPrimaryInvites.length} Unread Invite{unreadPrimaryInvites.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* ClickUp-style unified tabs bar */}
      <div style={{ display: "flex", gap: "16px", borderBottom: "1px solid hsl(var(--border-hsl))", paddingBottom: "8px", marginBottom: "24px" }}>
        {["primary", "other", "later", "cleared"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            style={{
              background: "transparent", border: "none", fontSize: "13px", cursor: "pointer",
              color: activeTab === tab ? "hsl(var(--primary-light-hsl))" : "hsl(var(--text-secondary-hsl))",
              fontWeight: activeTab === tab ? "600" : "500",
              borderBottom: activeTab === tab ? "2px solid hsl(var(--primary-hsl))" : "none",
              padding: "6px 12px", textTransform: "capitalize", transition: "all 0.2s"
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Main Inbox content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", width: "100%" }}>
        
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "hsl(var(--text-muted-hsl))" }}>
            Loading notification feed...
          </div>
        ) : activeTab === "primary" ? (
          
          unreadPrimaryInvites.length === 0 ? (
            /* EXACT CLICKUP INBOX EMPTY STATE ILLUSTRATION */
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "340px", textAlign: "center" }}>
              <div 
                style={{ 
                  width: "64px", height: "64px", borderRadius: "50%", 
                  background: "rgba(139, 92, 246, 0.1)", border: "1px solid rgba(139, 92, 246, 0.2)", 
                  display: "flex", alignItems: "center", justifyContent: "center", 
                  color: "hsl(var(--primary-light-hsl))", marginBottom: "18px" 
                }}
              >
                <UserPlus size={28} />
              </div>
              
              <h3 style={{ color: "white", fontSize: "16px", fontWeight: "600", marginBottom: "6px" }}>Looking to collaborate?</h3>
              <p style={{ color: "hsl(var(--text-muted-hsl))", fontSize: "13px", marginBottom: "24px" }}>
                Collaboration is one invite away.
              </p>

              <button 
                onClick={() => setShowInviteDialog(true)}
                className="btn btn-primary"
                style={{ 
                  padding: "8px 24px", fontSize: "13px", height: "36px", 
                  background: "linear-gradient(135deg, hsl(var(--primary-hsl)), hsl(var(--accent-hsl)))",
                  boxShadow: "var(--glow)"
                }}
              >
                Invite people
              </button>
            </div>
          ) : (
            /* Active unread invitations feed list */
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "800px", width: "100%" }}>
              {unreadPrimaryInvites.map((item) => (
                <div 
                  key={item.id} 
                  className="card animate-fade-in"
                  style={{
                    padding: "18px 20px", background: "hsl(var(--card-hsl))",
                    border: "1px solid rgba(139, 92, 246, 0.25)", borderRadius: "var(--radius-md)",
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: "20px"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", flex: 1 }}>
                    <div 
                      style={{ 
                        width: "36px", height: "36px", borderRadius: "50%", 
                        background: "rgba(139, 92, 246, 0.15)", display: "flex", 
                        alignItems: "center", justifyContent: "center",
                        color: "hsl(var(--primary-light-hsl))", fontSize: "15px", fontWeight: "bold"
                      }}
                    >
                      {item.data?.inviterName ? item.data.inviterName.charAt(0).toUpperCase() : "✉"}
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "13.5px", fontWeight: "600", color: "white" }}>
                          {item.title}
                        </span>
                        <span style={{ fontSize: "11px", color: "hsl(var(--text-muted-hsl))", display: "flex", alignItems: "center", gap: "3px" }}>
                          <Clock size={11} />
                          {new Date(item.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                        </span>
                      </div>
                      <p style={{ fontSize: "13px", color: "hsl(var(--text-secondary-hsl))", lineHeight: "1.4" }}>
                        {item.body}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button 
                      onClick={() => handleAcceptInvite(item.id, item.data?.chatId)}
                      className="btn btn-primary"
                      style={{ padding: "6px 12px", fontSize: "12px", height: "30px", gap: "4px" }}
                    >
                      <Check size={13} />
                      Accept
                    </button>
                    <button 
                      onClick={() => handleDeclineInvite(item.id)}
                      className="btn btn-secondary"
                      style={{ padding: "6px 12px", fontSize: "12px", height: "30px", gap: "4px", background: "rgba(255,255,255,0.03)" }}
                    >
                      <X size={13} />
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )

        ) : activeTab === "cleared" ? (
          
          readPrimaryInvites.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px", width: "100%", height: "100%" }}>
              {/* Alert Banner */}
              <div 
                style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "space-between",
                  padding: "10px 16px", 
                  background: "rgba(255, 255, 255, 0.02)", 
                  border: "1px solid hsl(var(--border-hsl))", 
                  borderRadius: "var(--radius-sm)",
                  fontSize: "12px",
                  color: "hsl(var(--text-secondary-hsl))"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <HelpCircle size={14} style={{ color: "hsl(var(--text-muted-hsl))" }} />
                  <span>Cleared notifications are permanently deleted from your Inbox after 30 days.</span>
                  <a href="#" style={{ color: "white", textDecoration: "underline", marginLeft: "4px" }}>Learn more</a>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "hsl(var(--text-muted-hsl))" }}>
                  <Check size={14} />
                  <span>Clear all</span>
                </div>
              </div>

              {/* Exact ClickUp Empty State Illustration */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "300px", textAlign: "center", marginTop: "20px" }}>
                <div 
                  style={{ 
                    width: "64px", height: "64px", borderRadius: "50%", 
                    background: "rgba(139, 92, 246, 0.1)", border: "1px solid rgba(139, 92, 246, 0.2)", 
                    display: "flex", alignItems: "center", justifyContent: "center", 
                    color: "hsl(var(--primary-light-hsl))", marginBottom: "18px" 
                  }}
                >
                  <UserPlus size={28} />
                </div>
                
                <h3 style={{ color: "white", fontSize: "16px", fontWeight: "600", marginBottom: "6px" }}>Looking to collaborate?</h3>
                <p style={{ color: "hsl(var(--text-muted-hsl))", fontSize: "13px", marginBottom: "24px" }}>
                  Collaboration is one invite away.
                </p>

                <button 
                  onClick={() => setShowInviteDialog(true)}
                  className="btn btn-primary"
                  style={{ 
                    padding: "8px 24px", fontSize: "13px", height: "36px", 
                    background: "linear-gradient(135deg, hsl(var(--primary-hsl)), hsl(var(--accent-hsl)))",
                    boxShadow: "var(--glow)"
                  }}
                >
                  Invite people
                </button>
              </div>
            </div>
          ) : (
             <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "800px", width: "100%" }}>
              {readPrimaryInvites.map((item) => (
                <div 
                  key={item.id} 
                  style={{
                    padding: "14px 18px", background: "rgba(22,24,35,0.25)",
                    border: "1px solid hsl(var(--border-hsl))", borderRadius: "var(--radius-sm)",
                    display: "flex", alignItems: "center", justifyContent: "space-between"
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <span style={{ fontSize: "13px", fontWeight: "600", color: "hsl(var(--text-secondary-hsl))" }}>{item.title}</span>
                    <p style={{ fontSize: "12.5px", color: "hsl(var(--text-muted-hsl))" }}>{item.body}</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "hsl(var(--text-muted-hsl))" }}>
                    <CheckCircle size={14} style={{ color: "hsl(var(--success-hsl))" }} />
                    <span>Cleared</span>
                  </div>
                </div>
              ))}
            </div>
          )

        ) : (
          <div style={{ textAlign: "center", color: "hsl(var(--text-muted-hsl))", padding: "40px", fontSize: "13px" }}>
            Nothing under this tab yet. Your inbox is clean!
          </div>
        )}

      </div>

      {/* POPUP INLINE INVITE OVERLAY DIALOG */}
      {showInviteDialog && (
        <div 
          style={{
            position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
            background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", zIndex: 1000,
            display: "flex", alignItems: "center", justifyContent: "center"
          }}
        >
          <form 
            onSubmit={handleSendInviteSubmit}
            className="card animate-scale-in" 
            style={{ 
              width: "420px", background: "hsl(var(--card-hsl))", border: "1px solid hsl(var(--border-hsl))",
              borderRadius: "var(--radius-lg)", padding: "24px", display: "flex", flexDirection: "column", gap: "16px"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Sparkles size={16} style={{ color: "hsl(var(--primary-light-hsl))" }} />
                <h3 style={{ fontSize: "16px", fontWeight: "600", color: "white" }}>Invite People to Chat</h3>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setShowInviteDialog(false);
                  setInviteSuccessMsg("");
                }}
                style={{ background: "transparent", border: "none", color: "hsl(var(--text-muted-hsl))", cursor: "pointer" }}
              >
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: "12.5px", color: "hsl(var(--text-secondary-hsl))", lineHeight: "1.4" }}>
              Invite anyone by email to open an instant workspace chat thread and dispatch a mail invitation.
            </p>

            {inviteSuccessMsg ? (
              <div style={{ padding: "12px", background: "rgba(52, 199, 89, 0.1)", border: "1px solid rgba(52, 199, 89, 0.25)", borderRadius: "var(--radius-sm)", color: "hsl(var(--success-hsl))", fontSize: "12.5px" }}>
                {inviteSuccessMsg}
              </div>
            ) : (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "11px", textTransform: "uppercase", fontWeight: "600", color: "hsl(var(--text-secondary-hsl))" }}>Email Address</label>
                  <input 
                    type="email"
                    required
                    placeholder="Enter email (e.g. mareddykarthikeya@gmail.com)"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="input-field"
                    style={{ height: "36px" }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "11px", textTransform: "uppercase", fontWeight: "600", color: "hsl(var(--text-secondary-hsl))" }}>Full Name (Optional)</label>
                  <input 
                    type="text"
                    placeholder="Enter full name"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    className="input-field"
                    style={{ height: "36px" }}
                  />
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ height: "36px", marginTop: "8px", gap: "6px" }}
                  disabled={sendingInvite}
                >
                  <Mail size={14} />
                  {sendingInvite ? "Sending invitation..." : "Send Chat Invitation"}
                </button>
              </>
            )}
          </form>
        </div>
      )}

    </div>
  );
};
