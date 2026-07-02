'use client';

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export const TrendChart = ({
  data,
}: {
  data: Array<{ label: string; value: number }>;
}) => (
  <div className="h-56 w-full rounded-xl border border-border bg-card p-3">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <XAxis dataKey="label" stroke="currentColor" fontSize={12} />
        <YAxis stroke="currentColor" fontSize={12} />
        <Tooltip />
        <Line type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={3} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  </div>
);
