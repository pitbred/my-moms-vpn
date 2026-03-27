import { ConfirmContext } from '@/context/ConfirmContext';
import { useContext } from 'react';

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error("useConfirm must be used inside ConfirmProvider")
  return ctx.confirm
}