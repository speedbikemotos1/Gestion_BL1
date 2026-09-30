import { BarChart3, Bike, ChevronRight, CircleHelp, FileText, Landmark, Settings2, WalletCards } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';

export function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const dashboardActive = location === '/';
  return (
    <div className="app-shell grain">
      <aside className="sidebar no-print">
        <div className="px-5 pb-7 pt-6">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-xl bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-primary-foreground))]"><Bike size={19} strokeWidth={2.4} /></div>
            <div>
              <p className="text-[.68rem] font-extrabold tracking-[.22em] text-[hsl(var(--sidebar-foreground)/.58)]">SPEED BIKE</p>
              <p className="text-sm font-extrabold">Gestion BLs</p>
            </div>
          </div>
          <div className="sidebar-brand-detail mt-5 border-l border-[hsl(var(--sidebar-primary)/.5)] pl-3 text-[.65rem] leading-5 text-[hsl(var(--sidebar-foreground)/.56)]">
            Pilotage fournisseur<br /><span className="font-mono-app text-[hsl(var(--sidebar-primary))]">K-TRADING GLOBAL</span>
          </div>
        </div>
        <nav className="sidebar-nav flex-1 px-3">
          <p className="sidebar-label mb-2 px-3 text-[.58rem] font-extrabold uppercase tracking-[.18em] text-[hsl(var(--sidebar-foreground)/.34)]">Pilotage</p>
          <Link href="/" className={`nav-item ${dashboardActive ? 'active' : ''}`} data-testid="link-dashboard"><BarChart3 size={16} /><span>Vue d'ensemble</span>{dashboardActive && <ChevronRight size={14} className="ml-auto" />}</Link>
          <Link href="/?view=payments" className="nav-item" data-testid="link-payments"><WalletCards size={16} /><span>Règlements</span></Link>
          <div className="mt-7">
            <p className="sidebar-label mb-2 px-3 text-[.58rem] font-extrabold uppercase tracking-[.18em] text-[hsl(var(--sidebar-foreground)/.34)]">Référentiel</p>
            <Link href="/" className="nav-item" data-testid="link-invoices"><FileText size={16} /><span>Bons de livraison</span></Link>
            <button className="nav-item w-full cursor-not-allowed opacity-50" type="button" disabled data-testid="button-settings"><Settings2 size={16} /><span>Paramètres</span></button>
          </div>
        </nav>
        <div className="sidebar-footer m-3 rounded-xl border border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-accent)/.6)] p-3">
          <div className="flex items-center gap-2 text-[.7rem] font-bold"><Landmark size={14} className="text-[hsl(var(--sidebar-primary))]" /> Trésorerie suivie</div>
          <p className="mt-1.5 text-[.62rem] leading-4 text-[hsl(var(--sidebar-foreground)/.55)]">Un point fiable sur chaque dinar engagé.</p>
          <button className="mt-3 inline-flex items-center gap-1 text-[.63rem] font-bold text-[hsl(var(--sidebar-primary))]" type="button" onClick={() => window.alert('Contactez votre administrateur pour l’assistance.')} data-testid="button-help">Aide <CircleHelp size={12} /></button>
        </div>
      </aside>
      <main className="main-canvas">{children}</main>
    </div>
  );
}