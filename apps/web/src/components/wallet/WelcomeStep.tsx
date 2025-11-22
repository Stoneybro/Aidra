'use client';

import { Button } from "@/components/ui/button";

interface WelcomeStepProps {
    onNext: () => void;
}

export function WelcomeStep({ onNext }: WelcomeStepProps) {
    return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="mb-8">
                <h1 className="text-2xl font-bold mb-4">Welcome to Aidra</h1>
                <p className="text-muted-foreground mb-8">
                    Your secure gateway to cross-chain transactions with enhanced security policies.
                </p>
            </div>
            <Button
                onClick={onNext}
                className="w-full max-w-xs"
            >
                Get Started
            </Button>
        </div>
    );
}
