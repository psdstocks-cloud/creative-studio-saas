import React from 'react';

export interface ColumnDef<TData> {
  id?: string;
  header?: React.ReactNode | ((context: HeaderContext<TData>) => React.ReactNode);
  accessorKey?: keyof TData | string;
  cell?: (context: CellContext<TData>) => React.ReactNode;
  enableSorting?: boolean;
  sortingFn?: (rowA: Row<TData>, rowB: Row<TData>) => number;
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
  getIsSorted: () => false | 'asc' | 'desc';
  getToggleSortingHandler: () => (event: React.MouseEvent) => void;
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

export interface SortingState {
  id: string;
  desc: boolean;
}

export interface Table<TData> {
  getHeaderGroups: () => HeaderGroup<TData>[];
  getRowModel: () => RowModel<TData>;
  getState: () => { sorting: SortingState[] };
}

export interface UseReactTableOptions<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  state?: {
    sorting?: SortingState[];
  };
  onSortingChange?: (updater: SortingState[] | ((old: SortingState[]) => SortingState[])) => void;
}

export const getCoreRowModel =
  <TData>() =>
  ({ rows }: RowModel<TData>) =>
    rows;

export function flexRender<TValue>(
  renderer: React.ReactNode | ((context: unknown) => React.ReactNode),
  context: unknown
): React.ReactNode {
  if (typeof renderer === 'function') {
    return (renderer as (context: unknown) => React.ReactNode)(context);
  }
  return renderer ?? null;
}

const defaultSortingFn = <TData>(rowA: Row<TData>, rowB: Row<TData>, columnId: string): number => {
  const a = rowA.getValue(columnId);
  const b = rowB.getValue(columnId);

  if (a === b) return 0;
  if (a == null) return 1;
  if (b == null) return -1;

  if (typeof a === 'string' && typeof b === 'string') {
    return a.localeCompare(b);
  }

  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }

  return String(a).localeCompare(String(b));
};

export function useReactTable<TData>({
  data,
  columns,
  state,
  onSortingChange,
}: UseReactTableOptions<TData>): Table<TData> {
  const sorting = state?.sorting ?? [];

  return React.useMemo(() => {
    const materializedColumns: Column<TData>[] = columns.map((column, index) => {
      const columnId =
        column.id ?? (typeof column.accessorKey === 'string' ? column.accessorKey : String(index));
      const sortState = sorting.find((s) => s.id === columnId);

      return {
        id: columnId,
        columnDef: column,
        getIsSorted: () => {
          if (!sortState) return false;
          return sortState.desc ? 'desc' : 'asc';
        },
        getToggleSortingHandler: () => (event: React.MouseEvent) => {
          event.preventDefault();
          if (!onSortingChange || column.enableSorting === false) return;

          const currentSort = sorting.find((s) => s.id === columnId);
          let newSorting: SortingState[];

          if (!currentSort) {
            // Not sorted, sort ascending
            newSorting = [{ id: columnId, desc: false }];
          } else if (!currentSort.desc) {
            // Currently ascending, sort descending
            newSorting = [{ id: columnId, desc: true }];
          } else {
            // Currently descending, remove sort
            newSorting = [];
          }

          onSortingChange(newSorting);
        },
      };
    });

    const headerGroup: HeaderGroup<TData> = {
      id: 'header-group-0',
      headers: materializedColumns.map((column) => ({
        id: `header-${column.id}`,
        column,
        columnDef: column.columnDef,
      })),
    };

    // Sort data if sorting is enabled
    let sortedData = [...data];
    if (sorting.length > 0) {
      const sortState = sorting[0]; // Single sort for now
      const column = materializedColumns.find((c) => c.id === sortState.id);

      if (column) {
        const sortFn = column.columnDef.sortingFn || ((a, b) => defaultSortingFn(a, b, column.id));
        sortedData.sort((a, b) => {
          const rowA: Row<TData> = {
            id: '',
            original: a,
            cells: [],
            getValue: (id: string) => (a as any)[id],
          };
          const rowB: Row<TData> = {
            id: '',
            original: b,
            cells: [],
            getValue: (id: string) => (b as any)[id],
          };

          const result = sortFn(rowA, rowB);
          return sortState.desc ? -result : result;
        });
      }
    }

    const rows: Row<TData>[] = sortedData.map((row, rowIndex) => {
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
          getVisibleCells: () => baseRow.cells,
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
      getState: () => ({ sorting }),
    };
  }, [columns, data, sorting, onSortingChange]);
}
