import React from "react";

export function Card({ className, children, ...props }) {
  return (
    <div className={`bg-white rounded-lg border shadow-sm ${className || ''}`} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }) {
  return (
    <div className={`p-4 pb-0 ${className || ''}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }) {
  return (
    <h3 className={`text-xl font-semibold ${className || ''}`} {...props}>
      {children}
    </h3>
  );
}

export function CardContent({ className, children, ...props }) {
  return (
    <div className={`p-4 pt-2 ${className || ''}`} {...props}>
      {children}
    </div>
  );
}