import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  FileUp,
  Loader2,
  Trash2,
  Upload,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/input";
import { parseDocx } from "@/lib/knowledge/parser/docx-deep";
import { parsePdf } from "@/lib/knowledge/parser/pdf-parser";
import { textToDocumentTree } from "@/lib/knowledge/parser/text-to-tree";
import type { DocumentNode } from "@/lib/knowledge/parser/types";
import { KnowledgeRetriever } from "@/lib/knowledge/rag/retriever";
import { RequirementMatcher } from "@/lib/knowledge/matcher";
import { analyzeRequirements } from "@/lib/pipeline/analyzer";
import type { OutlineSection } from "@/lib/pipeline/analyzer";
import {
  useProjectStore,
  type GeneratedSection,
  type ProjectFile,
} from "@/lib/store/project";
import { useSettingsStore } from "@/lib/store/settings";
import { cn } from "@/lib/utils";

function outlineToGenerated(sections: OutlineSection[]): GeneratedSection[] {
  return sections.map((s) => ({
    id: crypto.randomUUID(),
    title: s.title,
    level: s.level,
    content: "",
    status: "pending" as const,
    children: outlineToGenerated(s.children),
  }));
}

function nodesToPlainText(nodes: DocumentNode[]): string {
  const lines: string[] = [];
  function walk(ns: DocumentNode[]) {
    for (const n of ns) {
      if (n.content) {
        const prefix =
          n.type === "heading" && n.level
            ? `${"#".repeat(Math.min(n.level, 6))} `
            : "";
        lines.push(prefix + n.content);
      }
      if (n.children?.length) walk(n.children);
    }
  }
  walk(nodes);
  return lines.join("\n").trim();
}

function readFileBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as ArrayBuffer);
    r.onerror = () => reject(r.error);
    r.readAsArrayBuffer(file);
  });
}

interface MatchRow {
  id: string;
  text: string;
  coverage: "full" | "partial" | "none";
  suggestion?: string;
}

