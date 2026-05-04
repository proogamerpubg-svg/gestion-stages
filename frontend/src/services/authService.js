import api from './api';

const authService = {
  login: async (login, motDePasse) => {
    const res = await api.post('/login', { login, motDePasse });
    // Stocker token et user en localStorage
    localStorage.setItem('encg_token', res.data.token);
    localStorage.setItem('encg_user', JSON.stringify(res.data.user));
    return res.data;
  },

  logout: async () => {
    try {
      await api.post('/logout');
    } finally {
      localStorage.removeItem('encg_token');
      localStorage.removeItem('encg_user');
    }
  },

  me: async () => {
    const res = await api.get('/me');
    return res.data;
  },

  forgotPassword: async (login) => {
    const res = await api.post('/forgot-password', { login });
    return res.data;
  },

  getCurrentUser: () => {
    const user = localStorage.getItem('encg_user');
    return user ? JSON.parse(user) : null;
  },

  getToken: () => localStorage.getItem('encg_token'),

  isAuthenticated: () => !!localStorage.getItem('encg_token'),
};

export default authService;
