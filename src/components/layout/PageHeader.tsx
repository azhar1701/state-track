import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actionButton?: ReactNode;
}

export default function PageHeader({ title, subtitle, actionButton }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
      <div>
        <h1 className="text-3xl font-bold text-white">{title}</h1>
        {subtitle && <p className="text-slate-400 mt-2">{subtitle}</p>}
      </div>
      {actionButton && <div className="flex-shrink-0">{actionButton}</div>}
    </div>
  );
}
