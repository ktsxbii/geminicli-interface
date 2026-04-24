"use client";
import { cn } from "@/lib/utils";
import React, { ReactNode } from "react";

interface AuroraBackgroundProps extends React.HTMLProps<HTMLDivElement> {
  children?: ReactNode;
  show?: boolean;
}

export const AuroraBackground = ({
  className,
  children,
  show = true,
  ...props
}: AuroraBackgroundProps) => {
  return (
    <div
      className={cn("aurora-container", className)}
      {...props}
    >
      {show && (
        <div className="aurora-wrapper">
          {/* Maximum 4 streams as requested */}
          <div className="aurora-stream aurora-stream-1"></div>
          <div className="aurora-stream aurora-stream-2"></div>
          <div className="aurora-stream aurora-stream-3"></div>
          <div className="aurora-stream aurora-stream-4"></div>
        </div>
      )}
      {children}
    </div>
  );
};
