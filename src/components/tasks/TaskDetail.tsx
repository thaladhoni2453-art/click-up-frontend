import React, { useState } from "react";
import { useTaskDetails, useTaskMutations } from "../../hooks/useTasks";
import { useUIStore } from "../../stores/uiStore";
import { X, Clock, MessageSquare, AlertCircle, Plus, Calendar, Bookmark, Send } from "lucide-react";

export const TaskDetail: React.FC = () => {
  const { selectedTaskId, setSelectedTaskId } = useUIStore();
  const { data: task, isLoading, refetch } = useTaskDetails(selectedTaskId);
  const { updateTask, addComment, logTime } = useTaskMutations();

  const [commentText, setCommentText] = useState("");
  const [timeDescription, setTimeDescription] = useState("");
  const [timeHours, setTimeHours] = useState("");
  const [showTimeModal, setShowTimeModal] = useState(false);

  const handleStatusChange = (statusId: string) => {
    if (!selectedTaskId) return;
    updateTask.mutate({ taskId: selectedTaskId, updateData: { statusId } });
  };

  const handlePriorityChange = (priority: string) => {
    if (!selectedTaskId) return;
    updateTask.mutate({ taskId: selectedTaskId, updateData: { priority } });
  };

  const handleSaveDescription = (description: string) => {
    if (!selectedTaskId) return;
    updateTask.mutate({ taskId: selectedTaskId, updateData: { description } });
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedTaskId) return;

    addComment.mutate({ taskId: selectedTaskId, content: commentText }, {
      onSuccess: () => {
        setCommentText("");
        refetch();
      }
    });
  };

  const handleLogTime = (e: React.FormEvent) => {
    e.preventDefault();
    if (!timeHours || !selectedTaskId) return;

    const hoursFloat = parseFloat(timeHours);
    const started = new Date();
    const ended = new Date(started.getTime() + hoursFloat * 60 * 60 * 1000);

    logTime.mutate({
      taskId: selectedTaskId,
      startedAt: started.toISOString(),
      endedAt: ended.toISOString(),
      description: timeDescription,
      billable: true,
    }, {
      onSuccess: () => {
        setTimeHours("");
        setTimeDescription("");
        setShowTimeModal(false);
        refetch();
      }
    });
  };

  if (!selectedTaskId) return null;

  return (
    <div 
      className="glass-panel" 
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        width: "480px",
        height: "100vh",
        background: "rgba(10, 12, 18, 0.95)",
        boxShadow: "var(--shadow-lg)",
        borderLeft: "1px solid hsl(var(--border-hsl))",
        display: "flex",
        flexDirection: "column",
        zIndex: 100,
        animation: "slideInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      }}
    >
      {/* Header bar controls */}
      <div style={{ padding: "20px 24px", borderBottom: "1px solid hsl(var(--border-hsl))", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "15px", color: "white" }}>
          <Bookmark size={16} style={{ color: "hsl(var(--primary-light-hsl))" }} />
          Task Specification Details
        </h3>
        <button 
          onClick={() => setSelectedTaskId(null)}
          style={{ background: "transparent", border: "none", color: "hsl(var(--text-secondary-hsl))", cursor: "pointer" }}
        >
          <X size={18} />
        </button>
      </div>

      {isLoading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "hsl(var(--text-muted-hsl))" }}>Loading task details...</div>
      ) : !task ? (
        <div style={{ padding: "40px", textAlign: "center", color: "hsl(var(--error-hsl))" }}>Failed to load task.</div>
      ) : (
        <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Title name */}
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: "700", color: "white" }}>{task.name}</h2>
          </div>

          {/* Properties grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", paddingBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontSize: "11px", textTransform: "uppercase", color: "hsl(var(--text-muted-hsl))" }}>Priority</span>
              <select
                value={task.priority}
                onChange={(e) => handlePriorityChange(e.target.value)}
                className="input-field"
                style={{ height: "34px", background: "rgba(0,0,0,0.2)" }}
              >
                <option value="NONE">None</option>
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontSize: "11px", textTransform: "uppercase", color: "hsl(var(--text-muted-hsl))" }}>Due Date</span>
              <div className="input-field" style={{ display: "flex", alignItems: "center", gap: "8px", height: "34px", background: "rgba(0,0,0,0.2)", fontSize: "13px", color: "hsl(var(--text-secondary-hsl))" }}>
                <Calendar size={14} />
                <span>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No Date Assigned"}</span>
              </div>
            </div>
          </div>

          {/* Description section */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ fontSize: "11px", textTransform: "uppercase", color: "hsl(var(--text-muted-hsl))", fontWeight: 600 }}>Description</label>
            <textarea
              defaultValue={task.description || ""}
              onBlur={(e) => handleSaveDescription(e.target.value)}
              placeholder="Add detailed task specification logs here... Click outside to save."
              style={{ background: "rgba(0,0,0,0.2)", border: "1px solid hsl(var(--border-hsl))", color: "hsl(var(--text-secondary-hsl))", borderRadius: "var(--radius-md)", padding: "12px", fontSize: "13px", minHeight: "120px", resize: "none", outline: "none", lineHeight: "1.6" }}
            />
          </div>

          {/* Time Tracking panel */}
          <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid hsl(var(--border-hsl))", padding: "16px", borderRadius: "var(--radius-md)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: "600", color: "white" }}>
                <Clock size={14} style={{ color: "hsl(var(--accent-hsl))" }} />
                Tracked Hours: {task.timeSpent || 0} hrs
              </span>
              <button 
                onClick={() => setShowTimeModal(true)}
                style={{ background: "transparent", border: "none", color: "hsl(var(--primary-light-hsl))", cursor: "pointer", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}
              >
                <Plus size={13} />
                Log Time
              </button>
            </div>

            {/* Time logging mini-form */}
            {showTimeModal && (
              <form onSubmit={handleLogTime} style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "10px", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "12px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "8px" }}>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="Hours"
                    value={timeHours}
                    onChange={(e) => setTimeHours(e.target.value)}
                    className="input-field"
                    style={{ height: "32px", fontSize: "12px" }}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Work logs description..."
                    value={timeDescription}
                    onChange={(e) => setTimeDescription(e.target.value)}
                    className="input-field"
                    style={{ height: "32px", fontSize: "12px" }}
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowTimeModal(false)} style={{ padding: "4px 8px", fontSize: "11px", height: "26px" }}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{ padding: "4px 8px", fontSize: "11px", height: "26px" }}>Submit</button>
                </div>
              </form>
            )}
          </div>

          {/* Comments Feed Timeline */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", flex: 1 }}>
            <label style={{ fontSize: "11px", textTransform: "uppercase", color: "hsl(var(--text-muted-hsl))", fontWeight: 600 }}>Activity Comments Feed</label>

            {/* Comments thread list */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {task.comments?.map((c: any) => (
                <div key={c.id} style={{ display: "flex", gap: "10px", borderBottom: "1px solid rgba(255,255,255,0.02)", paddingBottom: "10px" }}>
                  <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "bold", color: "hsl(var(--primary-light-hsl))" }}>
                    {c.author?.fullName?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "baseline" }}>
                      <span style={{ fontSize: "12px", fontWeight: "600", color: "white" }}>{c.author?.fullName}</span>
                      <span style={{ fontSize: "9px", color: "hsl(var(--text-muted-hsl))" }}>{new Date(c.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <div style={{ fontSize: "13px", color: "hsl(var(--text-secondary-hsl))", marginTop: "4px", lineHeight: "1.4" }}>
                      {c.content}
                    </div>
                  </div>
                </div>
              ))}

              {(!task.comments || task.comments.length === 0) && (
                <div style={{ padding: "20px", textAlign: "center", color: "hsl(var(--text-muted-hsl))", fontSize: "12px" }}>No comments yet. Start a discussion!</div>
              )}
            </div>

            {/* Comment write form */}
            <form onSubmit={handleAddComment} style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
              <input
                type="text"
                placeholder="Ask a question or log status..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="input-field"
                style={{ flex: 1, height: "36px", fontSize: "12.5px" }}
              />
              <button type="submit" className="btn btn-primary" style={{ width: "36px", height: "36px", padding: 0 }}>
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
