// GreenAI Logo Component - Premium SVG Logo
"use client";

import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  animated?: boolean;
}

const sizeMap = {
  sm: { icon: 24, text: "text-sm" },
  md: { icon: 32, text: "text-base" },
  lg: { icon: 40, text: "text-lg" },
  xl: { icon: 48, text: "text-xl" },
};

export function Logo({ 
  className, 
  size = "md", 
  showText = true,
  animated = true 
}: LogoProps) {
  const { icon, text } = sizeMap[size];
  
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn(
        "relative flex items-center justify-center",
        animated && "group"
      )}>
        {/* Glow effect */}
        <div className={cn(
          "absolute inset-0 rounded-xl bg-gradient-to-br from-emerald-500/30 to-teal-500/30 blur-lg",
          animated && "transition-all duration-500 group-hover:blur-xl group-hover:from-emerald-500/40 group-hover:to-teal-500/40"
        )} />
        
        {/* Logo SVG */}
        <svg
          width={icon}
          height={icon}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cn(
            "relative z-10",
            animated && "transition-transform duration-300 group-hover:scale-105"
          )}
        >
          {/* Background circle */}
          <circle 
            cx="24" 
            cy="24" 
            r="22" 
            className="fill-emerald-500/10 stroke-emerald-500/30"
            strokeWidth="1"
          />
          
          {/* Inner gradient circle */}
          <defs>
            <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#14b8a6" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
            <linearGradient id="leafGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
          
          {/* Leaf shape - representing sustainability */}
          <path
            d="M24 8C24 8 32 14 32 24C32 34 24 40 24 40C24 40 16 34 16 24C16 14 24 8 24 8Z"
            fill="url(#leafGradient)"
            className={cn(animated && "origin-center animate-pulse")}
            style={{ animationDuration: "3s" }}
          />
          
          {/* Center vein of leaf */}
          <path
            d="M24 12V36"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.6"
          />
          
          {/* Side veins */}
          <path
            d="M24 18L20 22M24 24L19 28M24 30L21 33"
            stroke="white"
            strokeWidth="1"
            strokeLinecap="round"
            opacity="0.4"
          />
          <path
            d="M24 18L28 22M24 24L29 28M24 30L27 33"
            stroke="white"
            strokeWidth="1"
            strokeLinecap="round"
            opacity="0.4"
          />
          
          {/* AI circuit dots */}
          <circle cx="14" cy="20" r="2" fill="url(#logoGradient)" opacity="0.8" />
          <circle cx="34" cy="20" r="2" fill="url(#logoGradient)" opacity="0.8" />
          <circle cx="12" cy="28" r="1.5" fill="url(#logoGradient)" opacity="0.6" />
          <circle cx="36" cy="28" r="1.5" fill="url(#logoGradient)" opacity="0.6" />
          
          {/* Circuit lines */}
          <path
            d="M14 20L16 24M34 20L32 24M12 28L16 26M36 28L32 26"
            stroke="url(#logoGradient)"
            strokeWidth="1"
            strokeLinecap="round"
            opacity="0.5"
          />
        </svg>
      </div>
      
      {showText && (
        <div className="flex flex-col">
          <span className={cn(
            "font-bold tracking-tight bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 bg-clip-text text-transparent",
            text
          )}>
            GreenAI
          </span>
          <span className="text-[10px] text-muted-foreground tracking-wide uppercase">
            Carbon Intelligence
          </span>
        </div>
      )}
    </div>
  );
}

export function LogoMark({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="logoMarkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="22" fill="url(#logoMarkGradient)" opacity="0.15" />
      <path
        d="M24 8C24 8 32 14 32 24C32 34 24 40 24 40C24 40 16 34 16 24C16 14 24 8 24 8Z"
        fill="url(#logoMarkGradient)"
      />
      <path d="M24 12V36" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}
