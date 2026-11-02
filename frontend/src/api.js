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
  if (response.status === 204) return null;
  // Errors from a proxy or an outdated backend come back as HTML, not JSON.
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (data?.message) throw new Error(data.message);
    if (response.status === 404) throw new Error('Máy chủ chưa có chức năng này. Hãy khởi động lại backend rồi thử lại.');
    if (response.status === 413) throw new Error('Dữ liệu gửi lên quá lớn.');
    throw new Error(`Có lỗi xảy ra (mã ${response.status}). Vui lòng thử lại.`);
  }
  if (data === null) throw new Error('Máy chủ trả về dữ liệu không hợp lệ. Hãy khởi động lại backend rồi thử lại.');
  return data;
};
