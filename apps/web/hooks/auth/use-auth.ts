import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/apiClient';
import { logout as logoutUser } from '@/lib/auth';
import { LoginResponse, LoginCredentials, User } from '@/types/auth';

// Utility functions for data storage
const storeAuthData = (data: LoginResponse) => {
  if (typeof window === 'undefined') return;
  // Store token in cookie
  document.cookie = `token=${data.token}; path=/; max-age=86400; secure; samesite=strict`;

  // Store user data in localStorage for app state
  localStorage.setItem('user', JSON.stringify(data.user));
  localStorage.setItem(
    'userPermissions',
    JSON.stringify({
      permissions: Array.isArray(data?.permissionslist?.permissions)
        ? data.permissionslist.permissions
        : [],
      roles: Array.isArray(data?.permissionslist?.roles)
        ? data.permissionslist.roles
        : [],
    })
  );
};

const loginApi = async (
  credentials: LoginCredentials
): Promise<LoginResponse> => {
  return await apiFetch<LoginResponse>('/v2/account/login', {
    method: 'POST',
    data: credentials,
  });
};

export const useAuth = () => {
  const router = useRouter();

  const loginMutation = useMutation({
    mutationFn: loginApi,
    onSuccess: (data: LoginResponse) => {
      storeAuthData(data);
      router.push('/dashboard');
    },
    onError: (error: Error) => {
      toast.error(`Login failed: ${error.message}`);
    },
  });

  const login = (credentials: LoginCredentials) => {
    loginMutation.mutate(credentials);
  };

  const logout = () => {
    logoutUser();
    toast.success('Logged out successfully!');
  };

  const isAuthenticated = () => {
    if (typeof window === 'undefined') return false;
    // Check if token exists in cookies
    return document.cookie.includes('token=');
  };

  const getUser = (): User | null => {
    if (typeof window === 'undefined') return null;
    try {
      const userData = localStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    } catch {
      return null;
    }
  };

  const getUserPermissions = (): { permissions: string[]; roles: string[] } => {
    if (typeof window === 'undefined') return { permissions: [], roles: [] };
    try {
      const permissionsData = localStorage.getItem('userPermissions');
      if (!permissionsData) {
        return { permissions: [], roles: [] };
      }
      const parsed = JSON.parse(permissionsData);

      // Handle backward compatibility: if stored as array (old format), treat as permissions
      if (Array.isArray(parsed)) {
        return { permissions: parsed, roles: [] };
      }

      // Handle new format: object with permissions and roles
      return {
        permissions: Array.isArray(parsed?.permissions)
          ? parsed.permissions
          : [],
        roles: Array.isArray(parsed?.roles) ? parsed.roles : [],
      };
    } catch {
      return { permissions: [], roles: [] };
    }
  };

  console.log('getUser', getUser());
  console.log('userPermissions', getUserPermissions());

  return {
    login,
    logout,
    isAuthenticated,
    getUser,
    getUserPermissions,
    isLoading: loginMutation.isPending,
    isError: loginMutation.isError,
    error: loginMutation.error,
  };
};
