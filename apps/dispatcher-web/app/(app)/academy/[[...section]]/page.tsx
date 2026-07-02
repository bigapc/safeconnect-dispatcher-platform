'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'next/navigation';
import { BookOpen, CircleCheckBig, GraduationCap, ShieldCheck } from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingIndicator } from '@/components/ui/loading';
import { academySectionMap, academySections } from '@/components/academy/academy-sections';
import { http } from '@/lib/http';

interface PaginatedResponse {
  items: Record<string, unknown>[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const AcademyPage = () => {
  const params = useParams<{ section?: string[] }>();
  const searchParams = useSearchParams();

  const sectionSlug = params.section?.[0] ?? 'dashboard';
  const section = academySectionMap.get(sectionSlug) ?? academySectionMap.get('dashboard');

  const page = Number.parseInt(searchParams.get('page') ?? '1', 10);
  const query = searchParams.get('q') ?? undefined;

  const endpoint = section?.endpoint ?? '/academy/dashboard';

  const dataQuery = useQuery({
    queryKey: ['academy-section', sectionSlug, page, query],
    queryFn: async () => {
      if (section?.mode === 'paginated') {
        const response = await http.get<PaginatedResponse>(endpoint, {
          params: {
            page,
            limit: 12,
            search: query,
            sortBy: 'updatedAt',
            sortOrder: 'desc',
          },
        });

        return response.data;
      }

      const response = await http.get<Record<string, unknown>>(endpoint);
      return response.data;
    },
  });

  const summaryEntries = useMemo(() => {
    if (!dataQuery.data || section?.mode === 'paginated') {
      return [];
    }

    return Object.entries(dataQuery.data).slice(0, 8);
  }, [dataQuery.data, section?.mode]);

  if (dataQuery.isLoading) {
    return <LoadingIndicator label="Loading academy" />;
  }

  if (dataQuery.isError || !section) {
    return <ErrorState message="Unable to load academy content" onRetry={() => void dataQuery.refetch()} />;
  }

  const paginatedData = section.mode === 'paginated' ? (dataQuery.data as PaginatedResponse) : null;

  return (
    <section className="space-y-5 animate-fade-up">
      <Breadcrumbs items={[{ label: 'Operations' }, { label: 'APC SafeConnect Academy' }, { label: section.label }]} />

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-foreground/65">Enterprise Training Module</p>
            <h1 className="text-3xl font-semibold">APC SafeConnect Academy</h1>
            <p className="mt-2 text-sm text-foreground/75">{section.label}</p>
          </div>
          <div className="flex items-center gap-2 text-foreground/70">
            <GraduationCap className="h-4 w-4" />
            <span className="text-sm">Integrated with existing org, user, roles, and analytics systems</span>
          </div>
        </div>
      </div>

      <div className="grid gap-2 rounded-2xl border border-border bg-card p-3 md:grid-cols-2 xl:grid-cols-3">
        {academySections.map((item) => {
          const active = item.slug === section.slug;
          return (
            <Link
              key={item.slug}
              href={`/academy/${item.slug}`}
              className={`rounded-xl px-3 py-2 text-sm transition ${
                active ? 'bg-primary text-white' : 'border border-border bg-background hover:bg-muted'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      {section.mode === 'summary' ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryEntries.map(([key, value], index) => (
            <Card key={key} className="animate-fade-up" style={{ animationDelay: `${index * 60}ms` }}>
              <div className="flex items-center justify-between">
                <p className="text-sm text-foreground/70">{key}</p>
                <ShieldCheck className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-3 text-2xl font-semibold">{String(value ?? '-')}</p>
            </Card>
          ))}
        </div>
      ) : paginatedData && paginatedData.items.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {paginatedData.items.map((item, index) => {
            const title = (item.title ?? item.name ?? item.sopNumber ?? item.verificationNumber ?? 'Item') as string;
            const subtitle = (item.description ?? item.summary ?? item.status ?? item.manualType ?? '') as string;
            return (
              <Card key={`${title}-${index}`} className="animate-fade-up" style={{ animationDelay: `${index * 50}ms` }}>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-semibold">{title}</h3>
                  <BookOpen className="h-4 w-4 text-primary" />
                </div>
                <p className="mt-2 text-sm text-foreground/75">{subtitle || 'Enterprise academy content item'}</p>
                <div className="mt-3 inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-xs text-foreground/70">
                  <CircleCheckBig className="h-3.5 w-3.5" />
                  Synced module content
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <EmptyState
            title="No Academy Content Yet"
            description="This section is connected to the shared enterprise academy data model and is ready for content."
          />
        </Card>
      )}
    </section>
  );
};

export default AcademyPage;
