import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  FileText,
  History,
  Info,
  LoaderCircle,
  Printer,
  RotateCcw,
  X,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useParams } from 'wouter';
import {
  getGetDashboardQueryKey,
  getGetInvoiceQueryKey,
  getListInvoicesQueryKey,
  getListPaymentsQueryKey,
  useCancelInvoiceAfterSales,
  useGetInvoice,
  useSettleInvoiceAfterSales,
} from '@workspace/api-client-react';
import { EmptyState, SectionTitle, StatusPill } from '@/components/ui-elements';
import { formatAmount, formatDate } from '@/lib/format';

export default function InvoiceDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const invoiceId = Number(params.id);
  const [settleOpen, setSettleOpen] = useState(false);
  const [comment, setComment] = useState('');
  const invoiceQuery = useGetInvoice(invoiceId, { query: { enabled: Number.isFinite(invoiceId), queryKey: getGetInvoiceQueryKey(invoiceId) } });
  const settleInvoice = useSettleInvoiceAfterSales();
  const cancelAfterSales = useCancelInvoiceAfterSales();
  const invoice = invoiceQuery.data;

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: getGetInvoiceQueryKey(invoiceId) });
    void queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
    void queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
    void queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
  };

  const submitSettlement = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!comment.trim()) return;
    settleInvoice.mutate({ id: invoiceId, data: { comment: comment.trim() } }, {
      onSuccess: () => {
        setSettleOpen(false);
        setComment('');
        refresh();
      },
    });
  };

  const reverseSettlement = () => {
    if (!window.confirm('Annuler le règlement après-vente de ce BL ?')) return;
    cancelAfterSales.mutate({ id: invoiceId }, { onSuccess: refresh });
  };

  if (invoiceQuery.isLoading) {
    return <div className="min-h-[100dvh] p-5 md:p-8"><div className="mx-auto max-w-[1250px] space-y-5"><div className="skeleton h-4 w-32" /><div className="skeleton h-36 w-full" /><div className="skeleton h-72 w-full" /></div></div>;
  }

  if (invoiceQuery.isError || !invoice) {
    return <div className="grid min-h-[100dvh] place-items-center p-6"><div className="panel max-w-md p-8 text-center"><CircleAlert className="mx-auto text-destructive" size={28} /><h1 className="mt-4 text-lg font-extrabold">BL introuvable</h1><p className="mt-2 text-sm text-muted-foreground">Ce bon de livraison n’est pas disponible ou a été supprimé.</p><div className="mt-5 flex justify-center gap-2"><button className="btn btn-quiet" type="button" onClick={() => void invoiceQuery.refetch()} data-testid="button-retry-invoice"><RotateCcw size={14} /> Réessayer</button><Link href="/" className="btn btn-primary" data-testid="link-back-home">Retour</Link></div></div></div>;
  }

  return (
    <div className="min-h-[100dvh]">
      <header className="no-print flex items-center justify-between border-b border-border bg-[hsl(var(--card)/.78)] px-5 py-4 backdrop-blur md:px-8">
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground" data-testid="link-back-dashboard"><ArrowLeft size={15} /> Retour aux BLs</Link>
        <div className="flex items-center gap-2"><button className="btn btn-quiet" type="button" onClick={() => window.print()} data-testid="button-print-invoice"><Printer size={14} /> Imprimer le BL</button><button className="btn btn-primary" type="button" onClick={() => setSettleOpen(true)} disabled={invoice.settlementType === 'AFTER_SALES'} data-testid="button-settle-after-sales"><CheckCircle2 size={14} /> {invoice.settlementType === 'AFTER_SALES' ? 'Après-vente enregistré' : 'Régler par après-vente'}</button></div>
      </header>

      <div className="mx-auto max-w-[1250px] space-y-5 p-5 md:p-8">
        <section className="panel overflow-hidden">
          <div className="border-b border-border p-5 md:p-7">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
              <div><p className="eyebrow">Bon de livraison · {invoice.documentType}</p><div className="mt-2 flex flex-wrap items-center gap-3"><h1 className="font-mono-app text-2xl font-medium tracking-tight md:text-3xl">{invoice.invoiceNumber}</h1><StatusPill status={invoice.paymentStatus} /></div><p className="mt-2 text-xs text-muted-foreground">Émis le {formatDate(invoice.invoiceDate)} · fournisseur <span className="font-semibold text-foreground">{invoice.supplier}</span></p></div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-right"><div><p className="eyebrow">Total TTC</p><p className="mt-1 font-mono-app text-xl font-medium">{formatAmount(invoice.totalTtc)}</p></div><div><p className="eyebrow">Solde</p><p className={`mt-1 font-mono-app text-xl font-medium ${invoice.amountRemaining > 0 ? 'amount-negative' : 'amount-positive'}`}>{formatAmount(invoice.amountRemaining)}</p></div></div>
            </div>
          </div>
          <div className="grid gap-4 bg-[hsl(var(--muted)/.32)] p-5 md:grid-cols-4 md:p-7"><div><p className="eyebrow">Client</p><p className="mt-1 text-sm font-extrabold">{invoice.customer}</p></div><div><p className="eyebrow">Total HT</p><p className="mt-1 font-mono-app text-sm">{formatAmount(invoice.totalHt)}</p></div><div><p className="eyebrow">TVA</p><p className="mt-1 font-mono-app text-sm">{formatAmount(invoice.totalVat)}</p></div><div><p className="eyebrow">Timbre fiscal</p><p className="mt-1 font-mono-app text-sm">{formatAmount(invoice.fiscalStamp)}</p></div></div>
        </section>

        <section className="panel overflow-hidden">
          <div className="p-5 md:p-6"><SectionTitle eyebrow="Détail du document" title="Lignes produits" action={<span className="font-mono-app text-[.68rem] text-muted-foreground">{invoice.lines.length} ligne{invoice.lines.length > 1 ? 's' : ''} · {invoice.lines.reduce((sum, line) => sum + line.quantity, 0)} unités</span>} /></div>
          {invoice.lines.length === 0 ? <EmptyState title="Aucune ligne produit" description="Ce bon ne contient pas de ligne détaillée." /> : <div className="overflow-x-auto"><table className="data-table" data-testid="table-invoice-lines"><thead><tr><th>#</th><th>Référence</th><th>Désignation</th><th className="text-right">Qté</th><th className="text-right">PU HT</th><th className="text-right">Remise</th><th className="text-right">Total TTC</th></tr></thead><tbody>{invoice.lines.map((line) => <tr key={line.id} data-testid={`row-invoice-line-${line.id}`}><td className="font-mono-app text-muted-foreground">{String(line.lineNumber).padStart(2, '0')}</td><td className="font-mono-app text-[.7rem] text-[hsl(var(--primary))]">{line.productReference || '—'}</td><td><span className="font-semibold">{line.productDescription}</span>{line.notes && <span className="mt-1 block text-[.63rem] text-muted-foreground">{line.notes}</span>}</td><td className="text-right font-mono-app">{line.quantity}</td><td className="text-right font-mono-app">{line.unitHt === null ? '—' : formatAmount(line.unitHt)}</td><td className="text-right font-mono-app">{line.discountPercent ? `${line.discountPercent}%` : '—'}</td><td className="text-right font-mono-app font-medium">{formatAmount(line.lineTtc)}</td></tr>)}</tbody></table></div>}
          <div className="flex justify-end border-t border-border bg-[hsl(var(--muted)/.3)] px-5 py-4 md:px-6"><div className="grid min-w-[250px] gap-2 text-xs"><div className="flex justify-between"><span className="text-muted-foreground">Sous-total HT</span><span className="font-mono-app">{formatAmount(invoice.totalHt)}</span></div><div className="flex justify-between"><span className="text-muted-foreground">TVA</span><span className="font-mono-app">{formatAmount(invoice.totalVat)}</span></div><div className="flex justify-between border-t border-border pt-2 font-extrabold"><span>Total TTC</span><span className="font-mono-app">{formatAmount(invoice.totalTtc)}</span></div></div></div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
          <div className="panel overflow-hidden">
            <div className="p-5 md:p-6"><SectionTitle eyebrow="Traçabilité financière" title="Allocations de règlements" action={<History size={17} className="text-muted-foreground" />} /></div>
            {invoice.allocations.length === 0 ? <EmptyState title="Pas encore de règlement" description="Ce BL est en attente d’une allocation fournisseur." /> : <div className="divide-y divide-border">{invoice.allocations.map((allocation) => <div className="flex items-center justify-between gap-3 px-5 py-3.5 md:px-6" key={allocation.id} data-testid={`row-invoice-allocation-${allocation.id}`}><div><p className="font-mono-app text-xs font-medium text-[hsl(var(--primary))]">{allocation.paymentReference || 'Règlement sans référence'}</p><p className="mt-1 text-[.65rem] text-muted-foreground">{formatDate(allocation.paymentDate)} · {allocation.invoiceNumber}</p></div><p className="font-mono-app text-sm font-medium">{formatAmount(allocation.amountAllocated)}</p></div>)}</div>}
            <div className="flex items-center justify-between border-t border-border bg-[hsl(var(--muted)/.3)] px-5 py-4 md:px-6"><span className="text-xs font-bold text-muted-foreground">Total alloué</span><span className="font-mono-app text-sm font-medium">{formatAmount(invoice.amountPaid)}</span></div>
          </div>
          <div className={`panel overflow-hidden ${invoice.settlementType === 'AFTER_SALES' ? 'border-[hsl(274_45%_52%/.35)]' : ''}`}>
            <div className="p-5 md:p-6"><SectionTitle eyebrow="Service après-vente" title="Règlement de solde" action={<Info size={17} className="text-muted-foreground" />} />{invoice.settlementType === 'AFTER_SALES' ? <div className="rounded-lg bg-[hsl(274_45%_52%/.1)] p-4"><div className="flex items-start gap-2 text-[hsl(274_45%_44%)]"><CheckCircle2 size={16} className="mt-0.5 shrink-0" /><div><p className="text-xs font-extrabold">Solde réglé par après-vente</p><p className="mt-1 text-[.68rem] leading-5">{invoice.settlementComment || 'Aucun commentaire renseigné.'}</p><p className="mt-2 font-mono-app text-[.62rem] opacity-75">{formatDate(invoice.settledAt)}</p></div></div><button className="btn btn-danger mt-4 w-full" type="button" onClick={reverseSettlement} disabled={cancelAfterSales.isPending} data-testid="button-cancel-after-sales"><RotateCcw size={14} /> {cancelAfterSales.isPending ? 'Annulation…' : 'Annuler le règlement après-vente'}</button></div> : <div className="rounded-lg border border-dashed border-border p-4"><p className="text-xs font-bold">Aucun règlement après-vente</p><p className="mt-1 text-[.68rem] leading-5 text-muted-foreground">Utilisez cette option si le fournisseur a soldé la créance par un avoir ou une reprise.</p><button className="btn btn-primary mt-4 w-full" type="button" onClick={() => setSettleOpen(true)} data-testid="button-open-after-sales"><CheckCircle2 size={14} /> Enregistrer un règlement SAV</button></div>}</div>
          </div>
        </section>

        {invoice.notes && <section className="panel flex gap-3 p-5 md:p-6"><FileText className="mt-0.5 text-[hsl(var(--primary))]" size={17} /><div><p className="eyebrow">Note interne</p><p className="mt-1 text-sm leading-6">{invoice.notes}</p></div></section>}

        <div className="no-print flex items-center justify-between gap-3 pb-4 text-xs text-muted-foreground"><button className="inline-flex items-center gap-2 font-bold hover:text-foreground" type="button" onClick={() => setLocation('/')} data-testid="button-bottom-back"><ArrowLeft size={14} /> Tous les BLs</button><span className="inline-flex items-center gap-2"><Info size={13} /> Données fournisseur K-TRADING GLOBAL</span></div>
      </div>

      {settleOpen && <div className="modal-backdrop no-print" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setSettleOpen(false); }}><div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="settle-title"><div className="flex items-start justify-between border-b border-border p-5"><div><p className="eyebrow">BL {invoice.invoiceNumber}</p><h2 id="settle-title" className="mt-1 text-lg font-extrabold">Règlement après-vente</h2></div><button className="grid size-8 place-items-center rounded-md hover:bg-muted" type="button" onClick={() => setSettleOpen(false)} aria-label="Fermer" data-testid="button-close-after-sales"><X size={17} /></button></div><form className="space-y-4 p-5" onSubmit={submitSettlement}><div className="rounded-lg bg-[hsl(var(--secondary))] p-3 text-xs leading-5 text-[hsl(var(--secondary-foreground))]">Cette action solde le BL sans créer de mouvement bancaire. Vous pourrez l’annuler depuis cette fiche.</div><label className="block text-xs font-bold">Commentaire obligatoire<textarea className="field mt-1.5 min-h-24 resize-y" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Ex. Avoir fournisseur validé le 24/06" required data-testid="input-after-sales-comment" /></label>{settleInvoice.isError && <p className="text-xs font-bold text-destructive">Le règlement après-vente n’a pas pu être enregistré.</p>}<div className="flex justify-end gap-2 border-t border-border pt-4"><button className="btn btn-quiet" type="button" onClick={() => setSettleOpen(false)} data-testid="button-cancel-after-sales-modal">Annuler</button><button className="btn btn-primary" type="submit" disabled={settleInvoice.isPending}>{settleInvoice.isPending ? <><LoaderCircle size={14} className="animate-spin" /> Enregistrement…</> : 'Confirmer le règlement'}</button></div></form></div></div>}
    </div>
  );
}