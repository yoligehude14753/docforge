import { useState } from "react";
import { Bot, Globe, Search, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { chatCompletion } from "@/lib/ai/provider";
import { DEFAULT_CONFIGS } from "@/lib/ai/provider";
import type { AIConfig } from "@/lib/ai/provider";
import type { SearchConfig } from "@/lib/knowledge/research/web-search";
import { useSettingsStore } from "@/lib/store/settings";

const AI_PROVIDERS: { value: AIConfig["provider"]; label: string }[] = [
  { value: "openai", label: "OpenAI" },
  { value: "deepseek", label: "DeepSeek" },
  { value: "claude", label: "Claude" },
  { value: "ollama", label: "Ollama" },
];

const SEARCH_PROVIDERS: { value: SearchConfig["provider"]; label: string }[] = [
  { value: "tavily", label: "Tavily" },
  { value: "bing", label: "Bing" },
];

export function SettingsPage() {
  const aiConfig = useSettingsStore((s) => s.aiConfig);
  const setAiConfig = useSettingsStore((s) => s.setAiConfig);
  const searchConfig = useSettingsStore((s) => s.searchConfig);
  const setSearchConfig = useSettingsStore((s) => s.setSearchConfig);
  const companyInfo = useSettingsStore((s) => s.companyInfo);
  const setCompanyInfo = useSettingsStore((s) => s.setCompanyInfo);

  const [testLoading, setTestLoading] = useState(false);
  const [testMsg, setTestMsg] = useState<string | null>(null);

  const defaultBase =
    DEFAULT_CONFIGS[aiConfig.provider]?.baseUrl ?? "";

  const searchEnabled = searchConfig !== null;

  const handleSearchToggle = (on: boolean) => {
    if (on) {
      setSearchConfig({
        provider: "tavily",
        apiKey: searchConfig?.apiKey ?? "",
      });
    } else {
      setSearchConfig(null);
    }
  };

  const handleTestConnection = async () => {
    setTestLoading(true);
    setTestMsg(null);
    try {
      const reply = await chatCompletion(aiConfig, [
        { role: "user", content: "Reply with OK only." },
      ]);
      setTestMsg(
        reply.trim() ? `连接成功：${reply.slice(0, 120)}` : "连接成功（空响应）",
      );
    } catch (e) {
      setTestMsg(e instanceof Error ? e.message : "连接失败");
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="mb-8 text-2xl font-bold text-gray-900">设置</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="h-5 w-5 text-blue-600" aria-hidden />
            AI 模型配置
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select
            label="服务商"
            value={aiConfig.provider}
            onChange={(v) =>
              setAiConfig({
                provider: v as AIConfig["provider"],
                baseUrl: DEFAULT_CONFIGS[v]?.baseUrl,
                model: DEFAULT_CONFIGS[v]?.model as string,
              })
            }
            options={AI_PROVIDERS}
          />
          <Input
            label="API Key"
            type="password"
            autoComplete="off"
            value={aiConfig.apiKey ?? ""}
            onChange={(e) => setAiConfig({ apiKey: e.target.value })}
            placeholder="sk-…"
          />
          <Input
            label="Base URL"
            value={aiConfig.baseUrl ?? defaultBase}
            onChange={(e) => setAiConfig({ baseUrl: e.target.value })}
            placeholder={defaultBase}
          />
          <Input
            label="模型名称"
            value={aiConfig.model}
            onChange={(e) => setAiConfig({ model: e.target.value })}
          />
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Temperature（{aiConfig.temperature ?? 0.7}）
            </label>
            <input
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={aiConfig.temperature ?? 0.7}
              onChange={(e) =>
                setAiConfig({ temperature: Number.parseFloat(e.target.value) })
              }
              className="w-full accent-blue-600"
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            loading={testLoading}
            onClick={() => void handleTestConnection()}
          >
            <Zap className="h-4 w-4" aria-hidden />
            测试连接
          </Button>
          {testMsg ? (
            <p className="text-sm text-gray-600">{testMsg}</p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-5 w-5 text-emerald-600" aria-hidden />
            联网搜索
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={searchEnabled}
              onChange={(e) => handleSearchToggle(e.target.checked)}
              className="rounded border-gray-300"
            />
            启用网络搜索
          </label>
          {searchEnabled && searchConfig ? (
            <>
              <Select
                label="搜索服务商"
                value={searchConfig.provider}
                onChange={(v) =>
                  setSearchConfig({
                    ...searchConfig,
                    provider: v as SearchConfig["provider"],
                  })
                }
                options={SEARCH_PROVIDERS}
              />
              <Input
                label="API Key"
                type="password"
                autoComplete="off"
                value={searchConfig.apiKey}
                onChange={(e) =>
                  setSearchConfig({ ...searchConfig, apiKey: e.target.value })
                }
              />
            </>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-5 w-5 text-violet-600" aria-hidden />
            公司信息
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="公司名称"
            value={companyInfo.name}
            onChange={(e) => setCompanyInfo({ name: e.target.value })}
          />
          <Textarea
            label="公司简介"
            value={companyInfo.description}
            onChange={(e) => setCompanyInfo({ description: e.target.value })}
            placeholder="用于文档抬头、封面等（可选）"
          />
        </CardContent>
      </Card>
    </div>
  );
}
