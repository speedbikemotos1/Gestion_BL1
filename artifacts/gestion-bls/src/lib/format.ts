export function formatAmount(value: number | null | undefined) {
  return `${new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(value ?? 0)} DT`;
}

export function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatTodayLabel() {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
}

export function formatDateInput(value: string | null | undefined) {
  if (!value) return '';
  return value.slice(0, 10);
}

export function statusLabel(status: string | null | undefined) {
  const labels: Record<string, string> = {
    PAID: 'Réglé',
    PARTLY_PAID: 'Partiel',
    UNPAID: 'À régler',
    AFTER_SALES: 'Après-vente',
    UNSPECIFIED: 'Non défini',
  };
  return labels[status ?? ''] ?? 'Non défini';
}

export function statusClass(status: string | null | undefined) {
  const classes: Record<string, string> = {
    PAID: 'status-paid',
    PARTLY_PAID: 'status-partly',
    UNPAID: 'status-unpaid',
    AFTER_SALES: 'status-after',
    UNSPECIFIED: 'status-neutral',
  };
  return classes[status ?? ''] ?? 'status-neutral';
}