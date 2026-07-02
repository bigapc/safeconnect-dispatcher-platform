export const LoadingIndicator = ({ label = 'Loading' }: { label?: string }) => (
  <div className="inline-flex items-center gap-2 text-sm text-foreground/70">
    <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    {label}
  </div>
);
