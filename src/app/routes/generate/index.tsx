import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  AlertCircle,
  Brain,
  Check,
  ChevronDown,
  ChevronRight,
  Loader2,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { generateSection, regenerateSection } from "@/lib/pipeline/generator";
import type { OutlineSection } from "@/lib/pipeline/analyzer";
import { TextEmbedder } from "@/lib/knowledge/rag/embedder";
import type { SearchResult } from "@/lib/knowledge/rag/vector-store";
import {
  useProjectStore,
  type GeneratedSection,
  type ProjectFile,
} from "@/lib/store/project";
import { useGenerationStore } from "@/lib/store/generation";
import { useSettingsStore } from "@/lib/store/settings";
import { cn } from "@/lib/utils";

function flattenOutline(sections: GeneratedSection[]): GeneratedSection[] {
  const out: GeneratedSection[] = [];
  function walk(list: GeneratedSection[]) {
    for (const s of list) {
      out.push(s);
      if (s.children.length) walk(s.children);
    }
  }
  walk(sections);
  return out;
}

function generatedToOutline(s: GeneratedSection): OutlineSection {
  return {
    title: s.title,
    level: s.level,
    description:
      s.content.trim().slice(0, 800) ||
      "根据项目需求撰写本小节，保持与参考材料一致的专业表述。",
    children: s.children.map(generatedToOutline),
  };
}

function buildRagFromReferenceFiles(files: ProjectFile[]): SearchResult[] {
  const ref = files.filter((f) => f.type === "reference" && f.parsed && f.content?.trim());
  if (ref.length === 0) return [];
  const embedder = new TextEmbedder();
  embedder.addDocuments(ref.map((f) => f.content!));
  const out: SearchResult[] = [];
  for (const f of ref.slice(0, 6)) {
    const text = f.content!.slice(0, 4000);
    out.push({
      score: 1,
      entry: {
        id: f.id,
        text,
        vector: embedder.embed(text),
        metadata: {
          sourceFile: f.name,
          chapterPath: "",
          nodeType: "reference",
        },
      },
    });
  }
  return out;
}

function statusBadgeVariant(
  s: GeneratedSection["status"],
): "default" | "info" | "success" | "error" {
  switch (s) {
    case "done":
      return "success";
    case "generating":
      return "info";
    case "error":
      return "error";
    default:
      return "default";
  }
}

function statusLabel(s: GeneratedSection["status"]): string {
  switch (s) {
    case "pending":
      return "待生成";
    case "generating":
      return "生成中";
    case "done":
      return "已完成";
    case "error":
      return "失败";
  }
}

interface TreeProps {
  sections: GeneratedSection[];
  depth: number;
  selectedId: string | null;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
}

