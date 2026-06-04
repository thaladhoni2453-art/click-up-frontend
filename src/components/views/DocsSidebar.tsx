import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useUIStore } from "../../stores/uiStore";
import { Plus, FileText, Trash2, Clock, Sparkles } from "lucide-react";

export const DocsSidebar: React.FC = () => {
  const queryClient = useQueryClient();
  const { activeDocId, setActiveDocId } = useUIStore();

  // Fetch all documents for this user
  const { data: docs = [], isLoading, isError, error } = useQuery({
    queryKey: ["docs-list"],
    queryFn: async () => {
      const { data } = await api.get("/docs");
      return data;
    },
  });

  // Create a new document
  const createDocMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/docs");
      return data;
    },
    onSuccess: (newDoc) => {
      queryClient.invalidateQueries({ queryKey: ["docs-list"] });
      setActiveDocId(newDoc.id);
    },
  });

  // Delete a document
  const deleteDocMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/docs/${id}`);
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["docs-list"] });
      if (activeDocId === deletedId) {
        // Remove the deleted doc from localStorage so we don't try to reload it
        localStorage.removeItem("wavework_last_doc_id");
        setActiveDocId(null);
      }
    },
  });

  // Remember and restore last active document for returning users
  React.useEffect(() => {
    if (!isLoading && docs && docs.length > 0) {
      const storedLastDocId = localStorage.getItem("wavework_last_doc_id");
      const isValidStoredDoc = storedLastDocId && docs.some((d: any) => d.id === storedLastDocId);

      if (activeDocId) {
        // Save the active document ID to localStorage whenever it changes
        localStorage.setItem("wavework_last_doc_id", activeDocId);
      } else {
        // If activeDocId is null, load where they left off or select the first available document
        if (isValidStoredDoc) {
          setActiveDocId(storedLastDocId);
        } else {
          setActiveDocId(docs[0].id);
        }
      }
    } else if (!isLoading && docs && docs.length === 0) {
      // Clean up local storage if they have no docs left
      localStorage.removeItem("wavework_last_doc_id");
    }
  }, [docs, isLoading, activeDocId, setActiveDocId]);

  const handleCreateDoc = () => {
    createDocMutation.mutate();
  };

  const handleDeleteDoc = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this document permanently?")) {
      deleteDocMutation.mutate(id);
    }
  };

  const formatLastEdited = (timestamp: string) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return (
    <div style={{
      width: "260px",
      borderRight: "1px solid rgba(255, 255, 255, 0.08)",
      background: "rgba(15, 17, 28, 0.4)",
      backdropFilter: "blur(20px)",
      display: "flex",
      flexDirection: "column",
      height: "100%",
      padding: "20px 16px",
      gap: "20px",
      overflowY: "auto"
    }}>
      {/* Header section with Premium Wow-factor */}
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{
            background: "linear-gradient(135deg, hsl(263, 90%, 64%), hsl(195, 100%, 50%))",
            padding: "6px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 12px rgba(139, 92, 246, 0.25)"
          }}>
            <Sparkles size={16} style={{ color: "white" }} />
          </div>
          <div>
            <h2 style={{ fontSize: "16px", fontWeight: "700", color: "white", margin: 0, letterSpacing: "-0.01em" }}>Workspace Docs</h2>
            <span style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.45)", fontWeight: "500" }}>Collaborative Canvas</span>
          </div>
        </div>

        <button 
          onClick={handleCreateDoc}
          disabled={createDocMutation.isPending}
          style={{
            width: "100%",
            padding: "10px 14px",
            background: "linear-gradient(135deg, hsl(263, 90%, 64%) 0%, hsl(263, 80%, 58%) 100%)",
            color: "white",
            border: "none",
            borderRadius: "10px",
            fontSize: "13px",
            fontWeight: "600",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            boxShadow: "0 4px 15px rgba(139, 92, 246, 0.3)",
            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
            transform: "translateY(0)"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = "0 6px 20px rgba(139, 92, 246, 0.45)";
            e.currentTarget.style.filter = "brightness(1.05)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = "0 4px 15px rgba(139, 92, 246, 0.3)";
            e.currentTarget.style.filter = "none";
          }}
        >
          <Plus size={16} />
          {createDocMutation.isPending ? "Creating..." : "New Doc"}
        </button>
      </div>

      {/* Docs List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1 }}>
        <span style={{
          fontSize: "11px",
          fontWeight: "700",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "rgba(255, 255, 255, 0.35)",
          paddingLeft: "6px",
          marginBottom: "4px"
        }}>
          All Pages ({docs.length})
        </span>

        {isLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "20px 0", color: "rgba(255, 255, 255, 0.3)" }}>
            <span style={{ fontSize: "12px" }}>Loading documents...</span>
          </div>
        ) : isError ? (
          <div style={{ padding: "12px", border: "1px dashed rgba(239, 68, 68, 0.2)", borderRadius: "10px", background: "rgba(239, 68, 68, 0.05)", color: "hsl(350, 90%, 60%)", fontSize: "12px", textAlign: "center" }}>
            <span>Error: {(error as any)?.response?.data?.error || (error as any)?.message || "Failed to load"}</span>
          </div>
        ) : docs.length === 0 ? (
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "32px 12px",
            border: "1px dashed rgba(255, 255, 255, 0.08)",
            borderRadius: "12px",
            background: "rgba(255,255,255,0.01)",
            textAlign: "center",
            gap: "8px"
          }}>
            <FileText size={20} style={{ color: "rgba(255, 255, 255, 0.2)" }} />
            <span style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.35)", fontWeight: "500" }}>No documents yet. Create one to begin!</span>
          </div>
        ) : (
          <div 
            className="custom-scrollbar"
            style={{ 
              display: "flex", 
              flexDirection: "column", 
              gap: "4px", 
              maxHeight: "calc(100vh - 210px)", 
              overflowY: "auto",
              paddingRight: "2px"
            }}
          >
            {docs.map((doc: any) => {
              const isActive = activeDocId === doc.id;
              return (
                <div
                  key={doc.id}
                  onClick={() => setActiveDocId(doc.id)}
                  style={{
                    position: "relative",
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    background: isActive ? "rgba(139, 92, 246, 0.12)" : "rgba(255, 255, 255, 0.02)",
                    border: "1px solid",
                    borderColor: isActive ? "rgba(139, 92, 246, 0.3)" : "transparent",
                    borderRadius: "10px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    group: "true"
                  }}
                  className="doc-sidebar-item"
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)";
                    }
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", overflow: "hidden", flex: 1, paddingRight: "8px" }}>
                    <FileText 
                      size={15} 
                      style={{ 
                        color: isActive ? "hsl(263, 90%, 64%)" : "rgba(255, 255, 255, 0.5)", 
                        flexShrink: 0 
                      }} 
                    />
                    <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                      <span style={{ 
                        fontSize: "13px", 
                        fontWeight: isActive ? "600" : "500", 
                        color: isActive ? "white" : "rgba(255, 255, 255, 0.85)", 
                        overflow: "hidden", 
                        textOverflow: "ellipsis", 
                        whiteSpace: "nowrap" 
                      }}>
                        {doc.title || "Untitled"}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "3px" }}>
                        <Clock size={10} style={{ color: "rgba(255, 255, 255, 0.25)" }} />
                        <span style={{ fontSize: "10px", color: "rgba(255, 255, 255, 0.35)", fontWeight: "500" }}>
                          {formatLastEdited(doc.updated_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleDeleteDoc(e, doc.id)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "rgba(255, 255, 255, 0.35)",
                      cursor: "pointer",
                      padding: "4px",
                      borderRadius: "6px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.2s ease"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "hsl(350, 90%, 60%)";
                      e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "rgba(255, 255, 255, 0.35)";
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
