import { useContext } from 'react';
import { SheetContext, type SheetContextValue } from '../contexts/sheetContext';

export function useSheetContext(): SheetContextValue {
  const context = useContext(SheetContext);
  if (!context) {
    throw new Error('useSheetContext must be used within SheetProvider');
  }
  return context;
}
