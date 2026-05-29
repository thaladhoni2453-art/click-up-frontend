import React, { useState, useRef } from "react";
import { X, Camera, Loader2, AlertCircle } from "lucide-react";
import { api } from "../../lib/api";
import { Channel } from "../../stores/chatStore";

interface EditGroupModalProps {
  channel: Channel;
  onClose: () => void;
  onSaved: (updated: Channel) => void;
}

export const EditGroupModal: React.FC<EditGroupModalProps> = ({ channel, onClose, onSaved }) => {
  const [name, setName] = useState(channel.name || "");
  const [description, setDescription] = useState(channel.description || "");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(channel.avatarUrl || null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);
    try {
      let updatedChannel = { ...channel };

      // 1. Update text metadata if changed
      if (name.trim() !== channel.name || description.trim() !== channel.description) {
        const { data } = await api.patch(`/chat/channels/${channel.id}`, {
          name: name.trim(),
          description: description.trim()
        });
        updatedChannel = { ...updatedChannel, ...data.channel };
      }

      // 2. Upload new photo if selected
      if (photo) {
        const formData = new FormData();
        formData.append("file", photo);
        const { data } = await api.post(`/chat/channels/${channel.id}/avatar`, formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        updatedChannel.avatarUrl = data.avatarUrl;
      }

      onSaved(updatedChannel);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to update channel settings.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteChannel = async () => {
    if (!window.confirm("ARE YOU SURE you want to delete this channel? This action is permanent and will delete all messages and members!")) return;
    
    setLoading(true);
    setError(null);
    try {
      await api.delete(`/chat/channels/${channel.id}`);
      onClose();
      window.dispatchEvent(new CustomEvent("ww:channel-deleted", { detail: channel.id }));
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to delete the channel.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ width: "480px" }}>
        
        {/* Header */}
        <div className="modal-header">
          <h3 className="modal-title">Channel Settings</h3>
          <button onClick={onClose} className="modal-close-btn">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          
          {/* Avatar Upload */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.03)",
                border: "1.5px dashed hsl(var(--border-hsl))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                position: "relative",
                overflow: "hidden",
                transition: "var(--transition-smooth)"
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = "hsl(var(--primary-hsl))"}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = "hsl(var(--border-hsl))"}
            >
              {photoPreview ? (
                <img src={photoPreview} alt="Channel Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <Camera size={22} style={{ color: "hsl(var(--text-muted-hsl))" }} />
              )}
            </div>
            <span style={{ fontSize: "11px", color: "hsl(var(--text-muted-hsl))" }}>Change channel avatar</span>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoSelect}
              accept="image/*"
              style={{ display: "none" }}
            />
          </div>

          {/* Group Name */}
          <div className="modal-field">
            <label className="modal-label">Channel Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Design Team"
              className="modal-input"
            />
          </div>

          {/* Description */}
          <div className="modal-field">
            <label className="modal-label">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this channel about?"
              rows={3}
              className="modal-input"
              style={{ resize: "none", fontFamily: "inherit" }}
            />
          </div>

          {error && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "var(--radius-sm)", padding: "10px 12px", color: "#f87171", fontSize: "12.5px" }}>
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: "flex", gap: "12px", marginTop: "8px", justifyContent: "space-between", alignItems: "center" }}>
            {channel.myRole === "OWNER" ? (
              <button
                type="button"
                onClick={handleDeleteChannel}
                disabled={loading}
                className="sidebar-invite-btn"
                style={{
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  color: "#f87171",
                  borderStyle: "solid",
                  borderWidth: "1px",
                  padding: "8px 16px",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "600",
                  transition: "var(--transition-smooth)",
                  width: "auto",
                  borderColor: "rgba(239, 68, 68, 0.3)"
                }}
              >
                Delete Channel
              </button>
            ) : (
              <div />
            )}
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                type="button"
                onClick={onClose}
                className="chat-input-action"
                style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid hsl(var(--border-hsl))", borderRadius: "var(--radius-sm)", color: "white", padding: "8px 20px" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="sidebar-invite-btn"
                style={{ borderStyle: "solid", borderWidth: "1px", background: "hsl(var(--primary-hsl))", color: "white", borderColor: "hsl(var(--primary-hsl))", width: "auto", padding: "8px 24px" }}
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Saving Settings...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
export default EditGroupModal;
