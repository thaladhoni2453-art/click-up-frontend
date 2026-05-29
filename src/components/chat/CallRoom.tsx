import React, { useState, useEffect } from "react";
import { Loader2, Mic, MicOff, Video, VideoOff, Monitor, PhoneOff, AlertCircle, X } from "lucide-react";
import { api } from "../../lib/api";
import { LiveKitRoom, VideoConference, useLocalParticipant } from "@livekit/components-react";
import "@livekit/components-styles";
import "../../styles/call.css";

interface CallRoomProps {
  channelId: string;
  callType: "VIDEO" | "VOICE";
  onClose: () => void;
}

export const CallRoom: React.FC<CallRoomProps> = ({ channelId, callType, onClose }) => {
  const [token, setToken] = useState<string | null>(null);
  const [roomName, setRoomName] = useState("");
  const [livekitUrl, setLivekitUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchToken = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post("/chat/calls/token", { channelId, callType });
      setToken(data.token);
      setRoomName(data.roomName);
      // Fallback for secure websocket livekit url
      setLivekitUrl(data.livekitUrl || "ws://localhost:7880");
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to establish WebRTC Call Session.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (channelId) {
      fetchToken();
    }
  }, [channelId, callType]);

  return (
    <div className="call-overlay">
      {loading && (
        <div className="call-loader">
          <Loader2 size={36} className="animate-spin" style={{ color: "hsl(var(--primary-light-hsl))" }} />
          <span style={{ fontSize: "14px", fontWeight: "600", fontFamily: "var(--font-display)" }}>
            Connecting WebRTC Call Session...
          </span>
        </div>
      )}

      {error && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", color: "white", padding: "20px" }}>
          <AlertCircle size={44} style={{ color: "#ef4444" }} />
          <span style={{ fontSize: "14px", fontWeight: "600", textAlign: "center", maxWidth: "340px" }}>{error}</span>
          <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
            <button
              onClick={onClose}
              className="chat-input-action"
              style={{ background: "rgba(255, 255, 255, 0.05)", border: "1px solid hsl(var(--border-hsl))", color: "white", padding: "8px 20px", borderRadius: "var(--radius-sm)" }}
            >
              Close
            </button>
            <button
              onClick={fetchToken}
              className="sidebar-invite-btn"
              style={{ borderStyle: "solid", borderWidth: "1px", background: "hsl(var(--primary-hsl))", color: "white", borderColor: "hsl(var(--primary-hsl))", width: "auto", padding: "8px 20px" }}
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {!loading && !error && token && (
        <LiveKitRoom
          token={token}
          serverUrl={livekitUrl}
          connect={true}
          video={callType === "VIDEO"}
          audio={true}
          onDisconnected={onClose}
          style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}
        >
          <div className="call-main">
            <VideoConference />
          </div>

          <CallControls channelId={channelId} callType={callType} onClose={onClose} />
        </LiveKitRoom>
      )}
    </div>
  );
};

// Custom child controller to tap into livekit participant context hook safely
interface CallControlsProps {
  channelId: string;
  callType: "VIDEO" | "VOICE";
  onClose: () => void;
}

const CallControls: React.FC<CallControlsProps> = ({ channelId, callType, onClose }) => {
  const {
    isMicrophoneEnabled,
    isCameraEnabled,
    isScreenShareEnabled,
    localParticipant
  } = useLocalParticipant();

  const handleEndCall = async () => {
    try {
      await api.post("/chat/calls/end", { channelId });
    } catch (err) {
      console.warn("Error notifying call termination", err);
    }
    onClose();
  };

  return (
    <div className="call-toolbar">
      {/* Microphone Toggle */}
      <button
        onClick={() =>
          localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)
        }
        className={`call-btn ${!isMicrophoneEnabled ? "muted" : ""}`}
        title={isMicrophoneEnabled ? "Mute Microphone" : "Unmute Microphone"}
      >
        {isMicrophoneEnabled ? <Mic size={18} /> : <MicOff size={18} />}
      </button>

      {/* Camera Toggle */}
      {callType === "VIDEO" && (
        <button
          onClick={() =>
            localParticipant.setCameraEnabled(!isCameraEnabled)
          }
          className={`call-btn ${!isCameraEnabled ? "muted" : ""}`}
          title={isCameraEnabled ? "Disable Camera" : "Enable Camera"}
        >
          {isCameraEnabled ? <Video size={18} /> : <VideoOff size={18} />}
        </button>
      )}

      {/* Screen Share Toggle */}
      {callType === "VIDEO" && (
        <button
          onClick={() =>
            localParticipant.setScreenShareEnabled(!isScreenShareEnabled)
          }
          className={`call-btn ${!isScreenShareEnabled ? "muted" : ""}`}
          title={isScreenShareEnabled ? "Stop Sharing Screen" : "Share Screen"}
        >
          <Monitor size={18} />
        </button>
      )}

      {/* End Call Button */}
      <button
        onClick={handleEndCall}
        className="call-btn end"
        title="Leave Call Session"
      >
        <PhoneOff size={20} />
      </button>
    </div>
  );
};

export default CallRoom;
