import { InputHTMLAttributes, forwardRef } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, ...props }, ref) => {
        return (
            <div className="w-full space-y-1.5">
                {label ? (
                    <label className="text-sm font-semibold text-muted-text ml-1">
                        {label}
                    </label>
                ) : null}
                <input
                    ref={ref}
                    className={cn(
                        'flex w-full rounded-2xl border border-border bg-white px-4 py-3 text-base transition-all placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:cursor-not-allowed disabled:opacity-50',
                        error && 'border-red-500 focus:ring-red-500',
                        className
                    )}
                    {...props}
                />
                {error && (
                    <p className="text-xs font-medium text-red-500 ml-1">{error}</p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';

export { Input };
