'use client';

import { Button } from './button';

export const Pagination = ({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) => (
  <div className="flex items-center gap-2">
    <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
      Previous
    </Button>
    <span className="text-sm">
      {page} / {totalPages}
    </span>
    <Button
      variant="secondary"
      size="sm"
      disabled={page >= totalPages}
      onClick={() => onChange(page + 1)}
    >
      Next
    </Button>
  </div>
);
