import React, { useState, useEffect } from 'react';
import { Settings, Shield, Power, AlertTriangle, Save, Loader2, CheckCircle2 } from 'lucide-react';
import { api } from '../config/api';
import TopBar from '../components/TopBar';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    maintenance_mode: false,
    maintenance_message: '',
    whatsapp_mock_override: true,
  });
  const [adminSecret, setAdminSecret] = useState('');
  const [confirmSecret, setConfirmSecret] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchSettings = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getSettings();
      setSettings(data);
    } catch (err) {
      setError(err.message || 'Impossible de récupérer les paramètres.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    // Si l'utilisateur a rempli le mot de passe, vérifier qu'il correspond
    if (adminSecret && adminSecret !== confirmSecret) {
      setError('Les deux mots de passe admin saisis ne correspondent pas.');
      setSaving(false);
      return;
    }

    try {
      const payload = {
        maintenance_mode: settings.maintenance_mode,
        maintenance_message: settings.maintenance_message,
        whatsapp_mock_override: settings.whatsapp_mock_override,
      };

      if (adminSecret) {
        payload.admin_secret = adminSecret;
      }

      await api.updateSettings(payload);
      setSuccess('Paramètres système enregistrés avec succès.');
      
      // Si le secret admin a été modifié, le sauvegarder dans la session pour ne pas être déconnecté
      if (adminSecret) {
        sessionStorage.setItem('ryx_admin_secret', adminSecret);
        setAdminSecret('');
        setConfirmSecret('');
      }

      // Recharger pour s'assurer d'avoir les données à jour
      await fetchSettings();
    } catch (err) {
      setError(err.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-enter" style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <TopBar title="Paramètres système" subtitle="Gérer le mot de passe admin, la maintenance et les variables globales" />

      {error && (
        <div style={{ margin: '0 32px 16px', padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, color: '#ef4444', fontSize: 13, fontWeight: 500 }}>
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div style={{ margin: '0 32px 16px', padding: '12px 16px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 12, color: '#059669', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={16} />
          <span>{success}</span>
        </div>
      )}

      <div className="page">
        {loading ? (
          <div className="loading-overlay">
            <div className="loading-spinner" />
            <span>Chargement des paramètres...</span>
          </div>
        ) : (
          <form onSubmit={handleSave}>
            <div className="sections-grid">
              
              {/* Sécurité / Mot de passe */}
              <div className="section-card">
                <div className="section-card-header">
                  <Shield size={18} style={{ color: 'var(--accent)' }} />
                  <div>
                    <div className="section-card-title">Sécurité administrateur</div>
                    <div className="section-card-sub">Changer la clé secrète de connexion au dashboard</div>
                  </div>
                </div>
                <div className="section-card-body">
                  <div className="field">
                    <label>Nouveau mot de passe / Secret admin</label>
                    <input
                      type="password"
                      placeholder="Laissez vide pour conserver le mot de passe actuel..."
                      value={adminSecret}
                      onChange={e => setAdminSecret(e.target.value)}
                      minLength={8}
                    />
                  </div>
                  <div className="field">
                    <label>Confirmer le nouveau mot de passe</label>
                    <input
                      type="password"
                      placeholder="Confirmez le nouveau mot de passe..."
                      value={confirmSecret}
                      onChange={e => setConfirmSecret(e.target.value)}
                      minLength={8}
                    />
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8 }}>
                    ℹ️ Changer ce secret mettra à jour la valeur de validation dynamique dans la base de données. Votre session active sera automatiquement mise à jour.
                  </p>
                </div>
              </div>

              {/* Maintenance & Divers */}
              <div className="section-card">
                <div className="section-card-header">
                  <Power size={18} style={{ color: 'var(--accent)' }} />
                  <div>
                    <div className="section-card-title">Maintenance & Mode Dev</div>
                    <div className="section-card-sub">Bloquer temporairement l'application mobile</div>
                  </div>
                </div>
                <div className="section-card-body">
                  {/* Toggle Maintenance Mode */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16, borderBottom: '1px solid var(--border-light)', marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Mode maintenance</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                        Si activé, toutes les requêtes mobiles (hors admin) renverront une erreur 503.
                      </div>
                    </div>
                    <div
                      className={`premium-checkbox ${settings.maintenance_mode ? 'checked' : ''}`}
                      onClick={() => setSettings(prev => ({ ...prev, maintenance_mode: !prev.maintenance_mode }))}
                      style={{ width: 20, height: 20, borderRadius: 6 }}
                    />
                  </div>

                  {/* Maintenance message */}
                  <div className="field" style={{ opacity: settings.maintenance_mode ? 1 : 0.6, transition: 'opacity 0.2s' }}>
                    <label>Message aux utilisateurs</label>
                    <textarea
                      rows={3}
                      placeholder="Ex: Ryx fait peau neuve, nous serons de retour dans quelques minutes..."
                      value={settings.maintenance_message}
                      onChange={e => setSettings(prev => ({ ...prev, maintenance_message: e.target.value }))}
                      disabled={!settings.maintenance_mode}
                    />
                  </div>

                  {/* WhatsApp mock toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>WhatsApp Mock Override</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                        Force la simulation de l'envoi OTP (affiche le code dans les logs du serveur backend).
                      </div>
                    </div>
                    <div
                      className={`premium-checkbox ${settings.whatsapp_mock_override ? 'checked' : ''}`}
                      onClick={() => setSettings(prev => ({ ...prev, whatsapp_mock_override: !prev.whatsapp_mock_override }))}
                      style={{ width: 20, height: 20, borderRadius: 6 }}
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Bottom save bar */}
            <div style={{ marginTop: 28, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
                style={{ padding: '12px 24px', borderRadius: 12, boxShadow: '0 4px 14px var(--accent-glow)', fontSize: 14 }}
              >
                {saving ? (
                  <>
                    <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
                    <span>Sauvegarde en cours...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Enregistrer les paramètres</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
