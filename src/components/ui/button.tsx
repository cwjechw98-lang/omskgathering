import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 cursor-pointer overflow-hidden relative",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        outline:
          'border border-border bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        mythic:
          'btn-mythic bg-gradient-to-r from-[#5c1a0a] via-[#8b2a1a] to-[#5c1a0a] hover:from-[#7a2a1a] hover:via-[#b03020] hover:to-[#7a2a1a] text-white border border-[#c9a84c]/40 shadow-lg shadow-red-900/40 hover:shadow-red-600/50 hover:scale-[1.03] transition-all duration-300 font-heading tracking-wide relative z-10',
        nav: 'text-gray-400 hover:text-[#f0d68a] border border-gray-700/40 hover:border-[#c9a84c]/30 shadow-lg hover:scale-[1.02] transition-all duration-300 font-heading tracking-wide relative z-10',
        gold: 'bg-gradient-to-r from-[#2a1a04] via-[#4a3010] to-[#2a1a04] hover:from-[#4a3010] hover:via-[#6a4a1a] hover:to-[#4a3010] text-[#f0d68a] border border-[#c9a84c]/25 shadow-lg hover:scale-[1.02] transition-all duration-300 font-heading tracking-wide relative z-10',
        blue: 'bg-gradient-to-r from-[#0a2a4c] via-[#1a4070] to-[#0a2a4c] hover:from-[#1a3a6a] hover:via-[#2a5090] hover:to-[#1a3a6a] text-white border border-[#c9a84c]/25 shadow-lg hover:shadow-blue-700/30 hover:scale-[1.02] transition-all duration-300 font-heading tracking-wide relative z-10',
        purple:
          'bg-gradient-to-r from-[#1a0a2a] via-[#2a1a4a] to-[#1a0a2a] hover:from-[#2a1a4a] hover:via-[#4a2a6a] hover:to-[#2a1a4a] text-purple-200 border border-[#c9a84c]/20 shadow-lg hover:scale-[1.02] transition-all duration-300 font-heading tracking-wide relative z-10',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-lg px-6',
        xl: 'h-12 rounded-xl px-6 py-4 text-lg',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : 'button';
  const [ripples, setRipples] = React.useState<Array<{ id: number; x: number; y: number }>>([]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();

    setRipples((prev) => [...prev, { id, x, y }]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 600);

    props.onClick?.(e);
  };

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      onClick={handleClick}
      {...props}
    >
      {props.children}
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="btn-ripple"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: '100px',
            height: '100px',
            marginLeft: '-50px',
            marginTop: '-50px',
          }}
        />
      ))}
    </Comp>
  );
}

export { Button, buttonVariants };
