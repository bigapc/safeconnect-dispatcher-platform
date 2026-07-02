import { Button } from './button';

export const ErrorState = ({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) => (
  <div className="rounded-xl border border-danger/40 bg-danger/10 p-4">
    <p className="text-sm text-danger">{message}</p>
    {onRetry && (
      <Button className="mt-3" variant="danger" size="sm" onClick={onRetry}>
        Retry
      </Button>
    )}
  </div>
);
