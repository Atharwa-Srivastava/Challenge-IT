// Authentication utilities for Host/Admin accounts

export const getStoredHostAuth = () => {
  try {
    const creds = JSON.parse(localStorage.getItem('kahoot_host_creds') || 'null');
    if (creds && creds.username && creds.password) {
      return {
        username: String(creds.username).trim(),
        password: String(creds.password)
      };
    }
  } catch (e) {}
  return { username: 'Atharwa_sri', password: 'Atharwa@Aug' };
};

export const getHostAuthHeader = () => {
  const creds = getStoredHostAuth();
  return `${creds.username}:${creds.password}`;
};
