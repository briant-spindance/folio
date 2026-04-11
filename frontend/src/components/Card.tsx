import type { ReactNode } from "react"

interface CardProps {
  children: ReactNode
}

export function Card({ children }: CardProps) {
  return <div className="card">{children}</div>
}

interface CardHeaderProps {
  title: ReactNode
  action?: ReactNode
}

export function CardHeader({ title, action }: CardHeaderProps) {
  return (
    <div className="card-header">
      <span className="card-title">{title}</span>
      {action}
    </div>
  )
}
