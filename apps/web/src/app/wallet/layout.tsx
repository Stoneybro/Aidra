"use client"
import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function WalletLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const isPolicyPage = pathname === '/wallet/policy';

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/20">
            <div className="relative w-full max-w-md">
                {/* Mobile device frame */}
                <div className="relative bg-card rounded-3xl overflow-hidden shadow-2xl border border-border">
                    {/* Status bar */}
                    <div className="h-8 bg-muted/50 backdrop-blur-sm flex items-center justify-between px-4 border-b border-border">
                        <Link href="/wallet" className="text-xs font-medium hover:underline">
                            Aidra Wallet
                        </Link>
                        <div className="flex items-center space-x-2">
                            <span className="text-xs">9:41</span>
                        </div>
                    </div>

                    {/* Content area */}
                    <div className="min-h-[600px] max-h-[80vh] overflow-y-auto">
                        {children}
                    </div>

                    {/* Navigation indicator */}
                    <div className="h-1 bg-muted">
                        <div
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: isPolicyPage ? '100%' : '50%' }}
                        />
                    </div>
                </div>

                {/* Blurred backdrop */}
                <div className="absolute inset-0 -z-10 bg-background/80 backdrop-blur-lg" />
            </div>
        </div>
    );
}
