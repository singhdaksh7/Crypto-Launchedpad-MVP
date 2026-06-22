import React from 'react';

interface Column {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps {
  columns: Column[];
  rows: Record<string, React.ReactNode>[];
  emptyState?: React.ReactNode;
}

export const DataTable: React.FC<DataTableProps> = ({
  columns,
  rows,
  emptyState,
}) => {
  if (rows.length === 0 && emptyState) {
    return <div className="mt-2">{emptyState}</div>;
  }

  return (
    <div className="w-full overflow-x-auto border border-white/5 rounded-2xl bg-surface/50 backdrop-blur-md">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-white/5 bg-white/[0.02]">
            {columns.map((col) => {
              const align = col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left';
              return (
                <th
                  key={col.key}
                  className={`px-6 py-4 text-xs font-bold uppercase tracking-wider text-ink-500 ${align}`}
                >
                  {col.label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.map((row, rIdx) => (
            <tr key={rIdx} className="hover:bg-white/[0.01] transition-colors">
              {columns.map((col) => {
                const align = col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left';
                return (
                  <td
                    key={col.key}
                    className={`px-6 py-4 text-sm font-medium text-ink-100 whitespace-nowrap ${align}`}
                  >
                    {row[col.key]}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
export default DataTable;
