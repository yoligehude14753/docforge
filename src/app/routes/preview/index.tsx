import { useEffect, useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { buildDocument, type DocSection } from "@/lib/document/builder";
import { useProjectStore, type GeneratedSection } from "@/lib/store/project";
import { useSettingsStore } from "@/lib/store/settings";
import { saveAs } from "file-saver";

function toDocSections(sections: GeneratedSection[]): DocSection[] {
  return sections.map((s) => ({
    title: s.title,
    level: Math.min(4, Math.max(1, Math.round(s.level))) as DocSection["level"],
    content: s.content || "",
    children: s.children.length ? toDocSections(s.children) : undefined,
  }));
}

function SectionHeading({
  level,
  children,
}: {
  level: number;
  children: ReactNode;
}) {
  const L = Math.min(4, Math.max(1, Math.round(level)));
  const cls =
    "mb-3 font-bold text-gray-900 " +
    (L === 1
      ? "text-2xl"
      : L === 2
        ? "text-xl"
        : L === 3
          ? "text-lg"
          : "text-base");
  if (L === 1) return <h1 className={cls}>{children}</h1>;
  if (L === 2) return <h2 className={cls}>{children}</h2>;
  if (L === 3) return <h3 className={cls}>{children}</h3>;
  return <h4 className={cls}>{children}</h4>;
}

function renderSectionsHtml(sections: GeneratedSection[]): ReactNode {
  return sections.map((s) => {
    const blocks = (s.content || "")
      .split(/\n\n+/)
      .map((p, i) => (
        <p key={i} className="mb-3 text-[15px] leading-relaxed text-gray-800">
          {p}
        </p>
      ));
    return (
      <section key={s.id} className="mb-8">
        <SectionHeading level={s.level}>{s.title}</SectionHeading>
        {blocks}
        {s.children.length > 0 ? (
          <div className="mt-4">{renderSectionsHtml(s.children)}</div>
        ) : null}
      </section>
    );
  });
}

export function PreviewPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const projects = useProjectStore((s) => s.projects);
  const project = projects.find((p) => p.id === projectId);
  const companyInfo = useSettingsStore((s) => s.companyInfo);

  const [docTitle, setDocTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [includeToc, setIncludeToc] = useState(true);
  const [includeCover, setIncludeCover] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  useEffect(() => {
    if (project) setDocTitle(project.name);
  }, [project?.id, project?.name]);

  useEffect(() => {
    setCompanyName(companyInfo.name);
  }, [companyInfo.name, project?.id]);

  const outline = project?.outline ?? [];

  const handleExport = async () => {
    if (!project) return;
    setExporting(true);
    setExportMsg(null);
    try {
      const sections = toDocSections(outline);
      const blob = await buildDocument({
        title: docTitle.trim() || project.name,
        author: author.trim() || undefined,
        company: companyName.trim() || undefined,
        date: new Date().toLocaleDateString("zh-CN"),
        sections,
        includeToc,
        includeCover,
        headerText: docTitle.trim() || project.name,
      });
      const name = `${(docTitle.trim() || project.name).replace(/[/\\?%*:|"<>]/g, "-")}.docx`;
      saveAs(blob, name);
      setExportMsg("已生成 Word 文档并开始下载。");
    } catch (e) {
      setExportMsg(e instanceof Error ? e.message : "导出失败");
    } finally {
      setExporting(false);
    }
  };

  if (!projectId) {
    return <div className="p-8 text-gray-600">无效项目</div>;
  }

  if (!project) {
    return <div className="p-8 text-gray-600">未找到项目</div>;
  }

  return (
    <div className="flex min-h-full">
      <div className="flex-1 overflow-y-auto bg-gray-100 px-6 py-10">
        <div
          className="mx-auto max-w-[800px] bg-white px-12 py-14 shadow-lg"
          style={{ minHeight: "70vh" }}
        >
          <h1 className="mb-8 border-b border-gray-200 pb-4 text-2xl font-bold text-gray-900">
            {docTitle || project.name}
          </h1>
          {outline.length === 0 ? (
            <p className="text-gray-500">暂无章节内容，请先在生成页完成写作。</p>
          ) : (
            <article>{renderSectionsHtml(outline)}</article>
          )}
        </div>
      </div>

      <aside className="w-80 shrink-0 border-l border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">导出选项</h2>
        <div className="space-y-4">
          <Input
            label="文档标题"
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
          />
          <Input label="作者" value={author} onChange={(e) => setAuthor(e.target.value)} />
          <Input
            label="公司名称"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={includeToc}
              onChange={(e) => setIncludeToc(e.target.checked)}
              className="rounded border-gray-300"
            />
            包含目录 (TOC)
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={includeCover}
              onChange={(e) => setIncludeCover(e.target.checked)}
              className="rounded border-gray-300"
            />
            包含封面
          </label>
        </div>

        <Button
          className="mt-6 w-full"
          type="button"
          loading={exporting}
          onClick={() => void handleExport()}
        >
          <Download className="h-4 w-4" aria-hidden />
          导出 Word 文档
        </Button>

        {exporting ? (
          <div className="mt-4">
            <Progress value={66} />
            <p className="mt-2 text-xs text-gray-500">正在构建文档…</p>
          </div>
        ) : null}

        {exportMsg ? (
          <p
            className={`mt-4 text-sm ${exportMsg.includes("失败") ? "text-red-600" : "text-green-700"}`}
          >
            {exportMsg}
          </p>
        ) : null}
      </aside>
    </div>
  );
}
