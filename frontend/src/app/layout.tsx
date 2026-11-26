import "./globals.css";
import { Geist } from "next/font/google";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={cn("font-sans", geist.variable)}>
      <body>
        <AuthProvider>
          {children}
          <Toaster position="top-right" richColors closeButton theme="light" />
        </AuthProvider>
      </body>
    </html>
  );
}
