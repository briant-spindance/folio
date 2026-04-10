import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'

interface MarkdownRendererProps {
  content: string
  className?: string
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div
      className={cn(
        'prose max-w-none',
        'text-[15px] leading-[1.7] text-foreground',
        '[&_h1]:text-[28px] [&_h1]:font-bold [&_h1]:leading-[1.3] [&_h1]:text-foreground [&_h1]:mt-8 [&_h1]:mb-4',
        '[&_h2]:text-[22px] [&_h2]:font-semibold [&_h2]:leading-[1.35] [&_h2]:text-foreground [&_h2]:mt-6 [&_h2]:mb-3',
        '[&_h3]:text-[18px] [&_h3]:font-semibold [&_h3]:leading-[1.4] [&_h3]:text-foreground [&_h3]:mt-5 [&_h3]:mb-2',
        '[&_h4]:text-[15px] [&_h4]:font-semibold [&_h4]:leading-[1.5] [&_h4]:text-foreground [&_h4]:mt-4 [&_h4]:mb-2',
        '[&_p]:my-3',
        '[&_ul]:my-3 [&_ul]:pl-6 [&_ul]:list-disc',
        '[&_ol]:my-3 [&_ol]:pl-6 [&_ol]:list-decimal',
        '[&_li]:my-1',
        '[&_code]:font-mono [&_code]:text-[13px] [&_code]:bg-surface-inset [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded',
        '[&_pre]:bg-surface-inset [&_pre]:rounded-lg [&_pre]:p-4 [&_pre]:my-4 [&_pre]:overflow-x-auto',
        '[&_pre_code]:bg-transparent [&_pre_code]:p-0',
        '[&_blockquote]:border-l-[3px] [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-foreground-muted',
        '[&_table]:my-4 [&_table]:w-full [&_table]:border-collapse',
        '[&_th]:border [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-sm [&_th]:font-medium [&_th]:text-foreground-muted [&_th]:bg-surface',
        '[&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_td]:text-sm',
        '[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2',
        '[&_hr]:my-6 [&_hr]:border-border',
        '[&_strong]:text-foreground [&_strong]:font-semibold',
        '[&_input[type=checkbox]]:mr-2',
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}
