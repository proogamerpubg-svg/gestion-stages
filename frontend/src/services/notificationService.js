import api from './api';

const notificationService = {
  index:           () => api.get('/notifications'),
  nonLues:         () => api.get('/notifications/non-lues'),
  marquerLue:      (id) => api.post(`/notifications/${id}/lire`),
  marquerToutesLues: () => api.post('/notifications/lire-tout'),
};

export default notificationService;
