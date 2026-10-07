import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ApiPath } from "@/lib/apiPath"
import { queryKeys } from "@/lib/utils/query"
import { useAuthStore } from "@/stores/auth"
import type {
  AuthResponse,
  CreateInitialAdminRequest,
  SetupStatus,
} from "@/lib/types"

export function useSetupStatus() {
  return useQuery<SetupStatus>({
    queryKey: queryKeys.setup.status,
    queryFn: () =>
      api.get<SetupStatus>(ApiPath.Setup.STATUS).then((r) => r.data),
    staleTime: Infinity,
    retry: 1,
  })
}

export function useCreateInitialAdmin() {
  const queryClient = useQueryClient()
  const applySession = useAuthStore((s) => s.applySession)
  return useMutation({
    mutationFn: (payload: CreateInitialAdminRequest) =>
      api.post<AuthResponse>(ApiPath.Setup.ADMIN, payload).then((r) => r.data),
    onSuccess: (data) => {
      applySession(data)
      markSetupCompleted(queryClient)
    },
  })
}

export function markSetupCompleted(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  queryClient.setQueryData<SetupStatus>(queryKeys.setup.status, {
    setupCompleted: true,
  })
}
