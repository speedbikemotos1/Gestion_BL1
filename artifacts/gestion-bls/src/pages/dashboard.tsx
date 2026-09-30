import {
  Check,
  ChevronDown,
  CircleAlert,
  CreditCard,
  FileDown,
  FilePlus2,
  Landmark,
  MoreHorizontal,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  WalletCards,
  X,
} from 'lucide-react';
import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import {
  getGetDashboardQueryKey,
  getGetPaymentQueryKey,
  getListInvoicesQueryKey,
  getListPaymentsQueryKey,
  useCreatePayment,
  useDeletePayment,
  useGetDashboard,
  useGetPayment,
  useImportSql,
  useListInvoices,
  useListPayments,
  useUpdatePayment,
} from '@workspace/api-client-react';
import type { Payment, PaymentInput, PaymentStatus } from '@workspace/api-client-react';
import { EmptyState, MetricCard, SectionTitle, StatusPill, WarningList } from '@/components/ui-elements';
import { formatAmount, formatDate, formatDateInput, formatTodayLabel } from '@/lib/format';

const statusOptions: Array<{ value: PaymentStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'Tous les statuts' },
  { value: 'UNPAID', label: 'À régler' },
  { value: 'PARTLY_PAID', label: 'Partiels' },
  { value: 'PAID', label: 'Réglés' },
  { value: 'AFTER_SALES', label: 'Après-vente' },
  { value: 'UNSPECIFIED', label: 'Non définis' },
];

