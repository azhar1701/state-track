declare module '@hello-pangea/dnd' {
  import type { ComponentType } from 'react';
  export const DragDropContext: ComponentType<any>;
  export const Droppable: ComponentType<any>;
  export const Draggable: ComponentType<any>;
  export type DropResult = any;
  export default {} as any;
}

declare module '@tanstack/react-query' {
  export function useQuery<T = unknown>(options: any): { data?: T; isLoading: boolean; error?: any };
  export function useMutation<T = unknown>(options: any): any;
  export function useQueryClient(): {
    getQueryData<T = unknown>(key: any): T | undefined;
    setQueryData<T = unknown>(key: any, updater: T | ((old?: T) => T | undefined)): void;
    invalidateQueries: (opts: any) => void;
    cancelQueries?: (opts: any) => Promise<void> | void;
  };
  export default {} as any;
}
