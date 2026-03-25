import { NavLink, Route, Routes, useLocation } from "react-router-dom";
import {
  Eye,
  FileText,
  Hammer,
  LayoutDashboard,
  Play,
  Settings,
  Upload,
} from "lucide-react";

import { HomePage } from "@/app/routes/home";
import { SettingsPage } from "@/app/routes/settings";
import { ProjectPage } from "@/app/routes/project";
import { GeneratePage } from "@/app/routes/generate";
import { PreviewPage } from "@/app/routes/preview";
import { useProjectStore } from "@/lib/store/project";
import { cn } from "@/lib/utils";

function navClassName({ isActive }: { isActive: boolean }) {
  return cn(
    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
    isActive
      ? "bg-white text-blue-600 shadow-sm"
      : "text-gray-600 hover:bg-white/50 hover:text-gray-900",
  );
}

function ProjectSidebarNav() {
  const location = useLocation();
  const currentProject = useProjectStore((s) => s.currentProject);

  const onProject =
    currentProject &&
    location.pathname.startsWith(`/project/${currentProject.id}`);

  if (!onProject || !currentProject) {
    return null;
  }

  const base = `/project/${currentProject.id}`;

  return (
    <div className="mt-6 border-t border-gray-200 pt-4">
      <div className="mb-2 flex items-center gap-2 px-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
        <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="truncate text-gray-700 normal-case">
          {currentProject.name}
        </span>
      </div>
      <nav className="flex flex-col gap-0.5">
        <NavLink to={base} end className={navClassName}>
          <Upload className="h-4 w-4 shrink-0" aria-hidden />
          上传文件
        </NavLink>
        <NavLink to={`${base}/generate`} className={navClassName}>
          <Play className="h-4 w-4 shrink-0" aria-hidden />
          生成
        </NavLink>
        <NavLink to={`${base}/preview`} className={navClassName}>
          <Eye className="h-4 w-4 shrink-0" aria-hidden />
          预览
        </NavLink>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <div className="flex h-screen min-h-0 bg-white text-gray-900">
      <aside className="flex w-[260px] shrink-0 flex-col border-r border-gray-200 bg-gray-50">
        <div className="border-b border-gray-200 px-4 py-5">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Hammer className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <div className="text-base font-bold tracking-tight">BidForge</div>
              <div className="text-xs text-gray-500">智能标书生成</div>
            </div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4">
          <NavLink to="/" end className={navClassName}>
            <LayoutDashboard className="h-4 w-4 shrink-0" aria-hidden />
            Home
          </NavLink>
          <NavLink to="/settings" className={navClassName}>
            <Settings className="h-4 w-4 shrink-0" aria-hidden />
            Settings
          </NavLink>
          <ProjectSidebarNav />
        </nav>

        <div className="border-t border-gray-200 px-4 py-3 text-xs text-gray-400">
          v0.1.0
        </div>
      </aside>

      <main className="min-h-0 min-w-0 flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/project/:id" element={<ProjectPage />} />
          <Route path="/project/:id/generate" element={<GeneratePage />} />
          <Route path="/project/:id/preview" element={<PreviewPage />} />
        </Routes>
      </main>
    </div>
  );
}
