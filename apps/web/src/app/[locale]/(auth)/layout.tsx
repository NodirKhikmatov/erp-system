export default function AuthGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="from-background to-muted/40 flex min-h-dvh flex-1 items-center justify-center bg-gradient-to-b p-4">
      {children}
    </div>
  );
}
