import { describe, it, expect, beforeEach } from 'vitest';
import { useProjectStore } from '@/lib/store/project';
import { useSettingsStore } from '@/lib/store/settings';
import { useGenerationStore } from '@/lib/store/generation';

describe('ProjectStore', () => {
  beforeEach(() => {
    useProjectStore.setState({
      projects: [],
      currentProject: null,
    });
  });

  it('should create a project', () => {
    const store = useProjectStore.getState();
    const project = store.createProject('Test Project', '标书响应文件');
    expect(project.id).toBeTruthy();
    expect(project.name).toBe('Test Project');
    expect(project.documentType).toBe('标书响应文件');
    expect(project.status).toBe('draft');
    expect(useProjectStore.getState().projects.length).toBe(1);
  });

  it('should set current project', () => {
    const store = useProjectStore.getState();
    const project = store.createProject('Test', '解决方案');
    useProjectStore.getState().setCurrentProject(project.id);
    expect(useProjectStore.getState().currentProject?.id).toBe(project.id);
  });

  it('should update a project', () => {
    const store = useProjectStore.getState();
    const project = store.createProject('Test', '解决方案');
    useProjectStore.getState().updateProject(project.id, { name: 'Updated' });
    expect(useProjectStore.getState().projects[0].name).toBe('Updated');
  });

  it('should delete a project', () => {
    const store = useProjectStore.getState();
    const project = store.createProject('Test', '解决方案');
    useProjectStore.getState().deleteProject(project.id);
    expect(useProjectStore.getState().projects.length).toBe(0);
  });

  it('should add and remove files', () => {
    const store = useProjectStore.getState();
    const project = store.createProject('Test', '解决方案');
    useProjectStore.getState().addFile(project.id, {
      id: 'file1',
      name: 'test.docx',
      type: 'reference',
      size: 1024,
      uploadedAt: new Date().toISOString(),
      parsed: false,
    });
    expect(useProjectStore.getState().projects[0].files.length).toBe(1);
    useProjectStore.getState().removeFile(project.id, 'file1');
    expect(useProjectStore.getState().projects[0].files.length).toBe(0);
  });
});

describe('SettingsStore', () => {
  it('should have default AI config', () => {
    const state = useSettingsStore.getState();
    expect(state.aiConfig.provider).toBe('deepseek');
    expect(state.aiConfig.model).toBe('deepseek-chat');
  });

  it('should update AI config', () => {
    useSettingsStore.getState().setAiConfig({ provider: 'openai', model: 'gpt-4o' });
    const state = useSettingsStore.getState();
    expect(state.aiConfig.provider).toBe('openai');
    expect(state.aiConfig.model).toBe('gpt-4o');
  });

  it('should update company info', () => {
    useSettingsStore.getState().setCompanyInfo({ name: 'Test Corp' });
    expect(useSettingsStore.getState().companyInfo.name).toBe('Test Corp');
  });
});

describe('GenerationStore', () => {
  beforeEach(() => {
    useGenerationStore.getState().reset();
  });

  it('should start and finish generation', () => {
    const store = useGenerationStore.getState();
    store.startGeneration('Generating...');
    expect(useGenerationStore.getState().isGenerating).toBe(true);
    expect(useGenerationStore.getState().currentStep).toBe('Generating...');
    
    useGenerationStore.getState().finishGeneration();
    expect(useGenerationStore.getState().isGenerating).toBe(false);
  });

  it('should update progress', () => {
    useGenerationStore.getState().startGeneration('Test');
    useGenerationStore.getState().updateProgress(50, 'Halfway');
    expect(useGenerationStore.getState().progress).toBe(50);
    expect(useGenerationStore.getState().currentStep).toBe('Halfway');
  });

  it('should append streaming content', () => {
    useGenerationStore.getState().appendStreamContent('Hello');
    useGenerationStore.getState().appendStreamContent(' World');
    expect(useGenerationStore.getState().streamingContent).toBe('Hello World');
  });

  it('should handle errors', () => {
    useGenerationStore.getState().setError('Something failed');
    expect(useGenerationStore.getState().error).toBe('Something failed');
  });

  it('should reset', () => {
    useGenerationStore.getState().startGeneration('Test');
    useGenerationStore.getState().appendStreamContent('Content');
    useGenerationStore.getState().reset();
    expect(useGenerationStore.getState().isGenerating).toBe(false);
    expect(useGenerationStore.getState().streamingContent).toBe('');
    expect(useGenerationStore.getState().progress).toBe(0);
  });
});
