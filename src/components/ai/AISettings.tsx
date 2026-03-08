/**
 * AI Settings Panel
 * Location: src/components/settings/AISettings.tsx
 *
 * Plugs into SettingsDialog as a new section (like WritingSettings, LanguageSwitcher).
 * Uses the existing UI component library (Radix + shadcn/ui) and follows the
 * same visual patterns: section > heading + description > controls.
 *
 * Integration into SettingsDialog.tsx:
 *   1. Import: import AISettings from '@/components/settings/AISettings';
 *   2. Add to settingsSections: { id: 'ai', icon: Brain, label: 'settings.ai' }
 *   3. Add case in renderContent(): case 'ai': return <AISettings />;
 *   4. Import Brain from lucide-react
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAI } from '@/lib/ai';
import type { AIProviderType } from '@/lib/ai';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Brain,
  Zap,
  Server,
  Key,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Trash2,
  Eye,
  EyeOff,
  Shield,
  Database,
  Gauge,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ============= Provider Card =============

interface ProviderCardProps {
  type: AIProviderType;
  label: string;
  enabled: boolean;
  apiKey: string;
  baseUrl: string;
  isActive: boolean;
  onToggle: (enabled: boolean) => void;
  onApiKeyChange: (key: string) => void;
  onBaseUrlChange: (url: string) => void;
  onSetActive: () => void;
  onTest: () => void;
  testStatus: 'idle' | 'testing' | 'success' | 'error';
}

function ProviderCard({
  type,
  label,
  enabled,
  apiKey,
  baseUrl,
  isActive,
  onToggle,
  onApiKeyChange,
  onBaseUrlChange,
  onSetActive,
  onTest,
  testStatus,
}: ProviderCardProps) {
  const [showKey, setShowKey] = useState(false);
  const isOllama = type === 'ollama';

  return (
    <div
      className={cn(
        'rounded-lg border p-4 space-y-3 transition-colors',
        isActive && enabled ? 'border-primary bg-primary/5' : '',
        !enabled ? 'opacity-60' : '',
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isOllama ? (
            <Server className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Zap className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm font-medium">{label}</span>
          {isActive && enabled && (
            <Badge variant="secondary" className="text-xs">
              Active
            </Badge>
          )}
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
        />
      </div>

      {enabled && (
        <>
          {/* API Key (skip for Ollama) */}
          {!isOllama && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Key className="h-3 w-3" />
                API Key
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => onApiKeyChange(e.target.value)}
                    placeholder="sk-..."
                    className="pr-8 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Base URL */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              {isOllama ? 'Server URL' : 'Base URL'}
            </Label>
            <Input
              value={baseUrl}
              onChange={(e) => onBaseUrlChange(e.target.value)}
              placeholder={isOllama ? 'http://localhost:11434' : 'https://api.openai.com/v1'}
              className="text-xs font-mono"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={onTest}
              disabled={testStatus === 'testing'}
              className="gap-1.5 text-xs"
            >
              {testStatus === 'testing' ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : testStatus === 'success' ? (
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              ) : testStatus === 'error' ? (
                <XCircle className="h-3 w-3 text-destructive" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              Test Connection
            </Button>

            {!isActive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onSetActive}
                className="text-xs"
              >
                Set as Active
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ============= Main Settings Component =============

export default function AISettings() {
  const { t } = useTranslation();
  const {
    settings,
    updateSettings,
    updateProviderConfig,
    healthCheck,
    clearCache,
  } = useAI();

  const [testStatuses, setTestStatuses] = useState<Record<AIProviderType, 'idle' | 'testing' | 'success' | 'error'>>({
    openai: 'idle',
    ollama: 'idle',
    gemini: 'idle',
    anthropic: 'idle',
    openrouter: 'idle',
  });

  const handleTestProvider = useCallback(async (type: AIProviderType) => {
    setTestStatuses(prev => ({ ...prev, [type]: 'testing' }));
    try {
      const ok = await healthCheck(type);
      setTestStatuses(prev => ({ ...prev, [type]: ok ? 'success' : 'error' }));
      if (ok) {
        toast.success(`${settings.providers[type].label} connected successfully`);
      } else {
        toast.error(`${settings.providers[type].label} connection failed`);
      }
    } catch {
      setTestStatuses(prev => ({ ...prev, [type]: 'error' }));
      toast.error('Connection test failed');
    }

    // Reset status after 5s
    setTimeout(() => {
      setTestStatuses(prev => ({ ...prev, [type]: 'idle' }));
    }, 5000);
  }, [healthCheck, settings.providers]);

  const providerOrder: AIProviderType[] = ['openai', 'ollama', 'gemini', 'anthropic', 'openrouter'];

  return (
    <div className="space-y-6">
      {/* Master Toggle */}
      <section className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-transparent border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="h-5 w-5 text-primary" />
            <div>
              <h3 className="text-sm font-medium">AI Features</h3>
              <p className="text-xs text-muted-foreground">
                Enable AI-powered suggestions, summaries, and writing assistance
              </p>
            </div>
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={(enabled) => updateSettings({ enabled })}
          />
        </div>
      </section>

      {settings.enabled && (
        <>
          {/* Active Model Selection */}
          <section className="space-y-4">
            <div>
              <h3 className="text-sm font-medium">Active Model</h3>
              <p className="text-sm text-muted-foreground">
                Choose the default provider and model for AI features
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Provider</Label>
                <Select
                  value={settings.activeProvider}
                  onValueChange={(value: AIProviderType) => {
                    const providerModels = settings.providers[value]?.models ?? [];
                    updateSettings({
                      activeProvider: value,
                      activeModel: providerModels[0]?.id ?? '',
                    });
                  }}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {providerOrder
                      .filter(p => settings.providers[p].enabled)
                      .map(p => (
                        <SelectItem key={p} value={p} className="text-xs">
                          {settings.providers[p].label}
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Model</Label>
                <Select
                  value={settings.activeModel}
                  onValueChange={(value) => updateSettings({ activeModel: value })}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(settings.providers[settings.activeProvider]?.models ?? []).map(m => (
                      <SelectItem key={m.id} value={m.id} className="text-xs">
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <Separator />

          {/* Provider Configuration */}
          <section className="space-y-4">
            <div>
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Providers
              </h3>
              <p className="text-sm text-muted-foreground">
                Configure API keys and endpoints. Keys are stored locally.
              </p>
            </div>

            <div className="space-y-3">
              {providerOrder.map(type => {
                const config = settings.providers[type];
                return (
                  <ProviderCard
                    key={type}
                    type={type}
                    label={config.label}
                    enabled={config.enabled}
                    apiKey={config.apiKey}
                    baseUrl={config.baseUrl}
                    isActive={settings.activeProvider === type}
                    testStatus={testStatuses[type]}
                    onToggle={(enabled) => updateProviderConfig(type, { enabled })}
                    onApiKeyChange={(apiKey) => updateProviderConfig(type, { apiKey })}
                    onBaseUrlChange={(baseUrl) => updateProviderConfig(type, { baseUrl })}
                    onSetActive={() => {
                      const models = config.models;
                      updateSettings({
                        activeProvider: type,
                        activeModel: models[0]?.id ?? '',
                      });
                    }}
                    onTest={() => handleTestProvider(type)}
                  />
                );
              })}
            </div>
          </section>

          <Separator />

          {/* Embeddings */}
          <section className="space-y-4">
            <div>
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Database className="h-4 w-4" />
                Embeddings
              </h3>
              <p className="text-sm text-muted-foreground">
                Vector embeddings power semantic search and note suggestions
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm">Auto-index notes</p>
                  <p className="text-xs text-muted-foreground">
                    Automatically generate embeddings when notes are saved
                  </p>
                </div>
                <Switch
                  checked={settings.embeddings.autoIndex}
                  onCheckedChange={(autoIndex) =>
                    updateSettings({
                      embeddings: { ...settings.embeddings, autoIndex },
                    })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Embedding Provider</Label>
                  <Select
                    value={settings.embeddings.provider}
                    onValueChange={(value: AIProviderType) =>
                      updateSettings({
                        embeddings: { ...settings.embeddings, provider: value },
                      })
                    }
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai" className="text-xs">OpenAI</SelectItem>
                      <SelectItem value="ollama" className="text-xs">Ollama (Local)</SelectItem>
                      <SelectItem value="gemini" className="text-xs">Gemini</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Batch Size</Label>
                  <div className="flex items-center gap-2">
                    <Slider
                      value={[settings.embeddings.batchSize]}
                      onValueChange={([value]) =>
                        updateSettings({
                          embeddings: { ...settings.embeddings, batchSize: value },
                        })
                      }
                      min={5}
                      max={50}
                      step={5}
                      className="flex-1"
                    />
                    <span className="text-xs font-mono w-8 text-right">
                      {settings.embeddings.batchSize}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <Separator />

          {/* Rate Limiting & Cache */}
          <section className="space-y-4">
            <div>
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Gauge className="h-4 w-4" />
                Performance
              </h3>
              <p className="text-sm text-muted-foreground">
                Rate limiting and response caching
              </p>
            </div>

            <div className="space-y-4">
              {/* Rate Limit */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Requests per minute</Label>
                  <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
                    {settings.rateLimit.requestsPerMinute}
                  </span>
                </div>
                <Slider
                  value={[settings.rateLimit.requestsPerMinute]}
                  onValueChange={([value]) =>
                    updateSettings({
                      rateLimit: { ...settings.rateLimit, requestsPerMinute: value },
                    })
                  }
                  min={5}
                  max={60}
                  step={5}
                />
              </div>

              {/* Cache Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm">Response Cache</p>
                  <p className="text-xs text-muted-foreground">
                    Cache identical requests to reduce API calls
                  </p>
                </div>
                <Switch
                  checked={settings.cache.enabled}
                  onCheckedChange={(enabled) =>
                    updateSettings({
                      cache: { ...settings.cache, enabled },
                    })
                  }
                />
              </div>

              {settings.cache.enabled && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Cache TTL (minutes)</Label>
                    <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
                      {settings.cache.ttlMinutes}m
                    </span>
                  </div>
                  <Slider
                    value={[settings.cache.ttlMinutes]}
                    onValueChange={([value]) =>
                      updateSettings({
                        cache: { ...settings.cache, ttlMinutes: value },
                      })
                    }
                    min={5}
                    max={240}
                    step={5}
                  />

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      clearCache();
                      toast.success('AI cache cleared');
                    }}
                    className="gap-1.5 text-xs"
                  >
                    <Trash2 className="h-3 w-3" />
                    Clear Cache
                  </Button>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
