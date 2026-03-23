import React from "react";
import { cn } from "@/lib/utils";
import { Sparkles as SparkleIcon } from "lucide-react";

interface SparklesProps extends React.HTMLAttributes<HTMLSpanElement> {
    children: React.ReactNode;
    iconSize?: number;
}

export function Sparkles({ children, className, iconSize = 16, ...props }: SparklesProps) {
    return (
        <span className={cn("inline-flex items-center gap-1.5", className)} {...props}>
            <SparkleIcon className="text-purple-500 animate-pulse" size={iconSize} />
            <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent font-medium">
                {children}
            </span>
            <SparkleIcon className="text-pink-500 animate-pulse delay-150" size={iconSize} />
        </span>
    );
}
