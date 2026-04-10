import { useState } from 'react'
import { Bold, Italic, Link as LinkIcon, Heading1, Heading2, List, Code } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MarkdownRenderer } from './renderer'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function MarkdownEditor({ value, onChange, className }: MarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write')

  const toolbarActions = [
    { icon: Bold, label: 'Bold', prefix: '**', suffix: '**' },
    { icon: Italic, label: 'Italic', prefix: '_', suffix: '_' },
    { icon: LinkIcon, label: 'Link', prefix: '[', suffix: '](url)' },
    { icon: Heading1, label: 'Heading 1', prefix: '# ', suffix: '' },
    { icon: Heading2, label: 'Heading 2', prefix: '## ', suffix: '' },
    { icon: List, label: 'List', prefix: '- ', suffix: '' },
    { icon: Code, label: 'Code', prefix: '`', suffix: '`' },
  ]

  const handleToolbar = (prefix: string, suffix: string) => {
    onChange(value + prefix + suffix)
  }

  return (
    <div className={cn('flex flex-col border border-border rounded-lg overflow-hidden', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border bg-surface px-2 py-1.5">
        <div className="flex items-center gap-0.5">
          {toolbarActions.map((action) => (
            <button
              key={action.label}
              onClick={() => handleToolbar(action.prefix, action.suffix)}
              className="rounded p-1.5 text-foreground-muted hover:bg-accent hover:text-foreground transition-colors"
              title={action.label}
            >
              <action.icon className="h-4 w-4" />
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('write')}
            className={cn(
              'rounded px-2 py-1 text-xs font-medium transition-colors',
              activeTab === 'write'
                ? 'bg-accent text-foreground'
                : 'text-foreground-muted hover:text-foreground'
            )}
          >
            Write
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={cn(
              'rounded px-2 py-1 text-xs font-medium transition-colors',
              activeTab === 'preview'
                ? 'bg-accent text-foreground'
                : 'text-foreground-muted hover:text-foreground'
            )}
          >
            Preview
          </button>
        </div>
      </div>

      {/* Editor / Preview */}
      {activeTab === 'write' ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[300px] w-full resize-y bg-surface-inset p-4 font-mono text-[13px] leading-[1.6] text-foreground placeholder:text-foreground-subtle outline-none"
          placeholder="Write your content in markdown..."
        />
      ) : (
        <div className="min-h-[300px] bg-background p-4 overflow-y-auto">
          {value ? (
            <MarkdownRenderer content={value} />
          ) : (
            <p className="text-sm text-foreground-subtle">Nothing to preview</p>
          )}
        </div>
      )}
    </div>
  )
}
