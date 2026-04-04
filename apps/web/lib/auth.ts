export const logout = () => {
  if (typeof window === 'undefined') return;
  // Clear token cookie
  document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';

  // Clear localStorage
  localStorage.removeItem('user');
  localStorage.removeItem('userPermissions');
  window.location.href = '/login';
};
