import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ApiPath } from "@/lib/apiPath"
import { queryKeys } from "@/lib/utils/query"
import type { PaymentMethodItem } from "@/lib/types"

export interface PaymentMethodRequest {
  code: string
  name: string
}

export function usePaymentMethods(enabled = true) {
  return useQuery<PaymentMethodItem[]>({
    queryKey: queryKeys.paymentMethods.list,
    queryFn: () => api.get(ApiPath.PaymentMethods.BASE).then((r) => r.data),
    enabled,
  })
}

/** Maps a stored `payment_method` code to its display name. */
export function usePaymentMethodMap(enabled = true) {
  const { data, ...rest } = usePaymentMethods(enabled)
  const map: Record<string, string> = {}
  for (const item of data ?? []) map[item.code] = item.name
  return { map, data, ...rest }
}

export function useCreatePaymentMethod() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: PaymentMethodRequest) =>
      api.post(ApiPath.PaymentMethods.BASE, payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods.all })
    },
  })
}

export function useEditPaymentMethod() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.patch(ApiPath.PaymentMethods.ONE(id), { name }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods.all })
    },
  })
}

export function useDeletePaymentMethod() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(ApiPath.PaymentMethods.ONE(id)).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods.all })
    },
  })
}
