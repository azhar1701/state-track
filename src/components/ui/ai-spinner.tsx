import React from "react";
import { cn } from "@/lib/utils";
import { Loader2, Sparkles as SparklesIcon } from "lucide-react";

interface AISpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
    size?: number;
    text?: string;
}

export function AISpinner({ size = 24, text, className, ...props }: AISpinnerProps) {
    return (
        <div className={cn("flex flex-col items-center justify-center space-y-2", className)} {...props}>
            <div className="relative flex items-center justify-center">
                {/* Glowing aura */}
                <div
                    className="absolute inset-0 rounded-full blur-md opacity-50 animate-pulse bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
                    style={{ width: size * 1.5, height: size * 1.5, marginLeft: -(size * 0.25), marginTop: -(size * 0.25) }}
                />
                {/* Core spinner */}
                <Loader2
                    className="animate-spin text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] relative z-10"
                    size={size}
                />
                {/* Inner sparkle */}
                <SparklesIcon
                    className="absolute animate-ping text-purple-300 opacity-75 z-20"
                    size={size * 0.4}
                />
            </div>
            {text && (
                <span className="text-sm font-medium bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent animate-pulse">
                    {text}
                </span>
            )}
        </div>
    );
}
