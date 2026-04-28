export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen px-6 lg:px-12 py-12 lg:py-16 max-w-7xl mx-auto">
      {children}
    </main>
  );
}
