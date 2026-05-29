import React, { useState } from "react";
import { useAuth } from "../../app/providers";
import { Sparkles, Mail, Lock, User, Briefcase, Check } from "lucide-react";

interface RegisterProps {
  onToggleLogin: () => void;
  onSuccess: () => void;
}

export const RegisterPage: React.FC<RegisterProps> = ({ onToggleLogin, onSuccess }) => {
  const { register } = useAuth();
  const [email, setEmail] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("email") || "";
  });
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await register({ email, password, fullName, orgName });
      onSuccess();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || "Registration request failed. Try again!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div 
        className="glass-panel animate-slide-up" 
        style={{
          width: "420px",
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
            Create Your Workspace
          </h2>
          <p style={{ fontSize: "12px", color: "hsl(var(--text-muted-hsl))", marginTop: "6px" }}>Setup multi-tenant spaces and invite team members in seconds.</p>
        </div>

        {/* Error alerts */}
        {error && (
          <div style={{ padding: "10px 14px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "var(--radius-sm)", color: "hsl(var(--error-hsl))", fontSize: "12.5px" }}>
            {error}
          </div>
        )}

        {/* Signup fields form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "11px", fontWeight: "600", textTransform: "uppercase", color: "hsl(var(--text-muted-hsl))" }}>Full Name</label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <User size={15} style={{ position: "absolute", left: "12px", color: "hsl(var(--text-muted-hsl))" }} />
              <input
                type="text"
                placeholder="Jane Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input-field"
                style={{ width: "100%", paddingLeft: "36px", height: "40px" }}
                required
              />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "11px", fontWeight: "600", textTransform: "uppercase", color: "hsl(var(--text-muted-hsl))" }}>Organization / Team Name</label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <Briefcase size={15} style={{ position: "absolute", left: "12px", color: "hsl(var(--text-muted-hsl))" }} />
              <input
                type="text"
                placeholder="e.g. Stripe Inc"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="input-field"
                style={{ width: "100%", paddingLeft: "36px", height: "40px" }}
                required
              />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "11px", fontWeight: "600", textTransform: "uppercase", color: "hsl(var(--text-muted-hsl))" }}>Work Email Address</label>
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
            <label style={{ fontSize: "11px", fontWeight: "600", textTransform: "uppercase", color: "hsl(var(--text-muted-hsl))" }}>Secure Password</label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <Lock size={15} style={{ position: "absolute", left: "12px", color: "hsl(var(--text-muted-hsl))" }} />
              <input
                type="password"
                placeholder="Min 6 characters..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                style={{ width: "100%", paddingLeft: "36px", height: "40px" }}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ height: "40px", marginTop: "8px" }} disabled={loading}>
            <Check size={15} />
            {loading ? "Creating organization..." : "Initialize Organization"}
          </button>
        </form>

        {/* Toggle log-in link */}
        <div style={{ textAlign: "center", fontSize: "12.5px", color: "hsl(var(--text-secondary-hsl))" }}>
          Already have an account?{" "}
          <button 
            onClick={onToggleLogin}
            style={{ background: "transparent", border: "none", color: "hsl(var(--primary-light-hsl))", fontWeight: "600", cursor: "pointer" }}
          >
            Login session
          </button>
        </div>
      </div>
    </div>
  );
};
