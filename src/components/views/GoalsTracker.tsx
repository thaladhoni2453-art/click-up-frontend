import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useUIStore } from "../../stores/uiStore";
import { Target, Award, Sparkles, Plus, X, Check } from "lucide-react";

export const GoalsTracker: React.FC = () => {
  const queryClient = useQueryClient();
  const { activeWorkspaceId } = useUIStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Create Goal Form state
  const [newGoalName, setNewGoalName] = useState("");
  const [newGoalDesc, setNewGoalDesc] = useState("");
  const [newTargetName, setNewTargetName] = useState("");
  const [newTargetValue, setNewTargetValue] = useState(100);
  const [newTargetUnit, setNewTargetUnit] = useState("tasks");

  // Fetch Goals & OKRs from database
  const { data: goals = [] } = useQuery({
    queryKey: ["goals", activeWorkspaceId],
    queryFn: async () => {
      if (!activeWorkspaceId) return [];
      const { data } = await api.get("/extra/goals", {
        params: { workspaceId: activeWorkspaceId }
      });
      return data;
    },
    enabled: !!activeWorkspaceId,
  });

  // Target progress update mutation
  const updateTargetMutation = useMutation({
    mutationFn: async ({ targetId, currentValue }: { targetId: string; currentValue: number }) => {
      const { data } = await api.patch(`/extra/goals/targets/${targetId}`, { currentValue });
      return data;
    },
    onMutate: async ({ targetId, currentValue }) => {
      // Optimistic Update
      await queryClient.cancelQueries({ queryKey: ["goals", activeWorkspaceId] });
      const previousGoals = queryClient.getQueryData(["goals", activeWorkspaceId]);
      
      queryClient.setQueryData(["goals", activeWorkspaceId], (old: any) => {
        if (!old) return [];
        return old.map((g: any) => ({
          ...g,
          targets: g.targets?.map((t: any) => 
            t.id === targetId ? { ...t, currentValue } : t
          )
        }));
      });

      return { previousGoals };
    },
    onError: (err, variables, context) => {
      if (context?.previousGoals) {
        queryClient.setQueryData(["goals", activeWorkspaceId], context.previousGoals);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["goals", activeWorkspaceId] });
    }
  });

  // Goal creation mutation
  const createGoalMutation = useMutation({
    mutationFn: async (goalData: any) => {
      const { data } = await api.post("/extra/goals", goalData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals", activeWorkspaceId] });
      setShowCreateModal(false);
      setNewGoalName("");
      setNewGoalDesc("");
      setNewTargetName("");
      setNewTargetValue(100);
      setNewTargetUnit("tasks");
    }
  });

  const handleUpdateProgress = (targetId: string, value: number) => {
    updateTargetMutation.mutate({ targetId, currentValue: value });
  };

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalName.trim() || !newTargetName.trim()) return;

    createGoalMutation.mutate({
      workspaceId: activeWorkspaceId || "demo-ws",
      name: newGoalName,
      description: newGoalDesc,
      targets: [
        {
          name: newTargetName,
          type: "NUMBER",
          startValue: 0,
          currentValue: 0,
          targetValue: newTargetValue,
          unit: newTargetUnit
        }
      ]
    });
  };

  return (
    <div style={{ padding: "24px", display: "flex", flexDirection: "column", height: "100%", overflowY: "auto" }}>
      {/* Header Info */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: "700" }}>Goals & OKRs</h2>
          <p style={{ fontSize: "12px", color: "hsl(var(--text-muted-hsl))" }}>Link strategic targets to actual sprint lists and track OKRs metric indicators.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={16} />
          Create Goal
        </button>
      </div>

      {/* Goals panels lists */}
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {goals.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", background: "rgba(255,255,255,0.01)", border: "1px dashed hsl(var(--border-hsl))", borderRadius: "var(--radius-lg)" }}>
            <Target size={30} style={{ color: "hsl(var(--text-muted-hsl))", marginBottom: "12px" }} />
            <p style={{ fontSize: "13.5px", color: "hsl(var(--text-secondary-hsl))" }}>No active goals defined for this workspace.</p>
            <button className="btn btn-secondary" style={{ marginTop: "12px", fontSize: "12.5px" }} onClick={() => setShowCreateModal(true)}>
              Initialize First Goal
            </button>
          </div>
        ) : (
          goals.map((g: any) => {
            // Take the first target or default
            const target = g.targets?.[0] || { id: "none", name: "No Target Configured", currentValue: 0, targetValue: 100, unit: "" };
            const progressPercentage = Math.min(Math.round((target.currentValue / target.targetValue) * 100), 100);

            return (
              <div
                key={g.id}
                className="card glass-panel animate-fade-in"
                style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "24px", background: "rgba(10, 12, 18, 0.4)", borderRadius: "var(--radius-lg)", border: "1px solid hsl(var(--border-hsl))" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h3 style={{ fontSize: "16px", fontWeight: "600", color: "white" }}>{g.name}</h3>
                    <p style={{ fontSize: "12.5px", color: "hsl(var(--text-secondary-hsl))", marginTop: "4px", lineHeight: "1.5" }}>{g.description}</p>
                  </div>
                  <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid hsl(var(--border-hsl))" }}>
                    <Award size={18} style={{ color: "hsl(var(--primary-light-hsl))" }} />
                  </div>
                </div>

                {/* Progress metric slider */}
                <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: "var(--radius-md)", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px" }}>
                    <span style={{ fontWeight: 600, color: "hsl(var(--text-secondary-hsl))" }}>Target: {target.name}</span>
                    <span style={{ fontWeight: 700, color: "white" }}>{target.currentValue} / {target.targetValue} {target.unit}</span>
                  </div>

                  {/* Styled progress bar */}
                  <div style={{ height: "6px", background: "rgba(255,255,255,0.06)", borderRadius: "3px", position: "relative", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${progressPercentage}%`, background: "linear-gradient(90deg, hsl(var(--primary-hsl)), hsl(var(--accent-hsl)))", borderRadius: "3px", boxShadow: "0 0 10px hsla(263, 90%, 64%, 0.5)", transition: "width 0.3s ease" }}></div>
                  </div>

                  {/* Slider input control */}
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "4px" }}>
                    <span style={{ fontSize: "11px", color: "hsl(var(--text-muted-hsl))" }}>Adjust Progress:</span>
                    <input
                      type="range"
                      min="0"
                      max={target.targetValue}
                      value={target.currentValue}
                      onChange={(e) => handleUpdateProgress(target.id, parseInt(e.target.value))}
                      style={{ flex: 1, accentColor: "hsl(var(--primary-hsl))", cursor: "pointer", height: "4px" }}
                    />
                    <span style={{ fontSize: "11px", fontWeight: "700", color: "hsl(var(--primary-light-hsl))" }}>{progressPercentage}% Completed</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Creation Modal */}
      {showCreateModal && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="glass-panel" style={{ width: "450px", padding: "28px", borderRadius: "var(--radius-lg)", border: "1px solid hsl(var(--border-hsl))", background: "rgba(12, 14, 24, 0.95)", display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "17px", fontWeight: "700", color: "white" }}>Create strategic OKR Goal</h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: "transparent", border: "none", color: "hsl(var(--text-muted-hsl))", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateGoal} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "11px", fontWeight: "600", textTransform: "uppercase", color: "hsl(var(--text-muted-hsl))" }}>Goal Name</label>
                <input
                  type="text"
                  placeholder="e.g. Complete Q3 Product Launch"
                  value={newGoalName}
                  onChange={(e) => setNewGoalName(e.target.value)}
                  className="input-field"
                  required
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "11px", fontWeight: "600", textTransform: "uppercase", color: "hsl(var(--text-muted-hsl))" }}>Goal Description</label>
                <textarea
                  placeholder="Summarize target achievements..."
                  value={newGoalDesc}
                  onChange={(e) => setNewGoalDesc(e.target.value)}
                  className="input-field"
                  style={{ height: "60px", resize: "none", fontSize: "12.5px" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "11px", fontWeight: "600", textTransform: "uppercase", color: "hsl(var(--text-muted-hsl))" }}>Metric Key Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Tasks Completed"
                    value={newTargetName}
                    onChange={(e) => setNewTargetName(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "11px", fontWeight: "600", textTransform: "uppercase", color: "hsl(var(--text-muted-hsl))" }}>Target Goal Value</label>
                  <input
                    type="number"
                    value={newTargetValue}
                    onChange={(e) => setNewTargetValue(parseInt(e.target.value) || 100)}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "11px", fontWeight: "600", textTransform: "uppercase", color: "hsl(var(--text-muted-hsl))" }}>Unit Name</label>
                <input
                  type="text"
                  placeholder="e.g. tasks, $, features"
                  value={newTargetUnit}
                  onChange={(e) => setNewTargetUnit(e.target.value)}
                  className="input-field"
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ display: "flex", gap: "6px" }}>
                  <Check size={14} />
                  Initialize Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
