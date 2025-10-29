import React from 'react';

export interface ColumnDef<TData> {
  id?: string;
  header?: React.ReactNode | ((context: HeaderContext<TData>) => React.ReactNode);
  accessorKey?: keyof TData | string;
  cell?: (context: CellContext<TData>) => React.ReactNode;
}

export interface HeaderContext<TData> {
  column: Column<TData>;
}

export interface CellContext<TData> {
  row: Row<TData>;
  column: Column<TData>;
  getValue: () => unknown;
}

export interface Column<TData> {
  id: string;
  columnDef: ColumnDef<TData>;
}

export interface Header<TData> {
  id: string;
  column: Column<TData>;
  columnDef: ColumnDef<TData>;
}

export interface HeaderGroup<TData> {
  id: string;
  headers: Header<TData>[];
}

export interface Cell<TData> {
  id: string;
  row: Row<TData>;
  column: Column<TData>;
  getValue: () => unknown;
}

export interface Row<TData> {
  id: string;
  original: TData;
  cells: Cell<TData>[];
  getValue: (columnId: string) => unknown;
}

export interface RowModel<TData> {
  rows: Row<TData>[];
}

export interface Table<TData> {
  getHeaderGroups: () => HeaderGroup<TData>[];
  getRowModel: () => RowModel<TData>;
}

export interface UseReactTableOptions<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
}

export const getCoreRowModel = <TData,>() => ({ rows }: RowModel<TData>) => rows;

export function flexRender<TValue>(
  renderer: React.ReactNode | ((context: unknown) => React.ReactNode),
  context: unknown,
): React.ReactNode {
  if (typeof renderer === 'function') {
    return (renderer as (context: unknown) => React.ReactNode)(context);
  }
  return renderer ?? null;
}

export function useReactTable<TData>({ data, columns }: UseReactTableOptions<TData>): Table<TData> {
  return React.useMemo(() => {
    const materializedColumns: Column<TData>[] = columns.map((column, index) => ({
      id: column.id ?? (typeof column.accessorKey === 'string' ? column.accessorKey : String(index)),
      columnDef: column,
    }));

    const headerGroup: HeaderGroup<TData> = {
      id: 'header-group-0',
      headers: materializedColumns.map((column) => ({
        id: `header-${column.id}`,
        column,
        columnDef: column.columnDef,
      })),
    };

    const rows: Row<TData>[] = data.map((row, rowIndex) => {
      const baseRow: Row<TData> = {
        id: `row-${rowIndex}`,
        original: row,
        getValue: (columnId: string) => {
          const targetColumn = materializedColumns.find((col) => col.id === columnId);
          if (!targetColumn) {
            return undefined;
          }
          if (typeof targetColumn.columnDef.accessorKey !== 'undefined') {
            const key = targetColumn.columnDef.accessorKey as keyof TData;
            return (row as Record<string, unknown>)[key as string];
          }
          return undefined;
        },
        cells: [],
      };

      baseRow.cells = materializedColumns.map((column) => ({
        id: `${baseRow.id}_${column.id}`,
        row: baseRow,
        column,
        getValue: () => baseRow.getValue(column.id),
      }));

      return baseRow;
    });

    return {
      getHeaderGroups: () => [headerGroup],
      getRowModel: () => ({ rows }),
    };
  }, [columns, data]);
}
