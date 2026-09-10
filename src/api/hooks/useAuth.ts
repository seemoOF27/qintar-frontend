import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, api, setToken } from '@/api/client'
import type { User } from '@/api/types'
import { keys } from './keys'

interface LoginResult {
  user: User
  token: string
  expires_at: string | null
}

export function useMe() {
  return useQuery({
    queryKey: keys.me,
    queryFn: async () => (await api.get<User>('/auth/me')).data,
    retry: (count, error) => !(error instanceof ApiError && error.status === 401) && count < 2,
    staleTime: 60_000,
  })
}

export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { email: string; password: string }) =>
      (
        await api.post<LoginResult>('/auth/login', {
          ...input,
          device_name: navigator.userAgent.slice(0, 120),
        })
      ).data,
    onSuccess: (result) => {
      setToken(result.token)
      queryClient.setQueryData(keys.me, result.user)
    },
  })
}

export function useRegister() {
  return useMutation({
    mutationFn: async (input: {
      name: string
      email: string
      password: string
      password_confirmation: string
    }) => (await api.post<User>('/auth/register', { ...input, accepts_terms: true })).data,
  })
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: async (input: { email: string; code: string }) =>
      (await api.post<User>('/auth/verify-email', input)).data,
  })
}

export function useResendCode() {
  return useMutation({
    mutationFn: async (email: string) => api.post('/auth/resend-code', { email }),
  })
}

export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => api.post('/auth/logout'),
    // الرمز يُمسح في الحالتين: فشل الطلب لا يعني بقاء الجلسة على الجهاز.
    onSettled: () => {
      setToken(null)
      queryClient.clear()
    },
  })
}
