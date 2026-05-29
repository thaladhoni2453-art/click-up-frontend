import React, { useState, useEffect, useRef } from "react";
import { X, Camera, Lock, Search, Loader2, AlertCircle } from "lucide-react";
import { api } from "../../lib/api";
import { Channel } from "../../stores/chatStore";

interface CreateGroupModalProps {
  onClose: () => void;
  onCreated: (channel: Channel) => void;
}

interface UserResult {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  isOnline: boolean;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ onClose, onCreated }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  // Members search and selection
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounced search for directory users
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await api.get(`/chat/users?q=${encodeURIComponent(searchQuery)}`);
        // Filter out members already selected
        const unselected = (data.users || []).filter(
          (u: UserResult) => !selectedMembers.some(sm => sm.id === u.id)
        );
        setSearchResults(unselected);
      } catch (err) {
        console.error("Directory search failed", err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, selectedMembers]);

  // Handle click outside user dropdown list
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setSearchResults([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleAddMember = (user: UserResult) => {
    setSelectedMembers([...selectedMembers, user]);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleRemoveMember = (userId: string) => {
    setSelectedMembers(selectedMembers.filter(sm => sm.id !== userId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);
    try {
      // 1. Create the Group channel
      const { data } = await api.post("/chat/channels", {
        name: name.trim(),
        description: description.trim() || undefined,
        isPrivate,
        memberIds: selectedMembers.map(m => m.id)
      });

      const newChannel = data.channel;

      // 2. Upload photo if selected
      if (photo && newChannel?.id) {
        const formData = new FormData();
        formData.append("file", photo);
        
        try {
          const uploadRes = await api.post(`/chat/channels/${newChannel.id}/avatar`, formData, {
            headers: { "Content-Type": "multipart/form-data" }
          });
          newChannel.avatarUrl = uploadRes.data.avatarUrl;
        } catch (uploadErr) {
          console.warn("Avatar upload failed, continuing with fallback.", uploadErr);
        }
      }

      onCreated(newChannel);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create group channel.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ width: "480px" }}>
        
        {/* Header */}
        <div className="modal-header">
          <h3 className="modal-title">Create a Channel</h3>
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
                <img src={photoPreview} alt="Group Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <Camera size={22} style={{ color: "hsl(var(--text-muted-hsl))" }} />
              )}
            </div>
            <span style={{ fontSize: "11px", color: "hsl(var(--text-muted-hsl))" }}>Upload channel avatar</span>
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

          {/* Private Toggle */}
          <div className="modal-toggle-row">
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Lock size={16} style={{ color: "hsl(var(--text-secondary-hsl))" }} />
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "13px", fontWeight: "600", color: "white" }}>Private Channel</span>
                <span style={{ fontSize: "11px", color: "hsl(var(--text-muted-hsl))", marginTop: "2px" }}>
                  Only invited members can find and join
                </span>
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          {/* Member Search */}
          <div className="modal-field" style={{ position: "relative" }} ref={dropdownRef}>
            <label className="modal-label">Add Members</label>
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "hsl(var(--text-muted-hsl))" }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search colleague by name or email..."
                className="modal-input"
                style={{ paddingLeft: "34px", width: "100%" }}
              />
              {searching && (
                <Loader2 size={14} className="animate-spin" style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "hsl(var(--text-muted-hsl))" }} />
              )}
            </div>

            {/* Results list */}
            {searchResults.length > 0 && (
              <div className="search-dropdown-list">
                {searchResults.map(user => (
                  <div key={user.id} onClick={() => handleAddMember(user)} className="dropdown-user-row">
                    <div className="sidebar-avatar" style={{ width: "28px", height: "28px", fontSize: "11px" }}>
                      {user.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                      <span style={{ fontSize: "13px", color: "white", fontWeight: "600" }}>{user.fullName}</span>
                      <span style={{ fontSize: "11px", color: "hsl(var(--text-muted-hsl))" }}>{user.email}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Selected Chips */}
            {selectedMembers.length > 0 && (
              <div className="member-chips-wrapper">
                {selectedMembers.map(user => (
                  <div key={user.id} className="member-chip">
                    <div className="sidebar-avatar" style={{ width: "20px", height: "20px", fontSize: "9px" }}>
                      {user.fullName.charAt(0).toUpperCase()}
                    </div>
                    <span>{user.fullName}</span>
                    <button type="button" onClick={() => handleRemoveMember(user.id)} className="member-chip-remove">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "var(--radius-sm)", padding: "10px 12px", color: "#f87171", fontSize: "12.5px" }}>
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: "flex", gap: "12px", marginTop: "8px", justifyContent: "flex-end" }}>
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
                  <span>Creating Channel...</span>
                </>
              ) : (
                <span>Create Channel</span>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
export default CreateGroupModal;
