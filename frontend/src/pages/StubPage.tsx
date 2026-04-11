interface StubPageProps {
  title: string
  description?: string
}

export function StubPage({ title, description = "This section is coming soon." }: StubPageProps) {
  return (
    <div className="stub-page">
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  )
}
