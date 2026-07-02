import type { ButtonHTMLAttributes } from 'react';
import { cn } from './index';

export interface UIButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

export const Button = ({ variant = 'primary', className, ...props }: UIButtonProps) => {
  return (
    <button
      className={cn(
        'inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-medium transition',
        variant === 'primary' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-100',
        className,
      )}
      {...props}
    />
  );
};