function OutlineTree({
  sections,
  depth,
  selectedId,
  expanded,
  onToggle,
  onSelect,
}: TreeProps) {
  return (
    <ul className={cn("space-y-0.5", depth > 0 && "ml-4 border-l border-gray-200 pl-2")}>
      {sections.map((sec) => {
        const hasChildren = sec.children.length > 0;
        const isOpen = expanded.has(sec.id);
        const isSel = selectedId === sec.id;
        return (
          <li key={sec.id}>
            <div
              className={cn(
                "flex items-center gap-1 rounded-lg py-1 pr-2 text-sm",
                isSel && "bg-blue-50",
              )}
            >
              {hasChildren ? (
                <button
                  type="button"
                  className="rounded p-0.5 text-gray-500 hover:bg-gray-200"
                  onClick={() => onToggle(sec.id)}
                  aria-expanded={isOpen}
                >
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4" aria-hidden />
                  ) : (
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  )}
                </button>
              ) : (
                <span className="w-5" />
              )}
              <button
                type="button"
                className={cn(
                  "min-w-0 flex-1 truncate text-left font-medium",
                  isSel ? "text-blue-800" : "text-gray-800",
                )}
                onClick={() => onSelect(sec.id)}
              >
                {sec.title}
              </button>
              <Badge variant={statusBadgeVariant(sec.status)} className="shrink-0">
                {statusLabel(sec.status)}
              </Badge>
            </div>
            {hasChildren && isOpen ? (
              <OutlineTree
                sections={sec.children}
                depth={depth + 1}
                selectedId={selectedId}
                expanded={expanded}
                onToggle={onToggle}
                onSelect={onSelect}
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function findSection(
  sections: GeneratedSection[],
  id: string,
): GeneratedSection | null {
  for (const s of sections) {
    if (s.id === id) return s;
    const c = findSection(s.children, id);
    if (c) return c;
  }
  return null;
}

export function GeneratePage() {
  const { id: projectId } = useParams<{ id: string }>();
  const projects = useProjectStore((s) => s.projects);
  const updateSection = useProjectStore((s) => s.updateSection);
  const updateSectionContent = useProjectStore((s) => s.updateSectionContent);

  const aiConfig = useSettingsStore((s) => s.aiConfig);

  const isGenerating = useGenerationStore((s) => s.isGenerating);
  const currentStep = useGenerationStore((s) => s.currentStep);
  const progress = useGenerationStore((s) => s.progress);
  const streamingContent = useGenerationStore((s) => s.streamingContent);
  const genError = useGenerationStore((s) => s.error);
  const startGeneration = useGenerationStore((s) => s.startGeneration);
  const updateProgress = useGenerationStore((s) => s.updateProgress);
  const appendStreamContent = useGenerationStore((s) => s.appendStreamContent);
  const resetStreamContent = useGenerationStore((s) => s.resetStreamContent);
  const setError = useGenerationStore((s) => s.setError);
  const finishGeneration = useGenerationStore((s) => s.finishGeneration);
  const resetGen = useGenerationStore((s) => s.reset);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [editMode, setEditMode] = useState(false);
  const [draftContent, setDraftContent] = useState("");
  const [regenFeedback, setRegenFeedback] = useState("");
  const [activeStreamSectionId, setActiveStreamSectionId] = useState<string | null>(
    null,
  );

  const project = projects.find((p) => p.id === projectId);

  const outline = project?.outline ?? [];

  const flat = useMemo(() => flattenOutline(outline), [outline]);

  const selected = selectedId ? findSection(outline, selectedId) : null;

  useEffect(() => {
    if (!selectedId && flat.length > 0) {
      setSelectedId(flat[0].id);
    }
  }, [flat, selectedId]);

  useEffect(() => {
    if (selected && !editMode) {
      setDraftContent(selected.content);
    }
  }, [selected, editMode]);

  const toggle = useCallback((sid: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(sid)) next.delete(sid);
      else next.add(sid);
      return next;
    });
  }, []);

  const runOneSection = async (sectionId: string, rag: SearchResult[]) => {
    if (!projectId) return;
    const p = useProjectStore.getState().projects.find((x) => x.id === projectId);
    if (!p) return;
    const sec = findSection(p.outline, sectionId);
    if (!sec) return;
    const flatOrder = flattenOutline(p.outline);
    const idx = flatOrder.findIndex((x) => x.id === sectionId);
    const previousSections = flatOrder
      .slice(0, idx)
      .map((x) => x.content)
      .filter(Boolean);

    const context = {
      section: generatedToOutline(sec),
      ragResults: rag,
      previousSections,
      documentType: p.documentType,
    };

    resetStreamContent();
    setActiveStreamSectionId(sectionId);
    const text = await generateSection(context, aiConfig, {
      onToken: (t) => appendStreamContent(t),
      onComplete: () => {},
    });
    updateSectionContent(projectId, sectionId, text);
    updateSection(projectId, sectionId, { status: "done" });
    setActiveStreamSectionId(null);
    resetStreamContent();
  };

  const handleGenerateAll = async () => {
    if (!projectId || !project) return;
    const list = flattenOutline(outline);
    if (list.length === 0) return;

    resetGen();
    const rag = buildRagFromReferenceFiles(project.files);

    startGeneration("准备生成…");
    try {
      for (let i = 0; i < list.length; i++) {
        const sec = list[i];
        updateSection(projectId, sec.id, { status: "generating" });
        updateProgress((i / list.length) * 100, `正在生成：${sec.title}`);
        try {
          await runOneSection(sec.id, rag);
        } catch (e) {
          updateSection(projectId, sec.id, { status: "error" });
          setError(e instanceof Error ? e.message : String(e));
          return;
        }
        updateProgress(((i + 1) / list.length) * 100);
      }
      finishGeneration();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleGenerateCurrent = async () => {
    if (!projectId || !project || !selected) return;
    resetGen();
    const rag = buildRagFromReferenceFiles(project.files);
    startGeneration(selected.title);
    updateSection(projectId, selected.id, { status: "generating" });
    try {
      await runOneSection(selected.id, rag);
      finishGeneration();
    } catch (e) {
      updateSection(projectId, selected.id, { status: "error" });
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleSaveEdit = () => {
    if (!projectId || !selected) return;
    updateSectionContent(projectId, selected.id, draftContent);
    setEditMode(false);
  };

  const handleRegenerate = async () => {
    if (!projectId || !project || !selected) return;
    resetGen();
    const rag = buildRagFromReferenceFiles(project.files);
    const latest = useProjectStore.getState().projects.find((x) => x.id === projectId);
    const flatOrder = flattenOutline(latest?.outline ?? []);
    const idx = flatOrder.findIndex((x) => x.id === selected.id);
    const previousSections = flatOrder
      .slice(0, idx)
      .map((x) => x.content)
      .filter(Boolean);

    startGeneration(`重写：${selected.title}`);
    updateSection(projectId, selected.id, { status: "generating" });
    resetStreamContent();
    setActiveStreamSectionId(selected.id);
    try {
      const text = await regenerateSection(
        {
          section: generatedToOutline(selected),
          ragResults: rag,
          previousSections,
          documentType: project.documentType,
          userGuidance: regenFeedback,
        },
        regenFeedback,
        aiConfig,
        {
          onToken: (t) => appendStreamContent(t),
        },
      );
      updateSectionContent(projectId, selected.id, text);
      updateSection(projectId, selected.id, { status: "done" });
      setRegenFeedback("");
      finishGeneration();
    } catch (e) {
      updateSection(projectId, selected.id, { status: "error" });
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setActiveStreamSectionId(null);
      resetStreamContent();
    }
  };

  if (!projectId) {
    return <div className="p-8 text-gray-600">无效项目</div>;
  }

  if (!project) {
    return <div className="p-8 text-gray-600">未找到项目</div>;
  }

  if (outline.length === 0) {
    return (
      <div className="p-8">
        <EmptyState
          icon={<Brain className="h-7 w-7" aria-hidden />}
          title="暂无目录大纲"
          description="请先在项目页的需求文档中解析需求，以生成章节结构。"
        />
      </div>
    );
  }

  const showStream =
    isGenerating &&
    activeStreamSectionId &&
    selectedId === activeStreamSectionId;

  const displayContent = showStream
    ? streamingContent || "…"
    : editMode
      ? draftContent
      : selected?.content ?? "";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-gray-200 bg-white px-8 py-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-gray-500">整体进度</p>
            <Progress value={progress} className="mt-2 max-w-xl" />
          </div>
          <Button
            type="button"
            loading={isGenerating}
            onClick={() => void handleGenerateAll()}
          >
            生成全部
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
          <Loader2
            className={cn(
              "h-4 w-4",
              isGenerating ? "animate-spin text-blue-600" : "hidden",
            )}
            aria-hidden
          />
          <span>{currentStep || "就绪"}</span>
          {genError ? (
            <span className="flex items-center gap-1 text-red-600">
              <AlertCircle className="h-4 w-4" aria-hidden />
              {genError}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="w-[60%] min-w-0 overflow-y-auto border-r border-gray-200 p-6">
          <h2 className="mb-4 text-sm font-semibold text-gray-800">内容大纲</h2>
          <OutlineTree
            sections={outline}
            depth={0}
            selectedId={selectedId}
            expanded={expanded}
            onToggle={toggle}
            onSelect={(sid) => {
              setSelectedId(sid);
              setEditMode(false);
            }}
          />
        </div>
        <div className="flex w-[40%] min-w-0 flex-col overflow-hidden p-6">
          <h2 className="mb-2 text-sm font-semibold text-gray-800">章节内容</h2>
          {selected ? (
            <>
              <p className="mb-3 text-base font-medium text-gray-900">{selected.title}</p>
              <div className="mb-3 flex flex-wrap gap-2">
                {!editMode ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setEditMode(true)}
                  >
                    编辑
                  </Button>
                ) : (
                  <>
                    <Button type="button" size="sm" onClick={handleSaveEdit}>
                      <Check className="h-4 w-4" aria-hidden />
                      保存
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditMode(false);
                        setDraftContent(selected.content);
                      }}
                    >
                      取消
                    </Button>
                  </>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  loading={isGenerating && selected.status === "generating"}
                  onClick={() => void handleGenerateCurrent()}
                  disabled={isGenerating}
                >
                  生成本节
                </Button>
              </div>

              {editMode ? (
                <Textarea
                  value={draftContent}
                  onChange={(e) => setDraftContent(e.target.value)}
                  className="min-h-[200px] flex-1 font-mono text-sm"
                />
              ) : showStream ? (
                <pre className="max-h-[calc(100vh-280px)] overflow-y-auto whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-900 p-4 font-mono text-sm text-gray-100">
                  {displayContent}
                </pre>
              ) : (
                <pre className="max-h-[calc(100vh-280px)] overflow-y-auto whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-50 p-4 font-mono text-sm text-gray-800">
                  {displayContent || "（尚未生成）"}
                </pre>
              )}

              <div className="mt-4 space-y-2 border-t border-gray-100 pt-4">
                <Textarea
                  label="重写反馈（可选）"
                  value={regenFeedback}
                  onChange={(e) => setRegenFeedback(e.target.value)}
                  placeholder="告诉 AI 需要强调、删减或补充的内容…"
                  className="min-h-[80px]"
                />
                <Button
                  type="button"
                  variant="secondary"
                  loading={isGenerating && selected.status === "generating"}
                  onClick={() => void handleRegenerate()}
                  disabled={isGenerating && selected.status !== "generating"}
                >
                  <RefreshCw className="h-4 w-4" aria-hidden />
                  Regenerate
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">在左侧选择章节</p>
          )}
        </div>
      </div>
    </div>
  );
}
