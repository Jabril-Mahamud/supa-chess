// app/(auth-pages)/layout.tsx
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-7xl w-full flex flex-col gap-12 items-center justify-center min-h-[70vh]">{children}</div>
  );
}