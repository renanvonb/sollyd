import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "../globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";

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
    title: "Sollyd",
    description: "Plataforma de gestão financeira, jurídica e de documentos com foco em eficiência.",
    icons: {
        icon: [
            { url: '/icon.png', sizes: 'any' },
        ],
        apple: [
            { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
        ],
    },
};

export const viewport: Viewport = {
    themeColor: '#0d0d0d',
    width: 'device-width',
    initialScale: 1,
};

import { ThemeProvider } from "@/components/theme-provider";

// ... existing imports

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="pt-BR" suppressHydrationWarning>
            <body
                className={cn(
                    "min-h-screen bg-background font-sans antialiased text-foreground",
                    inter.variable,
                    jakarta.variable
                )}
            >
                <ThemeProvider
                    attribute="class"
                    defaultTheme="dark"
                    enableSystem={false}
                    disableTransitionOnChange
                >
                    {children}
                    <Toaster
                        position="bottom-center"
                        expand={false}
                    />
                </ThemeProvider>
            </body>
        </html>
    );
}


