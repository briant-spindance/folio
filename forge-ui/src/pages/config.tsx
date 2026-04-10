import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { mockConfig } from '@/lib/mock-data'
import { GripVertical, Plus, X } from 'lucide-react'

type Tab = 'structured' | 'raw'

export default function ConfigPage() {
  const [activeTab, setActiveTab] = useState<Tab>('structured')

  const [states, setStates] = useState([...mockConfig.workflow.states])
  const [newState, setNewState] = useState('')
  const [templateSource, setTemplateSource] = useState(mockConfig.template.source)
  const [reviewTypes, setReviewTypes] = useState([...mockConfig.reviews.types])
  const [newReviewType, setNewReviewType] = useState('')

  const [rawConfig, setRawConfig] = useState(() =>
    JSON.stringify(mockConfig, null, 2)
  )

  const addState = () => {
    const trimmed = newState.trim()
    if (trimmed && !states.includes(trimmed as typeof states[number])) {
      setStates([...states, trimmed as typeof states[number]])
      setNewState('')
    }
  }

  const removeState = (index: number) => {
    setStates(states.filter((_, i) => i !== index))
  }

  const addReviewType = () => {
    const trimmed = newReviewType.trim()
    if (trimmed && !reviewTypes.includes(trimmed)) {
      setReviewTypes([...reviewTypes, trimmed])
      setNewReviewType('')
    }
  }

  const removeReviewType = (index: number) => {
    setReviewTypes(reviewTypes.filter((_, i) => i !== index))
  }

  const handleSave = () => {
    // Demo: no-op save
  }

  return (
    <>
      <Header />
      <div className="p-6 max-w-[1200px] mx-auto">
        {/* Tabs */}
        <div className="mb-6 flex items-center gap-1 border-b border-border">
          <button
            onClick={() => setActiveTab('structured')}
            className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === 'structured'
                ? 'border-primary text-foreground'
                : 'border-transparent text-foreground-muted hover:text-foreground'
            }`}
          >
            Structured
          </button>
          <button
            onClick={() => setActiveTab('raw')}
            className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === 'raw'
                ? 'border-primary text-foreground'
                : 'border-transparent text-foreground-muted hover:text-foreground'
            }`}
          >
            Raw
          </button>
        </div>

        {activeTab === 'structured' ? (
          <div className="flex flex-col gap-8">
            {/* Workflow States */}
            <section>
              <h3 className="text-sm font-medium text-foreground-muted uppercase tracking-wider mb-3">
                Workflow States
              </h3>
              <div className="rounded-lg border border-border bg-surface-raised">
                <ul className="divide-y divide-border">
                  {states.map((state, index) => (
                    <li
                      key={`${state}-${index}`}
                      className="flex items-center gap-3 px-4 py-2.5"
                    >
                      <GripVertical className="h-4 w-4 text-foreground-subtle shrink-0 cursor-grab" />
                      <span className="text-sm text-foreground flex-1 capitalize">
                        {state}
                      </span>
                      <button
                        onClick={() => removeState(index)}
                        className="rounded-md p-1.5 text-foreground-muted hover:bg-accent hover:text-foreground transition-colors"
                        title="Remove state"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center gap-2 border-t border-border px-4 py-2.5">
                  <input
                    type="text"
                    value={newState}
                    onChange={(e) => setNewState(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addState()}
                    placeholder="Add state..."
                    className="rounded-md border border-border bg-surface-inset px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary transition-colors w-full"
                  />
                  <button
                    onClick={addState}
                    className="rounded-md p-1.5 text-foreground-muted hover:bg-accent hover:text-foreground transition-colors"
                    title="Add state"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </section>

            {/* Template Source */}
            <section>
              <h3 className="text-sm font-medium text-foreground-muted uppercase tracking-wider mb-3">
                Template Source
              </h3>
              <input
                type="text"
                value={templateSource}
                onChange={(e) => setTemplateSource(e.target.value)}
                className="rounded-md border border-border bg-surface-inset px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary transition-colors w-full"
              />
            </section>

            {/* Review Types */}
            <section>
              <h3 className="text-sm font-medium text-foreground-muted uppercase tracking-wider mb-3">
                Review Types
              </h3>
              <div className="rounded-lg border border-border bg-surface-raised">
                <ul className="divide-y divide-border">
                  {reviewTypes.map((type, index) => (
                    <li
                      key={`${type}-${index}`}
                      className="flex items-center justify-between px-4 py-2.5"
                    >
                      <span className="text-sm text-foreground capitalize">
                        {type}
                      </span>
                      <button
                        onClick={() => removeReviewType(index)}
                        className="rounded-md p-1.5 text-foreground-muted hover:bg-accent hover:text-foreground transition-colors"
                        title="Remove review type"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center gap-2 border-t border-border px-4 py-2.5">
                  <input
                    type="text"
                    value={newReviewType}
                    onChange={(e) => setNewReviewType(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addReviewType()}
                    placeholder="Add review type..."
                    className="rounded-md border border-border bg-surface-inset px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary transition-colors w-full"
                  />
                  <button
                    onClick={addReviewType}
                    className="rounded-md p-1.5 text-foreground-muted hover:bg-accent hover:text-foreground transition-colors"
                    title="Add review type"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </section>
          </div>
        ) : (
          /* Raw tab */
          <div>
            <textarea
              value={rawConfig}
              onChange={(e) => setRawConfig(e.target.value)}
              className="min-h-[400px] w-full resize-y rounded-lg border border-border bg-surface-inset p-4 font-mono text-[13px] leading-[1.6] text-foreground outline-none focus:border-primary transition-colors"
              spellCheck={false}
            />
          </div>
        )}

        {/* Save */}
        <div className="flex items-center justify-end pt-6">
          <button
            onClick={handleSave}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover transition-colors"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </>
  )
}
