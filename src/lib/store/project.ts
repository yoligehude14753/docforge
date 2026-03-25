import { create } from 'zustand';

export interface ProjectFile {
  id: string;
  name: string;
  type: 'reference' | 'requirement';
  size: number;
  uploadedAt: string;
  parsed: boolean;
  content?: string;
}

export interface GeneratedSection {
  id: string;
  title: string;
  level: number;
  content: string;
  status: 'pending' | 'generating' | 'done' | 'error';
  children: GeneratedSection[];
}

export interface Project {
  id: string;
  name: string;
  documentType: string;
  createdAt: string;
  updatedAt: string;
  files: ProjectFile[];
  outline: GeneratedSection[];
  status: 'draft' | 'analyzing' | 'generating' | 'review' | 'complete';
}

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;

  createProject: (name: string, documentType: string) => Project;
  setCurrentProject: (id: string) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  addFile: (projectId: string, file: ProjectFile) => void;
  removeFile: (projectId: string, fileId: string) => void;
  updateSection: (projectId: string, sectionId: string, updates: Partial<GeneratedSection>) => void;
  updateSectionContent: (projectId: string, sectionId: string, content: string) => void;
}

function mapSections(
  sections: GeneratedSection[],
  sectionId: string,
  updater: (s: GeneratedSection) => GeneratedSection,
): GeneratedSection[] {
  return sections.map((sec) => {
    if (sec.id === sectionId) return updater(sec);
    return { ...sec, children: mapSections(sec.children, sectionId, updater) };
  });
}

function touchProject(projects: Project[], id: string, mutator: (p: Project) => Project): Project[] {
  const now = new Date().toISOString();
  return projects.map((p) => (p.id === id ? mutator({ ...p, updatedAt: now }) : p));
}

function syncCurrent(
  current: Project | null,
  projects: Project[],
  touchedId: string,
): Project | null {
  if (!current || current.id !== touchedId) return current;
  return projects.find((p) => p.id === touchedId) ?? null;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: null,

  createProject: (name, documentType) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const project: Project = {
      id,
      name,
      documentType,
      createdAt: now,
      updatedAt: now,
      files: [],
      outline: [],
      status: 'draft',
    };
    set((s) => ({
      projects: [...s.projects, project],
      currentProject: project,
    }));
    return project;
  },

  setCurrentProject: (id) => {
    const p = get().projects.find((x) => x.id === id) ?? null;
    set({ currentProject: p });
  },

  updateProject: (id, updates) => {
    set((s) => {
      const projects = touchProject(s.projects, id, (p) => ({ ...p, ...updates }));
      return {
        projects,
        currentProject: syncCurrent(s.currentProject, projects, id),
      };
    });
  },

  deleteProject: (id) => {
    set((s) => {
      const projects = s.projects.filter((p) => p.id !== id);
      const current =
        s.currentProject?.id === id ? null : s.currentProject
          ? projects.find((p) => p.id === s.currentProject!.id) ?? null
          : null;
      return { projects, currentProject: current };
    });
  },

  addFile: (projectId, file) => {
    set((s) => {
      const projects = touchProject(s.projects, projectId, (p) => ({
        ...p,
        files: [...p.files, file],
      }));
      return {
        projects,
        currentProject: syncCurrent(s.currentProject, projects, projectId),
      };
    });
  },

  removeFile: (projectId, fileId) => {
    set((s) => {
      const projects = touchProject(s.projects, projectId, (p) => ({
        ...p,
        files: p.files.filter((f) => f.id !== fileId),
      }));
      return {
        projects,
        currentProject: syncCurrent(s.currentProject, projects, projectId),
      };
    });
  },

  updateSection: (projectId, sectionId, updates) => {
    set((s) => {
      const projects = touchProject(s.projects, projectId, (p) => ({
        ...p,
        outline: mapSections(p.outline, sectionId, (sec) => ({ ...sec, ...updates })),
      }));
      return {
        projects,
        currentProject: syncCurrent(s.currentProject, projects, projectId),
      };
    });
  },

  updateSectionContent: (projectId, sectionId, content) => {
    set((s) => {
      const projects = touchProject(s.projects, projectId, (p) => ({
        ...p,
        outline: mapSections(p.outline, sectionId, (sec) => ({ ...sec, content })),
      }));
      return {
        projects,
        currentProject: syncCurrent(s.currentProject, projects, projectId),
      };
    });
  },
}));
