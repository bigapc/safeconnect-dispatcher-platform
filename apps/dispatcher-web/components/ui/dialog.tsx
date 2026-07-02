'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;

export const DialogContent = ({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 bg-black/45" />
    <DialogPrimitive.Content className="fixed left-1/2 top-1/2 w-[min(92vw,500px)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <DialogPrimitive.Title className="text-lg font-semibold">{title}</DialogPrimitive.Title>
        <DialogPrimitive.Close aria-label="Close dialog">
          <X className="h-4 w-4" />
        </DialogPrimitive.Close>
      </div>
      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
);
