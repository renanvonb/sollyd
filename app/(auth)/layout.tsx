import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "../globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
    display: 'swap',
});

const jakarta = Plus_Jakarta_Sans({
    subsets: ["latin"],
    variable: "--font-jakarta",
    display: 'swap',
});

export const metadata: Metadata = {
    title: "Sollyd - Login",
    description: "Entre na sua conta Sollyd",
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
};

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="pt-BR" className="light">
            <body
                className={cn(
                    "min-h-screen bg-background font-sans antialiased text-foreground",
                    inter.variable,
                    jakarta.variable
                )}
            >
                {children}
            </body>
        </html>
    );
}
