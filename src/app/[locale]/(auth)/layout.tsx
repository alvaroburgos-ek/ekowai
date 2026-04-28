export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen grid place-items-center bg-slate-50 p-4">
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}
