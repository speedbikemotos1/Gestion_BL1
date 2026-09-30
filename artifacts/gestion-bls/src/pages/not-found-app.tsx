import { Link } from 'wouter';

export default function NotFoundApp() {
  return <div className="grid min-h-[100dvh] place-items-center p-6"><div className="panel max-w-md p-8 text-center"><p className="eyebrow">Erreur 404</p><h1 className="mt-2 text-2xl font-extrabold">Cette page n’existe pas.</h1><p className="mt-2 text-sm text-muted-foreground">Retournez au tableau de bord pour reprendre le suivi.</p><Link href="/" className="btn btn-primary mt-6" data-testid="link-back-dashboard">Retour au tableau de bord</Link></div></div>;
}