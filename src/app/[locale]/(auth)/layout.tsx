export default function AuthLayout({ children }: { children: React.ReactNode }) {
  // Full-bleed: each auth page owns its own layout (the login page is a
  // split-screen that must reach the viewport edges; verify/profile-setup
  // center their own card).
  return <main className="min-h-[100dvh]">{children}</main>;
}
