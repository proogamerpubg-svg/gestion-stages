import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import stageService from '../../services/stageService';

const EncadrantProfil = () => {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    stageService.mesEtudiants()
      .then(res => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <Layout title="Mon profil">
      <div className="text-center py-5">
        <div className="spinner-border" style={{ color: '#003366' }} />
      </div>
    </Layout>
  );

  const encadrant = data?.encadrant;

  return (
    <Layout title="Mon profil">
      <div style={{ maxWidth: 600 }}>
        <div className="card">
          <div className="card-header-custom">
            <i className="bi bi-person-badge"></i> Informations personnelles
          </div>
          <div className="card-body" style={{ fontSize: '0.88rem' }}>
            {encadrant ? (
              <table className="table table-sm table-borderless mb-0">
                <tbody>
                  <tr>
                    <td className="text-muted" style={{ width: '40%' }}>Nom complet</td>
                    <td><strong>{encadrant.nomComplet}</strong></td>
                  </tr>
                  <tr>
                    <td className="text-muted">Email institutionnel</td>
                    <td>{encadrant.emailInstitutionnel}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">Téléphone</td>
                    <td>{encadrant.telephone}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">Département</td>
                    <td>{encadrant.departement}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">Filière</td>
                    <td>{encadrant.filiere}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">Étudiants encadrés</td>
                    <td><strong>{data?.etudiants?.length || 0}</strong></td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <p className="text-muted">Données non disponibles.</p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default EncadrantProfil;