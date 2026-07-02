import { Card } from './card';
import { EmptyState } from './empty-state';
import { Table, TBody, TD, TH, THead, TR } from './table';

export const DataGrid = ({
  columns,
  rows,
}: {
  columns: Array<{ key: string; label: string }>;
  rows: Array<Record<string, string | number | null>>;
}) => {
  if (rows.length === 0) {
    return <EmptyState title="No records" description="Data appears here when records are available." />;
  }

  return (
    <Card className="p-0">
      <Table>
        <THead>
          <TR>
            {columns.map((column) => (
              <TH key={column.key}>{column.label}</TH>
            ))}
          </TR>
        </THead>
        <TBody>
          {rows.map((row, rowIndex) => (
            <TR key={String(row.id ?? rowIndex)}>
              {columns.map((column) => (
                <TD key={column.key}>{String(row[column.key] ?? '-')}</TD>
              ))}
            </TR>
          ))}
        </TBody>
      </Table>
    </Card>
  );
};