const paymentMethods = ['Virement', 'Chèque', 'Espèces', 'Autre'];

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<PaymentStatus | 'ALL'>('ALL');
  const [paymentModal, setPaymentModal] = useState<'create' | 'edit' | null>(null);
  const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null);
  const [focusedPaymentId, setFocusedPaymentId] = useState<number | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [sqlText, setSqlText] = useState('');
  const [importResult, setImportResult] = useState<{ message: string; warnings: string[] } | null>(null);
  const [paymentForm, setPaymentForm] = useState<PaymentInput>({
    paymentDate: new Date().toISOString().slice(0, 10),
    amount: 0,
    paymentMethod: 'Virement',
    reference: '',
    notes: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const invoiceParams = useMemo(() => ({
    search: search.trim() || undefined,
    status: status === 'ALL' ? undefined : status,
  }), [search, status]);
  const dashboardQuery = useGetDashboard();
  const invoiceQuery = useListInvoices(invoiceParams);
  const paymentQuery = useListPayments();
  const focusedPaymentQuery = useGetPayment(focusedPaymentId ?? 0, {
    query: { enabled: focusedPaymentId !== null, queryKey: getGetPaymentQueryKey(focusedPaymentId ?? 0) },
  });
  const createPayment = useCreatePayment();
  const updatePayment = useUpdatePayment();
  const deletePayment = useDeletePayment();
  const importSql = useImportSql();
  const dashboard = dashboardQuery.data;
  const invoices = invoiceQuery.data ?? [];
  const payments = paymentQuery.data ?? [];

  const refreshAll = () => {
    void queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
    void queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey(invoiceParams) });
    void queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
  };

  const openCreatePayment = () => {
    setPaymentForm({ paymentDate: new Date().toISOString().slice(0, 10), amount: 0, paymentMethod: 'Virement', reference: '', notes: '' });
    setEditingPaymentId(null);
    setPaymentModal('create');
  };

  const openEditPayment = (payment: Payment) => {
    setEditingPaymentId(payment.id);
    setPaymentForm({
      paymentDate: formatDateInput(payment.paymentDate),
      amount: payment.amount,
      paymentMethod: payment.paymentMethod ?? 'Virement',
      reference: payment.reference ?? '',
      notes: payment.notes ?? '',
    });
    setPaymentModal('edit');
  };

  const submitPayment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = { ...paymentForm, amount: Number(paymentForm.amount), paymentMethod: paymentForm.paymentMethod || null, reference: paymentForm.reference || null, notes: paymentForm.notes || null };
    if (!payload.amount || payload.amount <= 0 || !payload.paymentDate) return;
    const onSuccess = () => {
      setPaymentModal(null);
      refreshAll();
    };
    if (paymentModal === 'edit' && editingPaymentId !== null) {
      updatePayment.mutate({ id: editingPaymentId, data: payload }, { onSuccess });
    } else {
      createPayment.mutate({ data: payload }, { onSuccess });
    }
  };

  const removePayment = (payment: Payment) => {
    if (!window.confirm(`Supprimer le règlement du ${formatDate(payment.paymentDate)} ?`)) return;
    deletePayment.mutate({ id: payment.id }, { onSuccess: refreshAll });
  };

  const submitImport = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!sqlText.trim()) return;
    importSql.mutate({ data: { sqlText } }, {
      onSuccess: (result) => {
        setImportResult(result);
        setSqlText('');
        refreshAll();
      },
    });
  };

  const loadSqlFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSqlText(typeof reader.result === 'string' ? reader.result : '');
      setImportOpen(true);
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const isLoading = dashboardQuery.isLoading || invoiceQuery.isLoading || paymentQuery.isLoading;
  const mutationPending = createPayment.isPending || updatePayment.isPending || deletePayment.isPending;

  return (
    <div className="min-h-[100dvh]">
      <header className="topbar-actions flex items-center justify-between border-b border-border bg-[hsl(var(--card)/.78)] px-5 py-4 backdrop-blur md:px-8">
        <div>
          <p className="eyebrow">{formatTodayLabel()} · suivi fournisseur</p>
          <h1 className="mt-1 text-xl font-extrabold tracking-tight md:text-2xl">Vue d’ensemble</h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-quiet hidden sm:inline-flex" type="button" onClick={() => window.print()} data-testid="button-print-summary"><Printer size={14} /> Imprimer</button>
          <button className="btn btn-primary" type="button" onClick={openCreatePayment} data-testid="button-create-payment"><Plus size={15} /> <span className="hidden sm:inline">Nouveau règlement</span><span className="sm:hidden">Règlement</span></button>
        </div>
      </header>

      <div className="mx-auto max-w-[1480px] space-y-7 p-5 md:p-8">
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {isLoading ? [1, 2, 3, 4].map((item) => <div className="panel h-[116px] p-4" key={item}><div className="skeleton h-3 w-24" /><div className="skeleton mt-4 h-7 w-32" /><div className="skeleton mt-2 h-3 w-20" /></div>) : (
            <>
              <MetricCard label="Total TTC engagé" value={formatAmount(dashboard?.totalTtc)} detail={`${dashboard?.invoiceCount ?? 0} bons de livraison`} icon={<Landmark size={16} />} tone="dark" />
              <MetricCard label="Réglé à date" value={formatAmount(dashboard?.totalPaid)} detail={`${dashboard?.counts.paid ?? 0} BL entièrement réglés`} icon={<Check size={17} />} />
              <MetricCard label="Reste à régler" value={formatAmount(dashboard?.remaining)} detail={`${dashboard?.counts.unpaid ?? 0} BL en attente`} icon={<CreditCard size={16} />} tone="accent" />
              <MetricCard label="Crédit fournisseur" value={formatAmount(dashboard?.supplierCredit)} detail="Disponible sur les prochains BL" icon={<FileDown size={16} />} tone="warning" />
            </>
          )}
        </section>

        <WarningList warnings={dashboard?.validation.warnings ?? []} />

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(330px,.8fr)]">
          <div className="panel overflow-hidden">
            <div className="border-b border-border p-4 md:p-5">
              <SectionTitle eyebrow="Engagements" title="Bons de livraison" action={<span className="font-mono-app text-[.68rem] text-muted-foreground">{invoices.length} résultat{invoices.length > 1 ? 's' : ''}</span>} />
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative min-w-0 flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input className="field pl-9" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un numéro, client ou fournisseur" data-testid="input-search-invoices" /></div>
                <div className="relative sm:w-44"><select className="field appearance-none pr-8" value={status} onChange={(event) => setStatus(event.target.value as PaymentStatus | 'ALL')} data-testid="select-invoice-status">{statusOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select><ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" /></div>
              </div>
            </div>
            {invoiceQuery.isError ? <div className="p-8 text-center"><CircleAlert className="mx-auto text-destructive" size={24} /><p className="mt-3 text-sm font-bold">Les bons de livraison ne sont pas disponibles.</p><button className="btn btn-quiet mt-4" type="button" onClick={() => void invoiceQuery.refetch()} data-testid="button-retry-invoices"><RefreshCw size={14} /> Réessayer</button></div> : invoices.length === 0 && !invoiceQuery.isLoading ? <EmptyState title="Aucun bon de livraison" description={search ? 'Aucun résultat pour cette recherche. Essayez un autre numéro ou statut.' : 'Importez votre historique SQL pour commencer le suivi.'} action={!search ? <button className="btn btn-primary" type="button" onClick={() => setImportOpen(true)} data-testid="button-empty-import"><Upload size={14} /> Importer un fichier</button> : undefined} /> : (
              <div className="overflow-x-auto">
                <table className="data-table" data-testid="table-invoices">
                  <thead><tr><th>Bon / date</th><th>Client</th><th className="text-right">TTC</th><th>Réglé</th><th className="text-right">Solde</th><th>Statut</th><th /></tr></thead>
                  <tbody>{invoices.map((invoice) => <tr key={invoice.id} data-testid={`row-invoice-${invoice.id}`}>
                    <td><Link href={`/invoices/${invoice.id}`} className="group block" data-testid={`link-invoice-${invoice.id}`}><span className="font-mono-app text-[.73rem] font-medium text-[hsl(var(--primary))] group-hover:underline">{invoice.invoiceNumber}</span><span className="mt-1 block text-[.65rem] text-muted-foreground">{formatDate(invoice.invoiceDate)}</span></Link></td>
                    <td><p className="max-w-[150px] truncate font-semibold">{invoice.customer}</p><p className="mt-1 text-[.63rem] text-muted-foreground">{invoice.supplier}</p></td>
                    <td className="text-right font-mono-app">{formatAmount(invoice.totalTtc)}</td>
                    <td className="font-mono-app text-[.72rem]">{formatAmount(invoice.amountPaid)}</td>
                    <td className={`text-right font-mono-app font-medium ${invoice.amountRemaining > 0 ? 'amount-negative' : 'amount-positive'}`}>{formatAmount(invoice.amountRemaining)}</td>
                    <td><StatusPill status={invoice.paymentStatus} /></td>
                    <td><Link href={`/invoices/${invoice.id}`} className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" data-testid={`button-view-invoice-${invoice.id}`}><MoreHorizontal size={16} /></Link></td>
                  </tr>)}</tbody>
                </table>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-border bg-[hsl(var(--muted)/.35)] px-4 py-3 text-[.65rem] text-muted-foreground md:px-5"><span>{dashboard?.productLineCount ?? 0} lignes produit · {dashboard?.totalUnits ?? 0} unités</span><button className="inline-flex items-center gap-1 font-bold text-[hsl(var(--primary))]" type="button" onClick={() => setImportOpen(true)} data-testid="button-open-import"><Upload size={13} /> Importer des BLs</button></div>
          </div>

          <div className="panel overflow-hidden">
            <div className="border-b border-border p-4 md:p-5">
              <SectionTitle eyebrow="Mouvements de trésorerie" title="Derniers règlements" action={<button className="btn btn-quiet !min-h-8 !px-2.5" type="button" onClick={openCreatePayment} data-testid="button-add-payment"><Plus size={14} /> Ajouter</button>} />
              <p className="text-xs leading-5 text-muted-foreground">Les règlements sont affectés automatiquement aux BL les plus anciens.</p>
            </div>
            {paymentQuery.isError ? <div className="p-8 text-center"><CircleAlert className="mx-auto text-destructive" size={24} /><p className="mt-3 text-sm font-bold">Historique indisponible.</p><button className="btn btn-quiet mt-4" type="button" onClick={() => void paymentQuery.refetch()} data-testid="button-retry-payments">Réessayer</button></div> : payments.length === 0 && !paymentQuery.isLoading ? <EmptyState title="Aucun règlement" description="Ajoutez le premier règlement fournisseur pour voir les allocations." action={<button className="btn btn-primary" type="button" onClick={openCreatePayment} data-testid="button-empty-payment"><Plus size={14} /> Nouveau règlement</button>} /> : (
              <div className="divide-y divide-border">{payments.slice(0, 6).map((payment) => <div className="flex items-center gap-3 px-4 py-3.5 md:px-5" key={payment.id} data-testid={`row-payment-${payment.id}`}>
                <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><CreditCard size={15} /></div>
                <button className="min-w-0 flex-1 text-left" type="button" onClick={() => setFocusedPaymentId(payment.id)} data-testid={`button-payment-details-${payment.id}`}><p className="truncate text-xs font-bold">{payment.reference || payment.paymentMethod || 'Règlement fournisseur'}</p><p className="mt-1 text-[.63rem] text-muted-foreground">{formatDate(payment.paymentDate)} · {payment.allocations?.length ?? 0} allocation{(payment.allocations?.length ?? 0) > 1 ? 's' : ''}</p></button>
                <p className="font-mono-app text-xs font-medium">{formatAmount(payment.amount)}</p>
                <button className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted" type="button" onClick={() => openEditPayment(payment)} aria-label="Modifier le règlement" data-testid={`button-edit-payment-${payment.id}`}><Pencil size={13} /></button>
                <button className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-[hsl(var(--destructive)/.1)] hover:text-destructive" type="button" onClick={() => removePayment(payment)} aria-label="Supprimer le règlement" data-testid={`button-delete-payment-${payment.id}`}><Trash2 size={13} /></button>
              </div>)}</div>
            )}
            <div className="border-t border-border p-4 md:p-5"><button className="btn btn-quiet w-full" type="button" onClick={() => setFocusedPaymentId(payments[0]?.id ?? null)} disabled={!payments.length} data-testid="button-view-payment-history"><WalletCards size={14} /> Voir le détail des allocations</button></div>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-[1.3fr_1fr]">
          <div className="panel p-5 md:p-6">
            <SectionTitle eyebrow="Lecture rapide" title="Répartition des BLs" action={<span className="font-mono-app text-[.68rem] text-muted-foreground">{dashboard?.invoiceCount ?? 0} total</span>} />
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-[hsl(var(--muted))]">
              <div className="flex h-full"><div className="bg-[hsl(161_55%_42%)]" style={{ width: `${((dashboard?.counts.paid ?? 0) / Math.max(dashboard?.invoiceCount ?? 1, 1)) * 100}%` }} /><div className="bg-[hsl(33_77%_48%)]" style={{ width: `${((dashboard?.counts.partlyPaid ?? 0) / Math.max(dashboard?.invoiceCount ?? 1, 1)) * 100}%` }} /><div className="bg-[hsl(4_69%_53%)]" style={{ width: `${((dashboard?.counts.unpaid ?? 0) / Math.max(dashboard?.invoiceCount ?? 1, 1)) * 100}%` }} /><div className="bg-[hsl(274_45%_52%)]" style={{ width: `${((dashboard?.counts.afterSales ?? 0) / Math.max(dashboard?.invoiceCount ?? 1, 1)) * 100}%` }} /></div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">{[['Réglés', dashboard?.counts.paid ?? 0, 'bg-[hsl(161_55%_42%)]'], ['Partiels', dashboard?.counts.partlyPaid ?? 0, 'bg-[hsl(33_77%_48%)]'], ['À régler', dashboard?.counts.unpaid ?? 0, 'bg-[hsl(4_69%_53%)]'], ['Après-vente', dashboard?.counts.afterSales ?? 0, 'bg-[hsl(274_45%_52%)]']].map(([label, value, dot]) => <div key={String(label)} className="flex items-center gap-2 text-xs"><span className={`size-2 rounded-full ${dot}`} /><span className="text-muted-foreground">{label}</span><strong className="ml-auto">{value}</strong></div>)}</div>
          </div>
          <div className="panel flex items-center justify-between gap-5 p-5 md:p-6">
            <div><p className="eyebrow">Import source</p><h2 className="mt-1 text-sm font-extrabold">Synchroniser l’historique</h2><p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">Chargez un export SQL pour conserver les BLs et lignes sans ressaisie.</p></div>
            <div className="shrink-0"><input ref={fileInputRef} type="file" accept=".sql,.txt" className="hidden" onChange={loadSqlFile} data-testid="input-sql-file" /><button className="btn btn-primary" type="button" onClick={() => fileInputRef.current?.click()} data-testid="button-upload-sql"><FilePlus2 size={15} /> <span className="hidden sm:inline">Charger un SQL</span></button></div>
          </div>
        </section>
      </div>

      {paymentModal && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setPaymentModal(null); }}><div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="payment-modal-title">
        <div className="flex items-start justify-between border-b border-border p-5"><div><p className="eyebrow">Trésorerie</p><h2 id="payment-modal-title" className="mt-1 text-lg font-extrabold">{paymentModal === 'edit' ? 'Modifier le règlement' : 'Nouveau règlement'}</h2></div><button className="grid size-8 place-items-center rounded-md hover:bg-muted" type="button" onClick={() => setPaymentModal(null)} aria-label="Fermer" data-testid="button-close-payment-modal"><X size={17} /></button></div>
        <form onSubmit={submitPayment} className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-bold">Date du règlement<input className="field mt-1.5" type="date" value={formatDateInput(paymentForm.paymentDate)} onChange={(event) => setPaymentForm({ ...paymentForm, paymentDate: event.target.value })} required data-testid="input-payment-date" /></label><label className="text-xs font-bold">Montant TTC<input className="field mt-1.5 font-mono-app" type="number" min="0.01" step="0.01" value={paymentForm.amount || ''} onChange={(event) => setPaymentForm({ ...paymentForm, amount: Number(event.target.value) })} required data-testid="input-payment-amount" /></label></div>
          <label className="block text-xs font-bold">Mode de paiement<select className="field mt-1.5" value={paymentForm.paymentMethod ?? ''} onChange={(event) => setPaymentForm({ ...paymentForm, paymentMethod: event.target.value })} data-testid="select-payment-method">{paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}</select></label>
          <label className="block text-xs font-bold">Référence<input className="field mt-1.5" value={paymentForm.reference ?? ''} onChange={(event) => setPaymentForm({ ...paymentForm, reference: event.target.value })} placeholder="Ex. VIR-240624-01" data-testid="input-payment-reference" /></label>
          <label className="block text-xs font-bold">Note interne<textarea className="field mt-1.5 min-h-20 resize-y" value={paymentForm.notes ?? ''} onChange={(event) => setPaymentForm({ ...paymentForm, notes: event.target.value })} placeholder="Facultatif" data-testid="input-payment-notes" /></label>
          <div className="flex justify-end gap-2 border-t border-border pt-4"><button className="btn btn-quiet" type="button" onClick={() => setPaymentModal(null)} data-testid="button-cancel-payment">Annuler</button><button className="btn btn-primary" type="submit" disabled={mutationPending} data-testid="button-submit-payment">{mutationPending ? 'Enregistrement…' : paymentModal === 'edit' ? 'Enregistrer' : 'Créer le règlement'}</button></div>
        </form>
      </div></div>}

      {importOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setImportOpen(false); }}><div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="import-modal-title">
        <div className="flex items-start justify-between border-b border-border p-5"><div><p className="eyebrow">Données source</p><h2 id="import-modal-title" className="mt-1 text-lg font-extrabold">Importer un export SQL</h2></div><button className="grid size-8 place-items-center rounded-md hover:bg-muted" type="button" onClick={() => setImportOpen(false)} aria-label="Fermer" data-testid="button-close-import-modal"><X size={17} /></button></div>
        <form onSubmit={submitImport} className="space-y-4 p-5"><p className="text-xs leading-5 text-muted-foreground">Collez le contenu SQL ou chargez un fichier .sql. Les doublons sont ignorés automatiquement.</p><textarea className="field min-h-48 resize-y font-mono-app text-[.68rem]" value={sqlText} onChange={(event) => setSqlText(event.target.value)} placeholder="INSERT INTO invoices …" data-testid="input-sql-text" required />
          {importResult && <div className="rounded-lg border border-[hsl(161_55%_42%/.25)] bg-[hsl(161_55%_42%/.08)] p-3 text-xs"><p className="font-bold text-[hsl(161_55%_29%)]">{importResult.message}</p>{importResult.warnings.length > 0 && <ul className="mt-2 list-disc pl-4 text-muted-foreground">{importResult.warnings.map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}</ul>}</div>}
          {importSql.isError && <p className="text-xs font-bold text-destructive">L’import n’a pas abouti. Vérifiez le fichier puis réessayez.</p>}
          <div className="flex justify-end gap-2 border-t border-border pt-4"><button className="btn btn-quiet" type="button" onClick={() => setImportOpen(false)} data-testid="button-cancel-import">Fermer</button><button className="btn btn-primary" type="submit" disabled={importSql.isPending} data-testid="button-submit-import">{importSql.isPending ? 'Import en cours…' : 'Lancer l’import'}</button></div>
        </form>
      </div></div>}

      {focusedPaymentId !== null && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setFocusedPaymentId(null); }}><div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="payment-detail-title">
        <div className="flex items-start justify-between border-b border-border p-5"><div><p className="eyebrow">Détail du mouvement</p><h2 id="payment-detail-title" className="mt-1 text-lg font-extrabold">{focusedPaymentQuery.data?.reference || 'Règlement fournisseur'}</h2></div><button className="grid size-8 place-items-center rounded-md hover:bg-muted" type="button" onClick={() => setFocusedPaymentId(null)} aria-label="Fermer" data-testid="button-close-payment-detail"><X size={17} /></button></div>
        {focusedPaymentQuery.isLoading ? <div className="space-y-3 p-5"><div className="skeleton h-4 w-40" /><div className="skeleton h-4 w-64" /><div className="skeleton h-24 w-full" /></div> : focusedPaymentQuery.isError ? <div className="p-6 text-center text-sm text-destructive">Le détail de ce règlement est indisponible.</div> : focusedPaymentQuery.data && <div className="p-5"><div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/60 p-4"><div><p className="eyebrow">Montant</p><p className="mt-1 font-mono-app text-lg font-medium">{formatAmount(focusedPaymentQuery.data.amount)}</p></div><div><p className="eyebrow">Crédit restant</p><p className="mt-1 font-mono-app text-lg font-medium">{formatAmount(focusedPaymentQuery.data.creditRemaining)}</p></div><div><p className="eyebrow">Date</p><p className="mt-1 text-xs font-bold">{formatDate(focusedPaymentQuery.data.paymentDate)}</p></div><div><p className="eyebrow">Mode</p><p className="mt-1 text-xs font-bold">{focusedPaymentQuery.data.paymentMethod || '—'}</p></div></div><h3 className="mt-6 text-xs font-extrabold uppercase tracking-wider">Allocations ({focusedPaymentQuery.data.allocations?.length ?? 0})</h3><div className="mt-2 divide-y divide-border rounded-lg border border-border">{focusedPaymentQuery.data.allocations?.map((allocation) => <Link href={`/invoices/${allocation.invoiceId}`} className="flex items-center justify-between p-3 hover:bg-muted" key={allocation.id} data-testid={`link-payment-allocation-${allocation.id}`}><span><span className="block font-mono-app text-[.7rem] text-[hsl(var(--primary))]">{allocation.invoiceNumber}</span><span className="mt-1 block text-[.62rem] text-muted-foreground">{formatDate(allocation.paymentDate)}</span></span><span className="font-mono-app text-xs">{formatAmount(allocation.amountAllocated)}</span></Link>)}</div></div>}
      </div></div>}
    </div>
  );
}