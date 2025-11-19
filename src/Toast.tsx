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
}>()((set) => {
  const removeToast = (toastId: Toast['id']) =>
    set(({ toasts }) => ({
      toasts: toasts.filter((toast) => toast.id !== toastId),
    }))

  return {
    toasts: [],
    showToast: (toast) => {
      const id = Bun.randomUUIDv7()
      set(({ toasts }) => ({ toasts: [...toasts, { id, ...toast }] }))
      setTimeout(() => removeToast(id), toast.duration ?? 5000)
      return id
    },
  }
})
