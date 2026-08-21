import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">C# Learning Platform</h1>

        <Link
          href="/content-manager"
          className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 text-white"
        >
          Mở trang quản trị
        </Link>
      </div>
    </main>
  );
}