import React, { useState } from "react";
import { useAuth } from "../../app/providers";
import { Sparkles, Mail, Lock, LogIn } from "lucide-react";
import { api } from "../../lib/api";

interface LoginProps {
  onToggleRegister: () => void;
  onSuccess: () => void;
}

export const LoginPage: React.FC<LoginProps> = ({ onToggleRegister, onSuccess }) => {
  const { login, register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  const handleGoogleLogin = async (account: { name: string; email: string }) => {
    setLoading(true);
    setError(null);
    setShowGoogleModal(false);
    
    const googlePassword = "google-sso-authed-user-secure-pass-99";
    try {
      // 1. Try to login
      try {
        await login({ email: account.email, password: googlePassword });
      } catch (loginErr) {
        // 2. If login fails, register them automatically!
        await register({
          email: account.email,
          password: googlePassword,
          fullName: account.name,
          orgName: `${account.name}'s Org`
        });
      }
      
      // Check if there is an active invite token to accept
      const inviteToken = new URLSearchParams(window.location.search).get("invite");
      if (inviteToken) {
        try {
          await api.post(`/chat/invite/${inviteToken}/accept`);
        } catch (acceptErr) {
          console.error("SSO Accept invite failed", acceptErr);
        }
      }
      
      onSuccess();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || "Google authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login({ email, password });
      onSuccess();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || "Login connection failed. Verify credentials!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
      <div 
        className="glass-panel animate-slide-up" 
        style={{
          width: "400px",
          padding: "40px",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)",
          border: "1px solid hsla(0, 0%, 100%, 0.08)",
          background: "rgba(12, 14, 24, 0.75)",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        {/* Brand header */}
        <div style={{ textAlign: "center" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "var(--radius-md)", background: "linear-gradient(135deg, hsl(var(--primary-hsl)), hsl(var(--accent-hsl)))", display: "inline-flex", alignItems: "center", justifyContent: "center", boxShadow: "var(--glow)", marginBottom: "16px" }}>
            <Sparkles size={22} style={{ color: "white" }} />
          </div>
          <h2 style={{ fontSize: "24px", fontWeight: "800", letterSpacing: "-0.03em", fontFamily: "var(--font-display)" }}>
            Welcome Back to <span style={{ color: "hsl(var(--primary-light-hsl))" }}>WaveWork</span>
          </h2>
          <p style={{ fontSize: "12px", color: "hsl(var(--text-muted-hsl))", marginTop: "6px" }}>The next generation AI-powered project workspace.</p>
        </div>

        {/* Error notification */}
        {error && (
          <div style={{ padding: "10px 14px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "var(--radius-sm)", color: "hsl(var(--error-hsl))", fontSize: "12.5px" }}>
            {error}
          </div>
        )}

        {/* Auth form fields */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "11px", fontWeight: "600", textTransform: "uppercase", color: "hsl(var(--text-muted-hsl))" }}>Email Address</label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <Mail size={15} style={{ position: "absolute", left: "12px", color: "hsl(var(--text-muted-hsl))" }} />
              <input
                type="email"
                placeholder="you@workplace.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                style={{ width: "100%", paddingLeft: "36px", height: "40px" }}
                required
              />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "11px", fontWeight: "600", textTransform: "uppercase", color: "hsl(var(--text-muted-hsl))" }}>Password</label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <Lock size={15} style={{ position: "absolute", left: "12px", color: "hsl(var(--text-muted-hsl))" }} />
              <input
                type="password"
                placeholder="Enter password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                style={{ width: "100%", paddingLeft: "36px", height: "40px" }}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ height: "40px", marginTop: "8px" }} disabled={loading}>
            <LogIn size={15} />
            {loading ? "Authenticating..." : "Login Session"}
          </button>
        </form>

        {/* Separator */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "4px 0" }}>
          <div style={{ flex: 1, height: "1px", background: "rgba(255, 255, 255, 0.08)" }} />
          <span style={{ fontSize: "11px", color: "hsl(var(--text-muted-hsl))", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>or</span>
          <div style={{ flex: 1, height: "1px", background: "rgba(255, 255, 255, 0.08)" }} />
        </div>

        {/* Google Authentication Button */}
        <button 
          type="button" 
          onClick={() => setShowGoogleModal(true)}
          style={{
            height: "40px",
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "var(--radius-sm)",
            color: "white",
            fontWeight: "600",
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            cursor: "pointer",
            transition: "var(--transition-smooth)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.07)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        {/* Toggle sign-up link option */}
        <div style={{ textAlign: "center", fontSize: "12.5px", color: "hsl(var(--text-secondary-hsl))" }}>
          Don't have a workspace?{" "}
          <button 
            onClick={onToggleRegister}
            style={{ background: "transparent", border: "none", color: "hsl(var(--primary-light-hsl))", fontWeight: "600", cursor: "pointer" }}
          >
            Create organization
          </button>
        </div>
      </div>

      {/* simulated Google account selector modal */}
      {showGoogleModal && (
        <div 
          className="modal-overlay" 
          style={{ 
            position: "fixed", 
            top: 0, 
            left: 0, 
            width: "100vw", 
            height: "100vh", 
            background: "rgba(10, 11, 20, 0.82)", 
            backdropFilter: "blur(12px)", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            zIndex: 9999 
          }}
        >
          <div 
            className="glass-panel animate-slide-up"
            style={{
              width: "360px",
              padding: "32px",
              borderRadius: "var(--radius-lg)",
              background: "#181a25",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
              display: "flex",
              flexDirection: "column",
              gap: "20px"
            }}
          >
            {/* Google Brand Header */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", textAlign: "center" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
              <div>
                <h4 style={{ margin: 0, color: "white", fontSize: "16px", fontWeight: "700" }}>Sign in with Google</h4>
                <p style={{ margin: "4px 0 0 0", color: "hsl(var(--text-muted-hsl))", fontSize: "12px" }}>
                  to continue to <span style={{ color: "hsl(var(--primary-light-hsl))", fontWeight: "600" }}>WaveWork.ai</span>
                </p>
              </div>
            </div>

            {/* Accounts list */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {[
                { name: "Alex Rivers", email: "alex.rivers@gmail.com", avatar: "AR" },
                { name: "Sarah Chen", email: "sarah.chen@gmail.com", avatar: "SC" }
              ].map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => handleGoogleLogin(account)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "10px 14px",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.05)",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                    textAlign: "left",
                    width: "100%",
                    transition: "var(--transition-smooth)"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                    e.currentTarget.style.borderColor = "rgba(124, 106, 247, 0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)";
                  }}
                >
                  <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "linear-gradient(135deg, #7c6af7, #06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "12px", fontWeight: "bold" }}>
                    {account.avatar}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <span style={{ color: "white", fontSize: "13px", fontWeight: "600" }}>{account.name}</span>
                    <span style={{ color: "hsl(var(--text-muted-hsl))", fontSize: "11px", overflow: "hidden", textOverflow: "ellipsis" }}>{account.email}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Cancel option */}
            <button
              type="button"
              onClick={() => setShowGoogleModal(false)}
              style={{
                background: "transparent",
                border: "none",
                color: "hsl(var(--text-muted-hsl))",
                fontSize: "12.5px",
                cursor: "pointer",
                textAlign: "center",
                textDecoration: "underline",
                padding: "4px"
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
