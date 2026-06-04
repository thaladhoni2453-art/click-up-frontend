import React, { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { api } from "../../lib/api";
import { useUIStore } from "../../stores/uiStore";
import { DocsSidebar } from "./DocsSidebar";
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  List, 
  ListOrdered, 
  BookOpen, 
  Plus, 
  Check, 
  Loader2, 
  AlertCircle,
  PenTool,
  Highlighter,
  Eraser,
  RotateCcw,
  Download,
  FileText
} from "lucide-react";

export const DocEditor: React.FC = () => {
  const queryClient = useQueryClient();
  const { activeDocId, setActiveDocId } = useUIStore();
  const [activeTab, setActiveTab] = useState<"text" | "whiteboard">("text");

  // Core editor states
  const [title, setTitle] = useState("");
  const [editorContent, setEditorContent] = useState("");
  const [drawingData, setDrawingData] = useState("");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle" | "error">("idle");

  // Whiteboard Canvas states
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<"pen" | "marker" | "eraser">("pen");
  const [brushColor, setBrushColor] = useState("hsl(263, 90%, 64%)");
  const [brushSize, setBrushSize] = useState(6);

  // Fetch the active single document
  const { data: doc, isLoading: isDocLoading, isError } = useQuery({
    queryKey: ["doc", activeDocId],
    queryFn: async () => {
      if (!activeDocId) return null;
      const { data } = await api.get(`/docs/${activeDocId}`);
      return data;
    },
    enabled: !!activeDocId,
  });

  // Initialize Tiptap Editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline
    ],
    content: "",
    onUpdate: ({ editor }) => {
      setEditorContent(editor.getHTML());
    },
  });

  // Load document content into editor, drawing state, and title state when activeDocId or doc changes
  useEffect(() => {
    if (doc && activeDocId === doc.id) {
      setTitle(doc.title || "");
      
      // Parse content to support dual text/drawing JSON schema or fallback to legacy plain text
      let textVal = "";
      let drawVal = "";
      
      try {
        const parsed = JSON.parse(doc.content);
        textVal = parsed.text || "";
        drawVal = parsed.drawing || "";
      } catch (e) {
        textVal = doc.content || "";
        drawVal = "";
      }

      setEditorContent(textVal);
      setDrawingData(drawVal);
      
      if (editor) {
        const currentHTML = editor.getHTML();
        if (currentHTML !== textVal) {
          editor.commands.setContent(textVal);
        }
      }
    } else {
      // Instantly clear editor states when loading, switching, or when no active doc is set
      setTitle("");
      setEditorContent("");
      setDrawingData("");
      if (editor) {
        editor.commands.setContent("");
      }
    }
  }, [doc, activeDocId, editor]);

  // Load drawing image onto canvas when tab changes to whiteboard or new document loads
  useEffect(() => {
    if (activeTab === "whiteboard" && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Clear canvas first
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Render saved base64 image if it exists
        if (drawingData) {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0);
          };
          img.src = drawingData;
        }
      }
    }
  }, [activeTab, activeDocId, drawingData]);

  // Debounced Autosave Logic (1 second after typing/drawing stops)
  useEffect(() => {
    if (!activeDocId || !doc || activeDocId !== doc.id) return;

    // Check if title, editor content, or whiteboard drawing has changed from what is in cache/DB
    let dbText = "";
    let dbDraw = "";
    try {
      const parsed = JSON.parse(doc.content);
      dbText = parsed.text || "";
      dbDraw = parsed.drawing || "";
    } catch (e) {
      dbText = doc.content || "";
      dbDraw = "";
    }

    const isTitleChanged = title !== doc.title;
    const isContentChanged = editorContent !== dbText;
    const isDrawingChanged = drawingData !== dbDraw;

    if (!isTitleChanged && !isContentChanged && !isDrawingChanged) {
      return;
    }

    setSaveStatus("saving");

    const timer = setTimeout(async () => {
      try {
        const packedContent = JSON.stringify({
          text: editorContent,
          drawing: drawingData
        });

        await api.put(`/docs/${activeDocId}`, {
          title,
          content: packedContent
        });

        // 1. Invalidate docs list in sidebar to refresh titles/last updated times
        queryClient.invalidateQueries({ queryKey: ["docs-list"] });

        // 2. Proactively update the query cache for this specific document
        // so that it matches our new states, preventing any infinite update loops
        queryClient.setQueryData(["doc", activeDocId], (old: any) => {
          if (!old) return old;
          return { ...old, title, content: packedContent };
        });

        setSaveStatus("saved");
      } catch (err) {
        console.error("Failed to autosave doc:", err);
        setSaveStatus("error");
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [title, editorContent, drawingData, activeDocId, doc, queryClient]);

  // Cleanup editor on unmount
  useEffect(() => {
    return () => {
      if (editor) {
        editor.destroy();
      }
    };
  }, []);

  const handleCreateFirstDoc = async () => {
    try {
      setSaveStatus("saving");
      const { data } = await api.post("/docs");
      queryClient.invalidateQueries({ queryKey: ["docs-list"] });
      setActiveDocId(data.id);
      setSaveStatus("saved");
    } catch (err) {
      console.error("Failed to create document:", err);
      setSaveStatus("error");
    }
  };

  // Whiteboard drawing event handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);

    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (currentTool === "pen") {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = brushColor;
      ctx.globalAlpha = 1.0;
    } else if (currentTool === "marker") {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = brushColor;
      ctx.globalAlpha = 0.35; // Semitransparent highlighting marker
    } else if (currentTool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.globalAlpha = 1.0;
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    // Capture canvas PNG and update local state to trigger debounced autosave
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL("image/png");
      setDrawingData(dataUrl);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setDrawingData("");
    }
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `${title || "Untitled"}-sketch.png`;
    link.href = dataUrl;
    link.click();
  };

  // Rendering Toolbar Button Helper
  const renderToolbarBtn = (
    icon: React.ReactNode, 
    isActive: boolean, 
    onClick: () => void, 
    label?: string
  ) => (
    <button
      onClick={onClick}
      style={{
        padding: "6px 10px",
        background: isActive ? "rgba(139, 92, 246, 0.2)" : "transparent",
        border: "1px solid",
        borderColor: isActive ? "rgba(139, 92, 246, 0.35)" : "transparent",
        color: isActive ? "white" : "rgba(255, 255, 255, 0.65)",
        borderRadius: "6px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: label ? "700" : "normal",
        fontSize: label ? "12px" : "inherit",
        gap: "4px",
        transition: "all 0.15s ease",
        outline: "none"
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.color = "white";
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.color = "rgba(255, 255, 255, 0.65)";
          e.currentTarget.style.background = "transparent";
        }
      }}
    >
      {icon}
      {label && <span>{label}</span>}
    </button>
  );

  return (
    <div style={{ display: "flex", width: "100%", height: "100%", overflow: "hidden", background: "hsl(var(--background-hsl))" }}>
      {/* Side Navigation for Docs */}
      <DocsSidebar />

      {/* Main Canvas Area */}
      <div style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        
        {activeDocId ? (
          isDocLoading ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", color: "rgba(255, 255, 255, 0.5)" }}>
              <Loader2 className="animate-spin" size={20} />
              <span>Fetching document contents...</span>
            </div>
          ) : isError || !doc ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "14px", color: "rgba(255, 255, 255, 0.5)" }}>
              <AlertCircle size={32} style={{ color: "hsl(350, 90%, 60%)" }} />
              <span>Failed to load document. Please choose another or try again.</span>
              <button 
                className="btn btn-secondary" 
                onClick={() => setActiveDocId(null)}
                style={{ padding: "8px 16px", fontSize: "13px" }}
              >
                Go Back
              </button>
            </div>
          ) : (
            <div 
              className="custom-scrollbar"
              style={{ 
                flex: 1, 
                padding: "24px 36px", 
                display: "flex", 
                flexDirection: "column", 
                gap: "16px", 
                overflowY: "auto",
                background: "radial-gradient(circle at 50% 0%, rgba(142, 70, 229, 0.04) 0%, transparent 60%)"
              }}
            >
              {/* Header Status & Navigation Path */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "rgba(255, 255, 255, 0.45)" }}>
                  <BookOpen size={14} />
                  <span>Docs</span>
                  <span>/</span>
                  <span style={{ color: "rgba(255, 255, 255, 0.75)", fontWeight: "500" }}>{title || "Untitled"}</span>
                </div>

                {/* Intelligent Autosave Indicator Badge */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {saveStatus === "saving" && (
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "rgba(245, 158, 11, 0.1)",
                      border: "1px solid rgba(245, 158, 11, 0.25)",
                      padding: "4px 10px",
                      borderRadius: "20px",
                      fontSize: "11px",
                      color: "hsl(35, 90%, 60%)",
                      fontWeight: "600"
                    }}>
                      <Loader2 className="animate-spin" size={11} />
                      <span>Saving...</span>
                    </div>
                  )}
                  {saveStatus === "saved" && (
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "rgba(16, 185, 129, 0.1)",
                      border: "1px solid rgba(16, 185, 129, 0.25)",
                      padding: "4px 10px",
                      borderRadius: "20px",
                      fontSize: "11px",
                      color: "hsl(150, 80%, 50%)",
                      fontWeight: "600"
                    }}>
                      <Check size={11} />
                      <span>Saved</span>
                    </div>
                  )}
                  {saveStatus === "error" && (
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "rgba(239, 68, 68, 0.1)",
                      border: "1px solid rgba(239, 68, 68, 0.25)",
                      padding: "4px 10px",
                      borderRadius: "20px",
                      fontSize: "11px",
                      color: "hsl(350, 90%, 60%)",
                      fontWeight: "600"
                    }}>
                      <AlertCircle size={11} />
                      <span>Autosave failed</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Collaborative Paper panel */}
              <div 
                className="glass-panel" 
                style={{ 
                  minHeight: "650px",
                  display: "flex", 
                  flexDirection: "column", 
                  background: "rgba(10, 12, 18, 0.35)", 
                  border: "1px solid rgba(255, 255, 255, 0.08)", 
                  borderRadius: "16px",
                  overflow: "hidden",
                  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
                  flexShrink: 0
                }}
              >
                {/* Visual Canvas and Editor Tabs */}
                <div style={{
                  display: "flex",
                  background: "rgba(0,0,0,0.12)",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  padding: "0 16px"
                }}>
                  <button
                    onClick={() => setActiveTab("text")}
                    style={{
                      padding: "12px 18px",
                      background: "transparent",
                      border: "none",
                      borderBottom: activeTab === "text" ? "2px solid hsl(263, 90%, 64%)" : "2px solid transparent",
                      color: activeTab === "text" ? "white" : "rgba(255,255,255,0.45)",
                      fontSize: "13px",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      transition: "all 0.15s ease"
                    }}
                  >
                    <FileText size={14} />
                    📝 Document Text
                  </button>
                  <button
                    onClick={() => setActiveTab("whiteboard")}
                    style={{
                      padding: "12px 18px",
                      background: "transparent",
                      border: "none",
                      borderBottom: activeTab === "whiteboard" ? "2px solid hsl(263, 90%, 64%)" : "2px solid transparent",
                      color: activeTab === "whiteboard" ? "white" : "rgba(255,255,255,0.45)",
                      fontSize: "13px",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      transition: "all 0.15s ease"
                    }}
                  >
                    <PenTool size={14} />
                    🎨 Interactive Whiteboard
                  </button>
                </div>

                {/* Tab Content 1: Tiptap Text Editor */}
                {activeTab === "text" && (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                    {/* Tiptap Rich Text Toolbar */}
                    {editor && (
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "6px",
                        padding: "10px 16px",
                        background: "rgba(255, 255, 255, 0.02)",
                        borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                      }}>
                        {renderToolbarBtn(
                          <Bold size={15} />, 
                          editor.isActive("bold"), 
                          () => editor.chain().focus().toggleBold().run()
                        )}
                        {renderToolbarBtn(
                          <Italic size={15} />, 
                          editor.isActive("italic"), 
                          () => editor.chain().focus().toggleItalic().run()
                        )}
                        {renderToolbarBtn(
                          <UnderlineIcon size={15} />, 
                          editor.isActive("underline"), 
                          () => editor.chain().focus().toggleUnderline().run()
                        )}

                        <div style={{ width: "1px", height: "18px", background: "rgba(255,255,255,0.1)", margin: "0 4px" }} />

                        {renderToolbarBtn(
                          null, 
                          editor.isActive("heading", { level: 1 }), 
                          () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
                          "H1"
                        )}
                        {renderToolbarBtn(
                          null, 
                          editor.isActive("heading", { level: 2 }), 
                          () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
                          "H2"
                        )}

                        <div style={{ width: "1px", height: "18px", background: "rgba(255,255,255,0.1)", margin: "0 4px" }} />

                        {renderToolbarBtn(
                          <List size={15} />, 
                          editor.isActive("bulletList"), 
                          () => editor.chain().focus().toggleBulletList().run()
                        )}
                        {renderToolbarBtn(
                          <ListOrdered size={15} />, 
                          editor.isActive("orderedList"), 
                          () => editor.chain().focus().toggleOrderedList().run()
                        )}
                      </div>
                    )}

                    {/* Paper Canvas (Title Input + Rich Editor Area) */}
                    <div style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      padding: "32px",
                      gap: "20px"
                    }}>
                      {/* Premium Title Field */}
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Untitled"
                        style={{
                          fontSize: "30px",
                          fontWeight: "800",
                          background: "transparent",
                          border: "none",
                          color: "white",
                          outline: "none",
                          fontFamily: "var(--font-display)",
                          letterSpacing: "-0.02em",
                          borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                          paddingBottom: "12px",
                          width: "100%"
                        }}
                      />

                      {/* Rich Tiptap Canvas */}
                      <div style={{ flex: 1, minHeight: "350px" }}>
                        <EditorContent editor={editor} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab Content 2: Whiteboard Explain Sketchpad */}
                {activeTab === "whiteboard" && (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "rgba(0,0,0,0.1)" }}>
                    {/* Whiteboard Toolbar controls */}
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "8px",
                      padding: "10px 16px",
                      background: "rgba(255, 255, 255, 0.02)",
                      borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                    }}>
                      {/* Tool Toggles */}
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        {renderToolbarBtn(
                          <PenTool size={14} />,
                          currentTool === "pen",
                          () => setCurrentTool("pen")
                        )}
                        {renderToolbarBtn(
                          <Highlighter size={14} />,
                          currentTool === "marker",
                          () => setCurrentTool("marker")
                        )}
                        {renderToolbarBtn(
                          <Eraser size={14} />,
                          currentTool === "eraser",
                          () => setCurrentTool("eraser")
                        )}
                      </div>

                      {/* Thickness control slider */}
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "rgba(255,255,255,0.45)" }}>
                        <span>Size: {brushSize}px</span>
                        <input
                          type="range"
                          min="2"
                          max="32"
                          value={brushSize}
                          onChange={(e) => setBrushSize(parseInt(e.target.value))}
                          style={{
                            width: "80px",
                            accentColor: brushColor,
                            cursor: "pointer"
                          }}
                        />
                      </div>

                      {/* Pen Colors */}
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        {[
                          "hsl(263, 90%, 64%)", // Purple
                          "hsl(195, 100%, 50%)", // Cyan
                          "hsl(142, 70%, 45%)", // Green
                          "hsl(350, 80%, 55%)", // Red
                          "hsl(38, 92%, 50%)", // Amber
                          "#ffffff" // White
                        ].map((c) => {
                          const isSelected = brushColor === c;
                          return (
                            <button
                              key={c}
                              onClick={() => {
                                setBrushColor(c);
                                if (currentTool === "eraser") {
                                  setCurrentTool("pen");
                                }
                              }}
                              style={{
                                width: "20px",
                                height: "20px",
                                borderRadius: "50%",
                                background: c,
                                border: isSelected ? "2px solid white" : "1px solid rgba(255,255,255,0.2)",
                                cursor: "pointer",
                                transform: isSelected ? "scale(1.15)" : "scale(1)",
                                transition: "all 0.15s ease",
                                outline: "none"
                              }}
                            />
                          );
                        })}
                      </div>

                      {/* Actions */}
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <button
                          onClick={clearCanvas}
                          style={{
                            background: "transparent",
                            border: "1px solid rgba(239, 68, 68, 0.25)",
                            color: "hsl(350, 90%, 60%)",
                            padding: "6px 12px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "12px",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            fontWeight: "600",
                            transition: "all 0.2s ease"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                        >
                          <RotateCcw size={12} />
                          Clear Board
                        </button>
                        <button
                          onClick={downloadCanvas}
                          style={{
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            color: "white",
                            padding: "6px 12px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "12px",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            fontWeight: "600",
                            transition: "all 0.2s ease"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                        >
                          <Download size={12} />
                          Export sketch
                        </button>
                      </div>
                    </div>

                    {/* Canvas sketching board */}
                    <div style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "24px",
                      position: "relative",
                      overflow: "auto",
                      minHeight: "530px"
                    }}>
                      <div style={{
                        position: "absolute",
                        top: "12px",
                        left: "24px",
                        fontSize: "11px",
                        color: "rgba(255,255,255,0.3)",
                        fontWeight: "500",
                        pointerEvents: "none"
                      }}>
                        💡 Sketch here! Draw diagrams, flowcharts, or write with pen/markers. Changes autosave automatically.
                      </div>
                      <canvas
                        key={activeDocId} // Reset and cleanly rebuild canvas when active document changes
                        ref={canvasRef}
                        width={800}
                        height={480}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        style={{
                          background: "linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)",
                          backgroundSize: "20px 20px",
                          backgroundColor: "#0d0e12",
                          borderRadius: "12px",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                          cursor: "crosshair",
                          boxShadow: "inset 0 4px 20px rgba(0,0,0,0.5)"
                        }}
                      />
                    </div>
                  </div>
                )}

              </div>
            </div>
          )
        ) : (
          /* Landing/Empty State when no document ID is active in URL */
          <div style={{ 
            flex: 1, 
            display: "flex", 
            flexDirection: "column", 
            alignItems: "center", 
            justifyContent: "center",
            background: "radial-gradient(circle at 50% 50%, rgba(142, 70, 229, 0.02) 0%, transparent 60%)",
            gap: "20px",
            padding: "24px"
          }}>
            <div style={{
              background: "rgba(139, 92, 246, 0.08)",
              border: "1px solid rgba(139, 92, 246, 0.15)",
              padding: "24px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 32px rgba(139, 92, 246, 0.15)"
            }}>
              <BookOpen size={48} style={{ color: "hsl(263, 90%, 64%)" }} />
            </div>
            <div style={{ textAlign: "center", maxWidth: "340px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "700", color: "white", margin: 0 }}>No Document Open</h3>
              <p style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.45)", lineHeight: "1.6", margin: 0 }}>
                Select a document from the left sidebar or create a new collaborative page to start writing.
              </p>
            </div>
            <button 
              className="btn btn-primary" 
              onClick={handleCreateFirstDoc}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 18px",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: "600",
                background: "linear-gradient(135deg, hsl(263, 90%, 64%) 0%, hsl(263, 80%, 58%) 100%)",
                border: "none",
                color: "white",
                cursor: "pointer",
                boxShadow: "0 4px 15px rgba(139, 92, 246, 0.3)"
              }}
            >
              <Plus size={16} />
              Create a Document
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
