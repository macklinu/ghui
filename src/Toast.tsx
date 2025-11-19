import { create } from 'zustand'

interface Toast {
  id: string
  kind: 'success' | 'danger' | 'warning'
  message: string
  duration?: number
}

export const useToast = create<{
  toasts: Toast[]
  showToast: (toast: Omit<Toast, 'id'>) => Toast['id']
  removeToast: (toastId: string) => void
}>()((set) => ({
  toasts: [],
  showToast: (toast) => {
    const id = Bun.randomUUIDv7()
    set(({ toasts }) => ({ toasts: [...toasts, { id, ...toast }] }))
    setTimeout(() => {
      set(({ toasts }) => ({
        toasts: toasts.filter((toast) => toast.id !== id),
      }))
    }, toast.duration ?? 5000)
    return id
  },
  removeToast: (toastId) =>
    set(({ toasts }) => ({
      toasts: toasts.filter((toast) => toast.id !== toastId),
    })),
}))
