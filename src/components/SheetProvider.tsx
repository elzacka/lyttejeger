import { useState, useCallback, type ReactNode } from 'react';
import { SheetContext } from '../contexts/sheetContext';

export function SheetProvider({ children }: { children: ReactNode }) {
  const [openSheets, setOpenSheets] = useState<Set<string>>(new Set());

  const registerSheet = useCallback((id: string) => {
    setOpenSheets((prev) => new Set(prev).add(id));
  }, []);

  const unregisterSheet = useCallback((id: string) => {
    setOpenSheets((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  return (
    <SheetContext.Provider
      value={{ hasOpenSheet: openSheets.size > 0, registerSheet, unregisterSheet }}
    >
      {children}
    </SheetContext.Provider>
  );
}
