import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Define toast variants
const toastVariants = cva(
  "p-4 mb-3 rounded-md shadow-lg max-w-md border-l-4 flex items-start",
  {
    variants: {
      variant: {
        success: "bg-green-50 border-green-500",
        error: "bg-red-50 border-red-500",
        warning: "bg-amber-50 border-amber-500",
        info: "bg-blue-50 border-blue-500",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  }
);

// Toast props interface
export interface ToastProps extends VariantProps<typeof toastVariants> {
  title: string;
  message: string;
  duration?: number;
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  variant,
  title,
  message,
  duration = 3000,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onClose) onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  const Icon = variant === 'success' ? CheckCircle : 
               variant === 'error' ? AlertCircle : 
               variant === 'warning' ? AlertCircle : 
               AlertCircle;

  const iconColor = variant === 'success' ? 'text-green-500' : 
                    variant === 'error' ? 'text-red-500' : 
                    variant === 'warning' ? 'text-amber-500' : 
                    'text-blue-500';

  return (
    <div 
      className={cn(
        toastVariants({ variant }),
        "animate-in fade-in-50 duration-300"
      )}
      role="alert"
    >
      <div className="flex-shrink-0">
        <Icon className={cn("h-5 w-5", iconColor)} />
      </div>
      <div className="ml-3 flex-grow">
        <h3 className={cn(
          "text-sm font-medium",
          variant === 'success' ? "text-green-800" : 
          variant === 'error' ? "text-red-800" : 
          variant === 'warning' ? "text-amber-800" : 
          "text-blue-800"
        )}>{title}</h3>
        <p className={cn(
          "text-sm mt-1",
          variant === 'success' ? "text-green-700" : 
          variant === 'error' ? "text-red-700" : 
          variant === 'warning' ? "text-amber-700" : 
          "text-blue-700"
        )}>{message}</p>
      </div>
      <button 
        type="button" 
        className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-500"
        onClick={() => {
          setIsVisible(false);
          if (onClose) onClose();
        }}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

// ToastContainer component
export const ToastContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col">
      {children}
    </div>
  );
};

export default Toast;
