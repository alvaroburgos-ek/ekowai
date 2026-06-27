// Placeholder landing for external collaborators (client / designer). It lives
// OUTSIDE the (app) route group, so it does not trigger the org-membership
// redirect in (app)/layout.tsx. The full client/designer portals are later
// sub-projects; this only confirms access exists.
export default function PortalLandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="text-2xl font-semibold">EKOWAI</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Ihr Zugang ist eingerichtet. Sobald Inhalte für Sie freigegeben sind,
        erscheinen sie hier.
      </p>
    </main>
  );
}
