import api from './api';

const documentService = {
  listeModeles: () => api.get('/etudiant/modeles'),

  telechargerModele: (fichier) =>
    api.get(`/etudiant/modeles/${fichier}`, { responseType: 'blob' }),

  uploadDocument: (typeDocument, fichier) => {
    const formData = new FormData();
    formData.append('typeDocument', typeDocument);
    formData.append('fichier', fichier);
    return api.post('/etudiant/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  uploadCloture: (typeDocument, fichier) => {
    const formData = new FormData();
    formData.append('typeDocument', typeDocument);
    formData.append('fichier', fichier);
    return api.post('/etudiant/documents/cloture', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  importerExcel: (fichier) => {
    const formData = new FormData();
    formData.append('fichier', fichier);
    return api.post('/admin/import-excel', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Admin — liste des modèles avec statut
  listeModelesAdmin: () =>
  api.get('/admin/modeles-documents'),

  // Admin — upload d'un modèle
  uploadModele: (typeDocument, fichier) => {
    const formData = new FormData();
    formData.append('typeDocument', typeDocument);
    formData.append('fichier', fichier);
    return api.post('/admin/modeles-documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Soumettre la correction de documents à l'admin
  validerCorrectionDocuments: () => api.post('/etudiant/documents/valider-correction'),
};

export default documentService;