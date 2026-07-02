'use client';

import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@safeconnect/ui';

export const Tabs = TabsPrimitive.Root;

export const TabsList = ({ className, ...props }: TabsPrimitive.TabsListProps) => (
  <TabsPrimitive.List
    className={cn('inline-flex rounded-xl border border-border bg-card p-1', className)}
    {...props}
  />
);

export const TabsTrigger = ({ className, ...props }: TabsPrimitive.TabsTriggerProps) => (
  <TabsPrimitive.Trigger
    className={cn(
      'rounded-lg px-3 py-1.5 text-sm data-[state=active]:bg-primary data-[state=active]:text-white',
      className,
    )}
    {...props}
  />
);

export const TabsContent = TabsPrimitive.Content;
