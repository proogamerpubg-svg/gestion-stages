import axios from 'axios';

/**
 * Instance Axios centrale.
 * Toutes les requêtes API passent par cet objet.
 * Le token Bearer est injecté automatiquement depuis localStorage.
 */
const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: false,
});

// ── Intercepteur de requête : injecter le token Bearer ──
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('encg_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Intercepteur de réponse : gérer 401 ──
//
// CORRECTION BUG — Message d'erreur disparaissait après ~1 seconde :
//
// CAUSE RÉELLE :
//   L'intercepteur interceptait le 401 retourné par /api/login (mauvais identifiants)
//   et déclenchait window.location.href = '/login' → rechargement complet de la page
//   → état React réinitialisé → champs vidés + message d'erreur effacé.
//   Tout ça en ~1 seconde, donnant l'impression que le message "disparaissait".
//
// SOLUTION :
//   Exclure la route /login du traitement automatique du 401.
//   Un 401 sur /login = mauvais identifiants → réponse normale, pas une session expirée.
//   Un 401 sur toute autre route = token expiré/invalide → déconnexion automatique.
//
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status  = error.response?.status;
    const url     = error.config?.url || '';

    // Ne pas rediriger si on est sur la page de login (401 = mauvais identifiants)
    const estRouteLogin = url.includes('/login') || url.includes('/forgot-password');

    if (status === 401 && !estRouteLogin) {
      // Token expiré ou invalide → déconnexion automatique + redirection
      localStorage.removeItem('encg_token');
      localStorage.removeItem('encg_user');
      window.location.href = '/login';
    }

    // Toujours propager l'erreur pour que le catch du composant la reçoive
    return Promise.reject(error);
  }
);

export default api;