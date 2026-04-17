export type VpnContextType = {
    duration: number
    durationTotal: number
    status: Status
    error: string    
    up: number
    upTotal: number
    down: number
    downTotal: number
    upSpd: number
    downSpd: number
    startVpn: () => Promise<void>
    stopVpn: (r: Reason) => Promise<void>
    restartVpn: () => Promise<void>
}

export type InstalledApp = {
  name: string
  packageName: string
  icon: string
  selected: boolean
}
export type AppRowProps = {
  item: InstalledApp;
  onToggle: (packageName: string) => void;
}
export type Reason = 'restart' | 'manual'
export type Status = 'disconnected' | 'connecting' | 'connected' | 'error' | 'stopping'

export type ConfirmModalProps = {
  visible: boolean
  title: string
  message: string
  confirmText?: string
  onConfirm?: () => void
  onDismiss: () => void
}
export type ConfirmOptions = {
  title: string
  message: string
  confirmText?: string
  onConfirm?: () => void
}

export type ConfirmContextType = {
  confirm: (options: ConfirmOptions) => void
}

export type LogsContextType = {
  logs: string[];
  appendLogs: (logs: string[]) => void;
  clearLogs: () => void;
};

export type VpnConfig = {
  server: string;
  port: number;
  uuid: string;
  sni: string;
  key: string;
  id: string;
};

export type VpnProps = {
  onConfigReceived: (config: VpnConfig) => void;
};

export type BottomSheetProps = {
    visible: boolean;
    onDismiss: () => void;
    children: React.ReactNode;
};
export type FormProps = {
    onSubmit: (login: string, password: string) => void;
    loading?: boolean;
};