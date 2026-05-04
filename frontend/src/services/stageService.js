import api from './api';

const stageService = {

  // =========================================================================
  // ÉTUDIANT
  // =========================================================================
  monDossier:       ()      => api.get('/etudiant/dossier'),
  profil:           ()      => api.get('/etudiant/profil'),
  declarer:         (data)  => api.post('/etudiant/stage/declarer', data),
  modifier:         (data)  => api.put('/etudiant/stage/modifier', data),
  saisirJournalMi:  (data)  => api.post('/etudiant/journal/mi-stage', data),
  saisirJournalFin: (data)  => api.post('/etudiant/journal/fin-stage', data),

  // =========================================================================
  // ENCADRANT
  // =========================================================================
  mesEtudiants:         ()                 => api.get('/encadrant/etudiants'),
  voirDossierEnc:       (id)               => api.get(`/encadrant/dossier/${id}`),
  confirmerEncadrement: (id)               => api.post(`/encadrant/dossier/${id}/confirmer`),
  rejeterEncadrement:   (id, motif)        => api.post(`/encadrant/dossier/${id}/rejeter`, { motif }),
  commenterMiStage:     (id, commentaire)  => api.post(`/encadrant/dossier/${id}/commenter-mi`, { commentaire }),
  commenterFinStage:    (id, commentaire)  => api.post(`/encadrant/dossier/${id}/commenter-fin`, { commentaire }),
  avisFinalEncadrant:   (id, avis)         => api.post(`/encadrant/dossier/${id}/avis-final`, { avis }),

  // =========================================================================
  // ADMIN
  // =========================================================================
  listeDossiers:    (params)    => api.get('/admin/dossiers', { params }),
  dossierArchives:  (params)    => api.get('/admin/dossiers/archives', { params }),
  voirDossierAdmin: (id)        => api.get(`/admin/dossier/${id}`),
  valider:          (id)        => api.post(`/admin/dossier/${id}/valider`),
  rejeter:          (id, motif, typeCorrection) => api.post(`/admin/dossier/${id}/rejeter`, { motif, typeCorrection }),
  validerFinal:     (id)        => api.post(`/admin/dossier/${id}/valider-final`),
  archiver:         (id)        => api.post(`/admin/dossier/${id}/archiver`),
  listeEtudiants:   ()          => api.get('/admin/etudiants'),
  listeEncadrants:  ()          => api.get('/admin/encadrants'),

  // =========================================================================
  // CORRECTION DOCUMENTS
  validerCorrectionDocuments: () => api.post('/etudiant/documents/valider-correction'),

  // DIRECTEUR
  // =========================================================================
  listeDossiersDir: (params) => api.get('/directeur/dossiers', { params }),
  voirDossierDir:   (id)     => api.get(`/directeur/dossier/${id}`),
};

export default stageService;