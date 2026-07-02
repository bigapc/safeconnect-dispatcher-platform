'use client';

import { Dialog, DialogContent, DialogTrigger } from './dialog';

export const Modal = ({
  trigger,
  title,
  children,
}: {
  trigger: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) => (
  <Dialog>
    <DialogTrigger asChild>{trigger}</DialogTrigger>
    <DialogContent title={title}>{children}</DialogContent>
  </Dialog>
);
