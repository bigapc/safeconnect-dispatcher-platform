export const EmptyState = ({ title, description }: { title: string; description: string }) => (
  <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center">
    <h3 className="text-base font-semibold">{title}</h3>
    <p className="mt-2 text-sm text-foreground/70">{description}</p>
  </div>
);
