import { ArrowDownRight, ArrowUpRight, CircleAlert, FileText } from 'lucide-react';
import type { ReactNode } from 'react';
import { formatAmount, statusClass, statusLabel } from '@/lib/format';

export function StatusPill({ status }: { status: string | null | undefined }) {
  return <span className={`status-pill ${statusClass(status)}`} data-testid={`status-payment-${status ?? 'unknown'}`}>{statusLabel(status)}</span>;
}

export function MetricCard({
  label,
  value,
  detail,
  tone = 'default',
  icon,
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: 'default' | 'accent' | 'warning' | 'dark';
  icon: ReactNode;
}) {
  return (
    <article className={`panel relative overflow-hidden p-4 ${tone === 'dark' ? 'bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))]' : ''}`} data-testid={`metric-${label.toLowerCase().replaceAll(' ', '-')}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`eyebrow ${tone === 'dark' ? 'text-[hsl(var(--sidebar-foreground)/.6)]' : ''}`}>{label}</p>
          <p className="mt-2 font-mono-app text-xl font-medium tracking-tight">{value}</p>
          {detail && <p className={`mt-1 text-[.68rem] ${tone === 'dark' ? 'text-[hsl(var(--sidebar-foreground)/.62)]' : 'text-muted-foreground'}`}>{detail}</p>}
        </div>
        <span className={`grid size-8 place-items-center rounded-lg ${tone === 'accent' ? 'bg-[hsl(var(--accent)/.13)] text-[hsl(var(--accent))]' : tone === 'warning' ? 'bg-[hsl(33_77%_48%/.13)] text-[hsl(33_77%_35%)]' : tone === 'dark' ? 'bg-[hsl(var(--sidebar-primary)/.18)] text-[hsl(var(--sidebar-primary))]' : 'bg-[hsl(var(--muted))] text-[hsl(var(--primary))]'}`}>{icon}</span>
      </div>
    </article>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center" data-testid="empty-state">
      <span className="mb-3 grid size-11 place-items-center rounded-full bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><FileText size={19} /></span>
      <h3 className="text-sm font-extrabold">{title}</h3>
      <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Delta({ value, positiveIsGood = true }: { value: number; positiveIsGood?: boolean }) {
  const positive = positiveIsGood ? value >= 0 : value < 0;
  return <span className={`inline-flex items-center gap-1 text-[.65rem] font-bold ${positive ? 'amount-positive' : 'amount-negative'}`}>{positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{Math.abs(value).toFixed(1)}%</span>;
}

export function WarningList({ warnings }: { warnings: string[] }) {
  if (!warnings.length) return null;
  return (
    <div className="flex items-start gap-2 rounded-lg border border-[hsl(33_77%_48%/.25)] bg-[hsl(33_77%_48%/.08)] px-3 py-2.5 text-xs text-[hsl(33_77%_30%)]" data-testid="validation-warnings">
      <CircleAlert size={15} className="mt-0.5 shrink-0" />
      <div><p className="font-bold">Points à vérifier</p><ul className="mt-1 list-disc pl-4">{warnings.slice(0, 3).map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}</ul></div>
    </div>
  );
}

export function SectionTitle({ eyebrow, title, action }: { eyebrow: string; title: string; action?: ReactNode }) {
  return <div className="mb-4 flex items-end justify-between gap-3"><div><p className="eyebrow">{eyebrow}</p><h2 className="mt-1 text-lg font-extrabold tracking-tight">{title}</h2></div>{action}</div>;
}