async function runRagMatcher(
  requirements: { id: string; text: string }[],
  referenceFiles: ProjectFile[],
): Promise<MatchRow[]> {
  const retriever = new KnowledgeRetriever();
  for (const f of referenceFiles) {
    if (!f.parsed || !f.content?.trim()) continue;
    const tree = textToDocumentTree(f.content, f.name);
    await retriever.indexDocument(tree, f.name);
  }

  const matcher = new RequirementMatcher(retriever);
  const reqs = requirements.map((r) => ({ id: r.id, text: r.text }));
  const matrix = await matcher.matchAll(reqs);

  return matrix.results.map((m) => ({
    id: m.requirement.id,
    text: m.requirement.text,
    coverage: m.coverage,
    suggestion:
      m.coverage === "full"
        ? undefined
        : m.coverage === "partial"
          ? "参考文档仅部分覆盖该需求，可补充针对性案例或与需求对应的条款说明。"
          : m.gapDescription ??
            "未在参考文档中发现明显对应内容，建议上传更相关的参考资料或调整需求表述。",
  }));
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function coverageVariant(
  c: MatchRow["coverage"],
): "success" | "warning" | "error" {
  if (c === "full") return "success";
  if (c === "partial") return "warning";
  return "error";
}

function coverageLabel(c: MatchRow["coverage"]): string {
  if (c === "full") return "完全覆盖";
  if (c === "partial") return "部分覆盖";
  return "未覆盖";
}

export function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const refInputRef = useRef<HTMLInputElement>(null);
  const reqInputRef = useRef<HTMLInputElement>(null);

  const projects = useProjectStore((s) => s.projects);
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject);
  const addFile = useProjectStore((s) => s.addFile);
  const removeFile = useProjectStore((s) => s.removeFile);
  const updateProject = useProjectStore((s) => s.updateProject);
  const deleteProject = useProjectStore((s) => s.deleteProject);

  const aiConfig = useSettingsStore((s) => s.aiConfig);

  const [tab, setTab] = useState("reference");
  const [reqText, setReqText] = useState("");
  const [requirements, setRequirements] = useState<
    { id: string; text: string; category: string; priority: string }[]
  >([]);
  const [parseStatus, setParseStatus] = useState("");
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const project = projects.find((p) => p.id === id);

  useEffect(() => {
    if (id) setCurrentProject(id);
  }, [id, setCurrentProject]);

  const handleUpload = useCallback(
    async (files: FileList | null, type: ProjectFile["type"]) => {
      if (!id || !files?.length) return;
      setBusy(type === "reference" ? "ref" : "req");
      try {
        for (const file of Array.from(files)) {
          const lower = file.name.toLowerCase();
          const buf = await readFileBuffer(file);
          let content = "";
          let parsed = false;
          try {
            if (lower.endsWith(".docx")) {
              const tree = await parseDocx(buf);
              content = nodesToPlainText(tree.nodes);
              parsed = content.length > 0;
            } else if (lower.endsWith(".pdf")) {
              const res = await parsePdf(buf);
              content = res.text;
              parsed = content.length > 0;
            } else {
              continue;
            }
          } catch {
            parsed = false;
            content = "";
          }
          const pf: ProjectFile = {
            id: crypto.randomUUID(),
            name: file.name,
            type,
            size: file.size,
            uploadedAt: new Date().toISOString(),
            parsed,
            content: content || undefined,
          };
          addFile(id, pf);
        }
      } finally {
        setBusy(null);
      }
    },
    [addFile, id],
  );

  const handleParseRequirements = async () => {
    if (!id) return;
    const text = reqText.trim();
    if (!text) {
      setParseStatus("请先输入或上传需求内容。");
      return;
    }
    setBusy("parse");
    setParseStatus("");
    try {
      const result = await analyzeRequirements(
        text,
        project?.documentType ?? "标书响应文件",
        aiConfig,
        (s) => setParseStatus(s),
      );
      setRequirements(result.requirements);
      const outline = outlineToGenerated(result.outline);
      updateProject(id, {
        outline,
        status: "analyzing",
        name: project?.name ?? result.suggestedTitle,
      });
      setParseStatus("解析完成，已更新目录大纲。");
    } catch {
      setParseStatus("解析失败，请检查 AI 配置与网络。");
    } finally {
      setBusy(null);
    }
  };

  const handleMatchAnalysis = async () => {
    if (!id || !project) return;
    const refFiles = project.files.filter(
      (f) => f.type === "reference" && f.parsed && f.content?.trim(),
    );
    if (!requirements.length) {
      setParseStatus("请先在「需求文档」中解析需求。");
      return;
    }
    if (refFiles.length === 0) {
      setParseStatus("请先上传并解析参考文档。");
      return;
    }
    setBusy("match");
    setParseStatus("正在通过 RAG 引擎匹配需求…");
    try {
      const rows = await runRagMatcher(requirements, refFiles);
      setMatches(rows);
      updateProject(id, { status: "review" });
      setParseStatus("");
    } catch {
      setParseStatus("匹配分析失败，请重试。");
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = () => {
    if (!id || !project) return;
    if (!window.confirm(`确定删除项目「${project.name}」？`)) return;
    deleteProject(id);
    navigate("/");
  };

  if (!id) {
    return (
      <div className="p-8">
        <p className="text-gray-600">无效的项目链接。</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8">
        <p className="text-gray-600">未找到该项目。</p>
        <Button className="mt-4" type="button" onClick={() => navigate("/")}>
          返回首页
        </Button>
      </div>
    );
  }

  const referenceFiles = project.files.filter((f) => f.type === "reference");
  const requirementFiles = project.files.filter((f) => f.type === "requirement");

  const uploadZoneClass =
    "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/50 px-6 py-10 text-center transition-colors hover:border-blue-400 hover:bg-blue-50/30";

  return (
    <div className="flex min-h-full flex-col pb-24">
      <div className="border-b border-gray-200 bg-white px-8 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="info">{project.documentType}</Badge>
              <Badge variant="default">
                {project.status === "draft"
                  ? "草稿"
                  : project.status === "analyzing"
                    ? "分析中"
                    : project.status === "generating"
                      ? "生成中"
                      : project.status === "review"
                        ? "审阅"
                        : "完成"}
              </Badge>
            </div>
          </div>
          <Button variant="danger" type="button" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" aria-hidden />
            删除项目
          </Button>
        </div>
      </div>

      <div className="px-8 pt-4">
        <Tabs
          activeTab={tab}
          onChange={setTab}
          tabs={[
            { id: "reference", label: "参考文档" },
            { id: "requirement", label: "需求文档" },
            { id: "match", label: "匹配分析" },
          ]}
        />
      </div>

      <div className="flex-1 px-8 py-6">
        {tab === "reference" && (
          <div className="space-y-6">
            <input
              ref={refInputRef}
              type="file"
              accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              multiple
              onChange={(e) => {
                void handleUpload(e.target.files, "reference");
                e.target.value = "";
              }}
            />
            <div
              role="button"
              tabIndex={0}
              className={cn(uploadZoneClass, "w-full", busy === "ref" && "opacity-60")}
              onClick={() => {
                if (busy !== "ref") refInputRef.current?.click();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  if (busy !== "ref") refInputRef.current?.click();
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (busy !== "ref") void handleUpload(e.dataTransfer.files, "reference");
              }}
            >
              {busy === "ref" ? (
                <Loader2 className="h-10 w-10 animate-spin text-blue-600" aria-hidden />
              ) : (
                <Upload className="h-10 w-10 text-gray-400" aria-hidden />
              )}
              <p className="mt-3 text-sm font-medium text-gray-700">
                拖拽或点击上传 .docx / .pdf 文件
              </p>
              <p className="mt-1 text-xs text-gray-500">作为投标参考与技术素材</p>
              <Button
                className="mt-4"
                type="button"
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  refInputRef.current?.click();
                }}
              >
                <FileUp className="h-4 w-4" aria-hidden />
                选择文件
              </Button>
            </div>

            <ul className="space-y-2">
              {referenceFiles.length === 0 ? (
                <li className="text-sm text-gray-500">暂无参考文件</li>
              ) : (
                referenceFiles.map((f) => (
                  <li
                    key={f.id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3"
                  >
                    <div>
                      <div className="font-medium text-gray-900">{f.name}</div>
                      <div className="text-xs text-gray-500">
                        {formatBytes(f.size)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={f.parsed ? "success" : "warning"}>
                        {f.parsed ? "已解析" : "待解析"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={() => removeFile(project.id, f.id)}
                      >
                        移除
                      </Button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}

        {tab === "requirement" && (
          <div className="space-y-6">
            <input
              ref={reqInputRef}
              type="file"
              accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              multiple
              onChange={(e) => {
                void handleUpload(e.target.files, "requirement");
                e.target.value = "";
              }}
            />
            <div
              role="button"
              tabIndex={0}
              className={cn(uploadZoneClass, "w-full", busy === "req" && "opacity-60")}
              onClick={() => {
                if (busy !== "req") reqInputRef.current?.click();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  if (busy !== "req") reqInputRef.current?.click();
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (busy !== "req") void handleUpload(e.dataTransfer.files, "requirement");
              }}
            >
              {busy === "req" ? (
                <Loader2 className="h-10 w-10 animate-spin text-blue-600" aria-hidden />
              ) : (
                <Upload className="h-10 w-10 text-gray-400" aria-hidden />
              )}
              <p className="mt-3 text-sm font-medium text-gray-700">
                上传需求 / 招标文件（.docx / .pdf）
              </p>
            </div>

            <Textarea
              label="或手动输入需求摘要"
              value={reqText}
              onChange={(e) => setReqText(e.target.value)}
              placeholder="粘贴招标文件技术要求、评分项等…"
              className="min-h-[200px]"
            />

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                loading={busy === "parse"}
                onClick={() => void handleParseRequirements()}
              >
                <Zap className="h-4 w-4" aria-hidden />
                解析需求并生成大纲
              </Button>
              {parseStatus ? (
                <span className="text-sm text-gray-600">{parseStatus}</span>
              ) : null}
            </div>

            {requirementFiles.length > 0 ? (
              <ul className="space-y-2">
                {requirementFiles.map((f) => (
                  <li
                    key={f.id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-2 text-sm"
                  >
                    <span>{f.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => removeFile(project.id, f.id)}
                    >
                      移除
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}

            {requirements.length > 0 ? (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-800">
                  已提取需求条目（{requirements.length}）
                </h3>
                <ul className="max-h-48 space-y-2 overflow-y-auto text-sm text-gray-700">
                  {requirements.map((r) => (
                    <li key={r.id} className="rounded border border-gray-100 bg-gray-50 px-3 py-2">
                      {r.text}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}

        {tab === "match" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                loading={busy === "match"}
                onClick={() => void handleMatchAnalysis()}
              >
                <Zap className="h-4 w-4" aria-hidden />
                开始匹配分析
              </Button>
              <span className="text-sm text-gray-500">
                将需求与已解析的参考文档做关键词覆盖分析
              </span>
            </div>

            {matches.length === 0 ? (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>
                  运行分析后，将显示每条需求的覆盖情况（完全 / 部分 / 未覆盖）与改进建议。
                </span>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b border-gray-200 bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-gray-700">需求</th>
                      <th className="px-4 py-3 font-semibold text-gray-700">覆盖</th>
                      <th className="px-4 py-3 font-semibold text-gray-700">建议</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matches.map((m) => (
                      <tr key={m.id} className="border-b border-gray-100">
                        <td className="max-w-md px-4 py-3 text-gray-800">{m.text}</td>
                        <td className="px-4 py-3">
                          <Badge variant={coverageVariant(m.coverage)}>
                            {coverageLabel(m.coverage)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {m.suggestion ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-[260px] right-0 border-t border-gray-200 bg-white/95 px-8 py-4 backdrop-blur">
        <div className="flex justify-end">
          <Button type="button" onClick={() => navigate(`/project/${project.id}/generate`)}>
            开始生成
          </Button>
        </div>
      </div>
    </div>
  );
}
