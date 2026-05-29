import React, { useEffect, useState, useRef } from "react";
import { CheckCircle2, Clock, TrendingUp, Sparkles, RefreshCw } from "lucide-react";
import { useDashboardStats } from "../../hooks/useDashboardStats";

// High-Performance Animated Number Component using native requestAnimationFrame with easeOutQuad easing
const AnimatedNumber: React.FC<{ value: number; decimals?: number; suffix?: string }> = ({ value, decimals = 0, suffix = "" }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValue = useRef(value);

  useEffect(() => {
    const start = previousValue.current;
    const end = value;
    if (start === end) return;

    const duration = 800; // ms
    const startTime = performance.now();
    let animationFrameId: number;

    const updateNumber = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // easeOutQuad easing
      const ease = progress * (2 - progress);
      const current = start + (end - start) * ease;
      
      setDisplayValue(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(updateNumber);
      } else {
        previousValue.current = end;
      }
    };

    animationFrameId = requestAnimationFrame(updateNumber);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [value]);

  return <span>{displayValue.toFixed(decimals)}{suffix}</span>;
};

export const Dashboard: React.FC = () => {
  const { stats, loading, refetch } = useDashboardStats();

  if (loading) {
    return (
      <div style={{ display: "flex", flex: 1, height: "100%", alignItems: "center", justifyContent: "center", background: "hsl(var(--background-hsl))", color: "white" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
          {/* Animated Spinner with Gradient Border */}
          <div className="spinner" style={{ width: "36px", height: "36px", border: "3px solid rgba(255,255,255,0.06)", borderTopColor: "hsl(var(--primary-hsl))", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Sparkles className="animate-pulse" size={14} style={{ color: "hsl(var(--primary-light-hsl))" }} />
            <span style={{ fontSize: "13px", fontWeight: "600", color: "hsl(var(--text-secondary-hsl))", fontFamily: "var(--font-display)" }}>Assembling live telemetry...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", display: "flex", flexDirection: "column", height: "100%", overflowY: "auto", background: "hsl(var(--background-hsl))" }} className="animate-fade-in">
      {/* Header section with live indicator */}
      <div style={{ marginBottom: "28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "22px", fontWeight: "700", fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>Workspace Analytics</h2>
          <p style={{ fontSize: "12px", color: "hsl(var(--text-muted-hsl))", marginTop: "2px" }}>Real-time team performance metrics, tasks completions rates and time tracking aggregates.</p>
        </div>

        {/* Live system state badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(255, 255, 255, 0.03)", padding: "6px 14px", borderRadius: "var(--radius-lg)", border: "1px solid hsl(var(--border-hsl))" }}>
          <div className="live-indicator-dot" />
          <span style={{ fontSize: "12px", fontWeight: "600", color: "hsl(var(--text-secondary-hsl))", letterSpacing: "0.02em" }}>LIVE TRACKING</span>
          <button 
            onClick={refetch}
            title="Force Refetch Now"
            style={{ 
              background: "transparent", 
              border: "none", 
              color: "hsl(var(--text-muted-hsl))", 
              cursor: "pointer", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              marginLeft: "4px",
              padding: "2px",
              borderRadius: "4px",
              transition: "var(--transition-smooth)"
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = "white"}
            onMouseLeave={(e) => e.currentTarget.style.color = "hsl(var(--text-muted-hsl))"}
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {/* Grid of Widgets */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
        
        {/* Widget 1: Completion Speed */}
        <div className="card glass-panel" style={{ display: "flex", flexDirection: "column", gap: "20px", padding: "24px", background: "rgba(10,12,18,0.2)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-md)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 600, fontSize: "14px", color: "hsl(var(--text-secondary-hsl))", fontFamily: "var(--font-display)" }}>Completion Rate</span>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px", borderRadius: "50%", background: "rgba(16, 185, 129, 0.1)" }}>
              <CheckCircle2 size={16} style={{ color: "hsl(var(--success-hsl))" }} />
            </div>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "28px" }}>
            {/* SVG circle percentage tracker */}
            <svg width="84" height="84" viewBox="0 0 36 36" style={{ transform: "rotate(-90deg)", filter: "drop-shadow(0 0 8px rgba(168, 85, 247, 0.15))" }}>
              <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="3" />
              <circle 
                cx="18" 
                cy="18" 
                r="16" 
                fill="none" 
                stroke="hsl(var(--primary-hsl))" 
                strokeWidth="3" 
                strokeDasharray={`${stats.completion_rate}, 100`} 
                style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.4, 0, 0.2, 1)" }}
              />
            </svg>
            <div>
              <div style={{ fontSize: "32px", fontWeight: "800", color: "white", fontFamily: "var(--font-display)", display: "flex", alignItems: "baseline" }}>
                <AnimatedNumber value={stats.completion_rate} />
                <span style={{ fontSize: "16px", color: "hsl(var(--text-muted-hsl))", marginLeft: "2px" }}>%</span>
              </div>
              <p style={{ fontSize: "11px", color: "hsl(var(--text-muted-hsl))", marginTop: "4px", lineHeight: "1.4" }}>
                Of user tasks marked completed within the active sprint window.
              </p>
            </div>
          </div>
        </div>

        {/* Widget 2: Tracked time entries */}
        <div className="card glass-panel" style={{ display: "flex", flexDirection: "column", gap: "20px", padding: "24px", background: "rgba(10,12,18,0.2)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-md)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 600, fontSize: "14px", color: "hsl(var(--text-secondary-hsl))", fontFamily: "var(--font-display)" }}>Tracked Time</span>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px", borderRadius: "50%", background: "rgba(6, 182, 212, 0.1)" }}>
              <Clock size={16} style={{ color: "hsl(var(--accent-hsl))" }} />
            </div>
          </div>
          
          <div>
            <div style={{ fontSize: "32px", fontWeight: "800", color: "white", fontFamily: "var(--font-display)", display: "flex", alignItems: "baseline" }}>
              <AnimatedNumber value={stats.tracked_hours} decimals={1} />
              <span style={{ fontSize: "14px", color: "hsl(var(--text-muted-hsl))", marginLeft: "4px" }}>hrs</span>
            </div>
            <p style={{ fontSize: "11px", color: "hsl(var(--text-muted-hsl))", marginTop: "4px", lineHeight: "1.4" }}>
              Total billable tasks logged during the active sprint scope.
            </p>
          </div>
          
          {/* Dynamic bar chart graph */}
          <div style={{ display: "flex", gap: "10px", height: "46px", alignItems: "flex-end", paddingBottom: "2px" }}>
            <div style={{ height: `${Math.max(20, Math.min(100, stats.tracked_hours * 4.5))}%`, width: "100%", background: "rgba(255,255,255,0.06)", borderRadius: "3px", transition: "height 0.8s ease" }}></div>
            <div style={{ height: `${Math.max(35, Math.min(100, stats.tracked_hours * 6.5))}%`, width: "100%", background: "rgba(255,255,255,0.06)", borderRadius: "3px", transition: "height 0.8s ease" }}></div>
            <div style={{ height: `${Math.max(50, Math.min(100, stats.tracked_hours * 8.5))}%`, width: "100%", background: "hsl(var(--accent-hsl))", borderRadius: "3px", transition: "height 0.8s ease", boxShadow: "0 0 10px rgba(6, 182, 212, 0.4)" }}></div>
            <div style={{ height: `${Math.max(25, Math.min(100, stats.tracked_hours * 5.5))}%`, width: "100%", background: "rgba(255,255,255,0.06)", borderRadius: "3px", transition: "height 0.8s ease" }}></div>
          </div>
        </div>

        {/* Widget 3: Tasks velocity chart */}
        <div className="card glass-panel" style={{ display: "flex", flexDirection: "column", gap: "20px", padding: "24px", background: "rgba(10,12,18,0.2)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-md)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 600, fontSize: "14px", color: "hsl(var(--text-secondary-hsl))", fontFamily: "var(--font-display)" }}>Sprint Velocity</span>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px", borderRadius: "50%", background: "rgba(245, 158, 11, 0.1)" }}>
              <TrendingUp size={16} style={{ color: "hsl(var(--warning-hsl))" }} />
            </div>
          </div>
          
          <div>
            <div style={{ fontSize: "32px", fontWeight: "800", color: "white", fontFamily: "var(--font-display)", display: "flex", alignItems: "baseline" }}>
              <AnimatedNumber value={stats.velocity} />
              <span style={{ fontSize: "14px", color: "hsl(var(--text-muted-hsl))", marginLeft: "4px" }}>pts</span>
            </div>
            <p style={{ fontSize: "11px", color: "hsl(var(--text-muted-hsl))", marginTop: "4px", lineHeight: "1.4" }}>
              Completed story points inside Roadmap Backlog List.
            </p>
          </div>
          
          {/* Dynamic morphing line chart */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", height: "46px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg viewBox="0 0 100 30" style={{ width: "100%", height: "40px", overflow: "visible" }}>
              <path
                d={`M0 25 Q 25 ${Math.max(10, 30 - stats.velocity * 0.8)}, 50 ${Math.max(6, 30 - stats.velocity * 1.6)}, 100 ${Math.max(2, 30 - stats.velocity * 2.4)}`}
                fill="none"
                stroke="hsl(var(--warning-hsl))"
                strokeWidth="2.5"
                style={{ filter: "drop-shadow(0 0 4px hsla(38, 92%, 50%, 0.3))", transition: "d 0.8s ease" }}
              />
            </svg>
          </div>
        </div>

      </div>
    </div>
  );
};
