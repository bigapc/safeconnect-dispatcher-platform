import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const IncidentsPage = () => (
  <section className="space-y-4 animate-fade-up">
    <Breadcrumbs items={[{ label: 'Operations' }, { label: 'Incidents' }]} />
    <Tabs defaultValue="open">
      <TabsList>
        <TabsTrigger value="open">Open</TabsTrigger>
        <TabsTrigger value="resolved">Resolved</TabsTrigger>
      </TabsList>
      <TabsContent value="open" className="mt-4">
        <Card>
          <p className="text-sm">Open incident records are fetched from the incident service.</p>
        </Card>
      </TabsContent>
      <TabsContent value="resolved" className="mt-4">
        <Card>
          <p className="text-sm">Resolved incident records are available through audit history.</p>
        </Card>
      </TabsContent>
    </Tabs>
  </section>
);

export default IncidentsPage;
