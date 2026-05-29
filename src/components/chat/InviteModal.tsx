import React, { useState } from "react";
import { X, Mail, CheckCircle, Copy, Sparkles, AlertCircle, Loader2 } from "lucide-react";
import { api } from "../../lib/api";
import { useChatStore } from "../../stores/chatStore";

interface InviteModalProps {
  channelId?: string;
  onClose: () => void;
}

export const InviteModal: React.FC<InviteModalProps> = ({ channelId, onClose }) => {
  const { channels } = useChatStore();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [selectedChannelId, setSelectedChannelId] = useState(channelId || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);

  const groupChannels = channels.filter(c => c.type === "GROUP");

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post("/chat/invite", {
        email,
        fullName: fullName || undefined,
        channelId: selectedChannelId || undefined
      });

      if (data.inviteLink) {
        setInviteLink(data.inviteLink);
      }
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to dispatch invitation.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ width: "420px" }}>
        
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Sparkles size={16} style={{ color: "hsl(var(--primary-light-hsl))" }} />
            <h3 className="modal-title">Invite to WaveWork</h3>
          </div>
          <button onClick={onClose} className="modal-close-btn">
            <X size={16} />
          </button>
        </div>

        {/* Success State */}
        {success ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", padding: "10px 0", textAlign: "center" }}>
            <CheckCircle size={44} style={{ color: "hsl(var(--success-hsl))", filter: "drop-shadow(0 0 8px rgba(16, 185, 129, 0.4))" }} />
            <div>
              <h4 style={{ fontWeight: "700", color: "white", fontSize: "14px" }}>Invitation sent!</h4>
              <p style={{ fontSize: "12.5px", color: "hsl(var(--text-secondary-hsl))", marginTop: "4px" }}>
                An invite was sent successfully to <span style={{ color: "white", fontWeight: "600" }}>{email}</span>
              </p>
            </div>

            {inviteLink && (
              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px", textAlign: "left" }}>
                <span className="modal-label">Direct Invite Link</span>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    readOnly
                    value={inviteLink}
                    style={{ flex: 1 }}
                    className="modal-input"
                  />
                  <button
                    onClick={handleCopy}
                    className="chat-input-action"
                    style={{ background: "rgba(139, 92, 246, 0.1)", border: "1px solid rgba(139, 92, 246, 0.3)", borderRadius: "var(--radius-sm)", color: "white", width: "40px", height: "40px" }}
                    title="Copy to Clipboard"
                  >
                    <Copy size={15} />
                  </button>
                </div>
                {copied && (
                  <span style={{ fontSize: "11px", color: "hsl(var(--success-hsl))", alignSelf: "flex-end" }}>
                    Copied to clipboard!
                  </span>
                )}
              </div>
            )}

            <button
              onClick={() => {
                setSuccess(false);
                setEmail("");
                setFullName("");
                setInviteLink("");
              }}
              className="sidebar-invite-btn"
              style={{ borderStyle: "solid", borderWidth: "1px", width: "auto", padding: "8px 20px", marginTop: "8px" }}
            >
              Send Another Invitation
            </button>
          </div>
        ) : (
          /* Form Input */
          <form onSubmit={handleSend} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            
            <div className="modal-field">
              <label className="modal-label">Email Address *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="modal-input"
              />
            </div>

            <div className="modal-field">
              <label className="modal-label">Their Name (Optional)</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Smith"
                className="modal-input"
              />
            </div>

            <div className="modal-field">
              <label className="modal-label">Add to Group (Optional)</label>
              <select
                value={selectedChannelId}
                onChange={(e) => setSelectedChannelId(e.target.value)}
                className="modal-input"
                style={{ background: "hsl(var(--background-hsl))" }}
                disabled={groupChannels.length === 0}
              >
                <option value="">
                  {groupChannels.length === 0 ? "— No groups available —" : "— No group —"}
                </option>
                {groupChannels.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "var(--radius-sm)", padding: "10px 12px", color: "#f87171", fontSize: "12.5px" }}>
                <AlertCircle size={14} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email}
              className="sidebar-invite-btn"
              style={{ borderStyle: "solid", borderWidth: "1px", background: "hsl(var(--primary-hsl))", color: "white", borderColor: "hsl(var(--primary-hsl))" }}
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Sending Invitation...</span>
                </>
              ) : (
                <span>Send Invitation</span>
              )}
            </button>

          </form>
        )}

      </div>
    </div>
  );
};
export default InviteModal;
