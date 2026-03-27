import { ConfirmContextType } from '@/types/types'
import { createContext } from "react"

export const ConfirmContext = createContext<ConfirmContextType | null>(null)