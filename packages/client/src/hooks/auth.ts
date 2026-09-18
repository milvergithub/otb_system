import { useCallback } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { api, clearTokens, setTokens } from "@/lib/api"
import { ApiPath } from "@/lib/apiPath"
import type { AuthResponse } from "@/lib/types"

export interface LoginRequest {
  email: string
  password: string
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ email, password }: LoginRequest) =>
      api
        .post<AuthResponse>(ApiPath.Auth.LOGIN, { email, password })
        .then((r) => r.data),
    onSuccess: (data) => {
      setTokens(data.accessToken, data.refreshToken)
      queryClient.clear()
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useCallback(() => {
    clearTokens()
    queryClient.clear()
  }, [queryClient])
}
