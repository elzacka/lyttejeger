import { createContext } from 'react';

export interface SheetContextValue {
  hasOpenSheet: boolean;
  registerSheet: (id: string) => void;
  unregisterSheet: (id: string) => void;
}

export const SheetContext = createContext<SheetContextValue | null>(null);
