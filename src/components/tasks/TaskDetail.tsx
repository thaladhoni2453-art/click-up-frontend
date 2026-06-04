import React, { useState, useRef, useEffect } from "react";
import { useTaskDetails, useTaskMutations, useEligibleAssignees } from "../../hooks/useTasks";
import { useUIStore } from "../../stores/uiStore";
import { useQueryClient } from "@tanstack/react-query";
import { X, Clock, MessageSquare, AlertCircle, Plus, Calendar, Bookmark, Send, Check, User } from "lucide-react";

export const TaskDetail: React.FC = () => {
  const { selectedTaskId, setSelectedTaskId } = useUIStore();
  const queryClient = useQueryClient();
  const { data: task, isLoading, refetch } = useTaskDetails(selectedTaskId);
  const { data: eligibleUsers = [] } = useEligibleAssignees(selectedTaskId);
  const { updateTask, addComment, logTime, toggleAssignee } = useTaskMutations();
  const dateInputRef = useRef<HTMLInputElement>(null);

  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowAssigneeDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const currentAssigneeIds = task?.assignees?.map((a: any) => (a.user?.id || a.id || a.userId)) || [];
  
  const filteredUsers = eligibleUsers.filter((u: any) =>
    u.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleAssignee = (userId: string, isAssigned: boolean) => {
    if (!selectedTaskId) return;
    toggleAssignee.mutate({ taskId: selectedTaskId, userId, isAssigned });
  };

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

  const getFormattedDate = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toISOString().split("T")[0];
    } catch (e) {
      return "";
    }
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", paddingBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
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
              <div style={{ position: "relative", width: "100%", height: "34px" }}>
                {/* Hidden native date input */}
                <input
                  type="date"
                  ref={dateInputRef}
                  value={getFormattedDate(task.dueDate)}
                  onChange={(e) => {
                    if (!selectedTaskId) return;
                    updateTask.mutate({ taskId: selectedTaskId, updateData: { dueDate: e.target.value ? new Date(e.target.value).toISOString() : null } });
                  }}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "0px",
                    height: "0px",
                    visibility: "hidden"
                  }}
                />
                
                {/* Custom Trigger Button */}
                <button
                  type="button"
                  onClick={() => {
                    try {
                      dateInputRef.current?.showPicker();
                    } catch (err) {
                      dateInputRef.current?.focus();
                    }
                  }}
                  className="input-field"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    display: "flex", 
                    alignItems: "center", 
                    gap: "8px", 
                    background: "rgba(0,0,0,0.2)", 
                    fontSize: "13px", 
                    color: "hsl(var(--text-secondary-hsl))",
                    border: "1px solid hsl(var(--border-hsl))",
                    cursor: "pointer",
                    textAlign: "left"
                  }}
                >
                  <Calendar size={14} style={{ color: "hsl(var(--text-muted-hsl))" }} />
                  <span>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No Date Assigned"}</span>
                </button>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px", position: "relative" }}>
              <span style={{ fontSize: "11px", textTransform: "uppercase", color: "hsl(var(--text-muted-hsl))" }}>Assignee</span>
              <button
                type="button"
                onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                className="input-field"
                style={{
                  height: "34px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "rgba(0,0,0,0.2)",
                  fontSize: "13px",
                  color: "hsl(var(--text-secondary-hsl))",
                  border: "1px solid hsl(var(--border-hsl))",
                  cursor: "pointer",
                  textAlign: "left",
                  justifyContent: "flex-start",
                  padding: "0 10px"
                }}
              >
                {task.assignees && task.assignees.length > 0 ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "-6px" }}>
                    {task.assignees.slice(0, 2).map((a: any, idx: number) => {
                      const u = a.user || a;
                      return (
                        <div
                          key={u.id || idx}
                          style={{
                            width: "20px",
                            height: "20px",
                            borderRadius: "50%",
                            background: "hsl(var(--primary-hsl))",
                            border: "1px solid #1e2030",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "8.5px",
                            fontWeight: "700",
                            color: "white",
                            marginLeft: idx > 0 ? "-6px" : "0",
                          }}
                        >
                          {u.fullName?.charAt(0).toUpperCase() || "?"}
                        </div>
                      );
                    })}
                    {task.assignees.length > 2 ? (
                      <span style={{ fontSize: "11px", marginLeft: "2px" }}>+{task.assignees.length - 2}</span>
                    ) : (
                      <span style={{ fontSize: "12px", marginLeft: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {(task.assignees[0].user || task.assignees[0]).fullName?.split(" ")[0]}
                      </span>
                    )}
                  </div>
                ) : (
                  <>
                    <User size={13} style={{ color: "hsl(var(--text-muted-hsl))" }} />
                    <span>Assign</span>
                  </>
                )}
              </button>

              {/* Assignee Dropdown Popover */}
              {showAssigneeDropdown && (
                <div
                  ref={dropdownRef}
                  style={{
                    position: "absolute",
                    top: "38px",
                    right: 0,
                    width: "220px",
                    background: "#161823",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "8px",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                    zIndex: 200,
                    padding: "8px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px"
                  }}
                >
                  <input
                    type="text"
                    placeholder="Search people..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      background: "rgba(0,0,0,0.25)",
                      border: "1px solid hsl(var(--border-hsl))",
                      borderRadius: "4px",
                      padding: "4px 8px",
                      fontSize: "12px",
                      color: "white",
                      outline: "none"
                    }}
                  />
                  <div 
                    style={{ 
                      maxHeight: "150px", 
                      overflowY: "auto", 
                      display: "flex", 
                      flexDirection: "column", 
                      gap: "2px" 
                    }}
                  >
                    {filteredUsers.length === 0 ? (
                      <span style={{ fontSize: "11px", color: "hsl(var(--text-muted-hsl))", padding: "6px 8px", textAlign: "center" }}>
                        No eligible users found
                      </span>
                    ) : (
                      filteredUsers.map((u: any) => {
                        const isAssigned = currentAssigneeIds.includes(u.id);
                        return (
                          <div
                            key={u.id}
                            onClick={() => handleToggleAssignee(u.id, isAssigned)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "6px 8px",
                              borderRadius: "4px",
                              cursor: "pointer",
                              background: isAssigned ? "rgba(255,255,255,0.03)" : "transparent",
                              transition: "all 0.15s ease"
                            }}
                            onMouseEnter={(e) => { if (!isAssigned) e.currentTarget.style.background = "rgba(255,255,255,0.015)"; }}
                            onMouseLeave={(e) => { if (!isAssigned) e.currentTarget.style.background = "transparent"; }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", overflow: "hidden" }}>
                              <div style={{ 
                                width: "20px", 
                                height: "20px", 
                                borderRadius: "50%", 
                                background: "hsl(var(--primary-hsl))", 
                                display: "flex", 
                                alignItems: "center", 
                                justifyContent: "center", 
                                fontSize: "9px", 
                                fontWeight: "700", 
                                color: "white",
                                flexShrink: 0
                              }}>
                                {u.fullName?.charAt(0).toUpperCase()}
                              </div>
                              <span style={{ fontSize: "12.5px", color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {u.fullName}
                              </span>
                            </div>
                            {isAssigned && <Check size={13} style={{ color: "hsl(var(--primary-light-hsl))" }} />}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
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
