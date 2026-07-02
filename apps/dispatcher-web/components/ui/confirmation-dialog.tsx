'use client';

import { Button } from './button';
import { Modal } from './modal';

export const ConfirmationDialog = ({
  trigger,
  title,
  description,
  onConfirm,
}: {
  trigger: React.ReactNode;
  title: string;
  description: string;
  onConfirm: () => void;
}) => (
  <Modal trigger={trigger} title={title}>
    <p className="text-sm text-foreground/75">{description}</p>
    <div className="mt-4 flex justify-end gap-2">
      <Button variant="danger" onClick={onConfirm}>
        Confirm
      </Button>
    </div>
  </Modal>
);
