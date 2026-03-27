import ConfirmModal from "@/components/ConfirmModal"
import { ConfirmContext } from '@/context/ConfirmContext'
import { ConfirmOptions } from '@/types/types'
import React, { useState } from "react"

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null)

  const confirm = (opts: ConfirmOptions) => {
    setOptions(opts)
  }

  const close = () => {
    setOptions(null)
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      {options && (
        <ConfirmModal
          visible={true}
          title={options.title}
          message={options.message}
          confirmText={options.confirmText}
          onConfirm={options.onConfirm}
          onDismiss={close}
        />
      )}
    </ConfirmContext.Provider>
  )
}