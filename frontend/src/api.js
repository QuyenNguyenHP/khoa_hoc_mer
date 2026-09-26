export const api = async (path, options = {}) => {
  const token = localStorage.getItem('course-token');
  const isFormData = options.body instanceof FormData;
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
  if (!response.ok) throw new Error((await response.json()).message || 'Có lỗi xảy ra');
  return response.status === 204 ? null : response.json();
};
