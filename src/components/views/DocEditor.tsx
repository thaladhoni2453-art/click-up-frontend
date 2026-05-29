import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useUIStore } from "../../stores/uiStore";
import { Sparkles, FileText, Share2, Save, BookOpen, Plus, Heart, Trash2, Check } from "lucide-react";

export const DocEditor: React.FC = () => {
  const queryClient = useQueryClient();
  const { activeWorkspaceId } = useUIStore();
  const [activeDoc, setActiveDoc] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  // Fetch Documents from Database
  const { data: docs = [] } = useQuery({
    queryKey: ["docs", activeWorkspaceId],
    queryFn: async () => {
      if (!activeWorkspaceId) return [];
      const { data } = await api.get("/extra/docs", {
        params: { workspaceId: activeWorkspaceId }
      });
      return data;
    },
    enabled: !!activeWorkspaceId,
  });

  // Select first document if none selected
  useEffect(() => {
    if (docs.length > 0 && !activeDoc) {
      handleSelectDoc(docs[0]);
    }
  }, [docs, activeDoc]);

  const handleSelectDoc = (doc: any) => {
    setActiveDoc(doc);
    setTitle(doc.title);
    setContent(typeof doc.content === "string" ? doc.content : JSON.stringify(doc.content));
  };

  // Create Doc mutation
  const createDocMutation = useMutation({
    mutationFn: async (docData: any) => {
      const { data } = await api.post("/extra/docs", docData);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["docs", activeWorkspaceId] });
      handleSelectDoc(data);
    }
  });

  // Update Doc mutation
  const updateDocMutation = useMutation({
    mutationFn: async (updateData: { id: string; title: string; content: string }) => {
      const { data } = await api.patch(`/extra/docs/${updateData.id}`, {
        title: updateData.title,
        content: updateData.content
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["docs", activeWorkspaceId] });
      setSaving(false);
    }
  });

  // Delete Doc mutation
  const deleteDocMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/extra/docs/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["docs", activeWorkspaceId] });
      setActiveDoc(null);
      setTitle("");
      setContent("");
    }
  });

  const handleSave = () => {
    if (!activeDoc) return;
    setSaving(true);
    updateDocMutation.mutate({
      id: activeDoc.id,
      title,
      content
    });
  };

  const handleAddPage = () => {
    createDocMutation.mutate({
      workspaceId: activeWorkspaceId || "demo-ws",
      title: "Untitled Document Page",
      content: "Start writing collaborative text here..."
    });
  };

  const handleDeletePage = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this document page?")) {
      deleteDocMutation.mutate(id);
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", height: "100%", overflow: "hidden" }}>
      {/* Sub-document Pages sidebar */}
      <div style={{ borderRight: "1px solid hsl(var(--border-hsl))", padding: "20px 12px", background: "rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", color: "hsl(var(--text-muted-hsl))" }}>Pages</span>
          <button 
            onClick={handleAddPage}
            style={{ background: "transparent", border: "none", color: "white", cursor: "pointer", display: "flex", alignItems: "center" }}
          >
            <Plus size={14} />
          </button>
        </div>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {docs.map((p: any) => (
            <button
              key={p.id}
              onClick={() => handleSelectDoc(p)}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", background: activeDoc?.id === p.id ? "rgba(255,255,255,0.06)" : "transparent", border: "none", borderRadius: "var(--radius-sm)", color: "white", cursor: "pointer", fontSize: "12.5px", textAlign: "left" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
                <FileText size={13} style={{ color: "hsl(var(--primary-light-hsl))", flexShrink: 0 }} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</span>
              </div>
              <span onClick={(e) => handleDeletePage(p.id, e)} style={{ opacity: 0.4, cursor: "pointer" }} className="hover:opacity-100">
                <Trash2 size={12} style={{ color: "hsl(var(--error-hsl))" }} />
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Editor Canvas */}
      {activeDoc ? (
        <div style={{ padding: "30px 48px", display: "flex", flexDirection: "column", height: "100%", overflowY: "auto", background: "radial-gradient(circle at 50% 0%, rgba(142, 70, 229, 0.03) 0%, transparent 50%)" }}>
          {/* Actions header controls */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "hsl(var(--text-muted-hsl))" }}>
              <BookOpen size={14} />
              <span>Workspace Docs / {title}</span>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button className="btn btn-secondary" style={{ padding: "6px 12px", fontSize: "12.5px", display: "flex", gap: "6px" }}>
                <Share2 size={13} />
                Share
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleSave} 
                style={{ padding: "6px 12px", fontSize: "12.5px", display: "flex", gap: "6px" }}
                disabled={saving}
              >
                <Save size={13} />
                {saving ? "Saving..." : "Save Docs"}
              </button>
            </div>
          </div>

          {/* Content container */}
          <div className="glass-panel animate-fade-in" style={{ flex: 1, padding: "40px", borderRadius: "var(--radius-lg)", border: "1px solid hsl(var(--border-hsl))", display: "flex", flexDirection: "column", gap: "20px", background: "rgba(10, 12, 18, 0.4)", minHeight: "450px" }}>
            {/* Title editor field */}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ fontSize: "28px", fontWeight: "800", background: "transparent", border: "none", color: "white", outline: "none", fontFamily: "var(--font-display)", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "12px" }}
            />

            {/* Textarea Rich editor */}
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{ flex: 1, background: "transparent", border: "none", color: "hsl(var(--text-secondary-hsl))", outline: "none", fontSize: "14.5px", fontFamily: "inherit", resize: "none", lineHeight: "1.7", minHeight: "350px" }}
            />
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.02)" }}>
          <BookOpen size={40} style={{ color: "hsl(var(--text-muted-hsl))", marginBottom: "16px" }} />
          <p style={{ fontSize: "14px", color: "hsl(var(--text-secondary-hsl))", marginBottom: "16px" }}>No document page selected.</p>
          <button className="btn btn-primary" onClick={handleAddPage}>
            <Plus size={15} />
            Create First Page
          </button>
        </div>
      )}
    </div>
  );
};
