import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FolderOpen, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { useProjectStore, type Project, type GeneratedSection } from "@/lib/store/project";
import { templateRegistry } from "@/lib/template/registry";
import type { TemplateSection } from "@/lib/template/registry";

const DOC_TYPES = [
  { value: "标书响应文件", label: "标书响应文件" },
  { value: "解决方案", label: "解决方案" },
  { value: "项目说明书", label: "项目说明书" },
  { value: "商业Proposal", label: "商业Proposal" },
  { value: "服务方案", label: "服务方案" },
  { value: "自定义", label: "自定义" },
];

const STATUS_LABEL: Record<Project["status"], string> = {
  draft: "草稿",
  analyzing: "分析中",
  generating: "生成中",
  review: "审阅",
  complete: "完成",
};

function statusVariant(
  s: Project["status"],
): "default" | "success" | "warning" | "info" {
  switch (s) {
    case "complete":
      return "success";
    case "generating":
    case "analyzing":
      return "info";
    case "review":
      return "warning";
    default:
      return "default";
  }
}

export function HomePage() {
  const navigate = useNavigate();
  const projects = useProjectStore((s) => s.projects);
  const createProject = useProjectStore((s) => s.createProject);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [docType, setDocType] = useState(DOC_TYPES[0].value);

  const handleCreate = () => {
    const n = name.trim() || "未命名项目";
    const p = createProject(n, docType);

    const template = templateRegistry.getByDocType(docType);
    if (template) {
      function toGenerated(sections: TemplateSection[]): GeneratedSection[] {
        return sections.map((s) => ({
          id: crypto.randomUUID(),
          title: s.title,
          level: s.level,
          content: "",
          status: "pending" as const,
          children: toGenerated(s.children),
        }));
      }
      useProjectStore.getState().updateProject(p.id, {
        outline: toGenerated(template.sections),
      });
    }

    setDialogOpen(false);
    setName("");
    setDocType(DOC_TYPES[0].value);
    navigate(`/project/${p.id}`);
  };

  return (
    <div className="p-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">项目工作台</h1>
        <Button type="button" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" aria-hidden />
          Create New
        </Button>
      </header>

      {projects.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="h-7 w-7" aria-hidden />}
          title="还没有项目"
          description="创建一个新项目，上传参考与需求文档，开始生成标书内容。"
          action={
            <Button type="button" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden />
              新建项目
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {projects.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => navigate(`/project/${p.id}`)}
              className="text-left"
            >
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="p-5">
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {p.name}
                    </h2>
                    <Badge variant="info">{p.documentType}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                    <span>
                      {new Date(p.updatedAt).toLocaleDateString("zh-CN")}
                    </span>
                    <span>·</span>
                    <span>{p.files.length} 个文件</span>
                    <Badge variant={statusVariant(p.status)} className="ml-auto">
                      {STATUS_LABEL[p.status]}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="新建项目"
        footer={
          <>
            <Button variant="secondary" type="button" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button type="button" onClick={handleCreate}>
              创建
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="项目名称"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：某某项目投标书"
          />
          <Select
            label="文档类型"
            value={docType}
            onChange={setDocType}
            options={DOC_TYPES}
          />
        </div>
      </Dialog>
    </div>
  );
}
