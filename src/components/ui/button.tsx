import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] cursor-pointer shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs',
        emerald:
          'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs',
        rose:
          'bg-rose-600 text-white hover:bg-rose-700 shadow-xs',
        amber:
          'bg-amber-600 text-white hover:bg-amber-700 shadow-xs',
        sky:
          'bg-sky-600 text-white hover:bg-sky-700 shadow-xs',
        violet:
          'bg-violet-600 text-white hover:bg-violet-700 shadow-xs',
        teal:
          'bg-teal-600 text-white hover:bg-teal-700 shadow-xs',
        outline:
          'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 hover:border-slate-300',
        secondary:
          'bg-indigo-50 text-indigo-900 border border-indigo-200/80 hover:bg-indigo-100/80',
        ghost:
          'text-slate-700 hover:bg-slate-100 hover:text-slate-900',
        destructive:
          'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-11 rounded-xl px-5 text-sm',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
