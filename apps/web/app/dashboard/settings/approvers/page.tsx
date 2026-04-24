'use client';

import { useEffect, useMemo, useState } from 'react';
import { showConfirmAlert, showErrorAlert, showSuccessAlert } from '../../../../lib/alerts';
import { mergeStyles, sharedStyles } from '../../../../lib/ui-styles';

type ApproverScopeItem = {
  id: string;
  email: string;
  displayName?: string | null;
  role: 'ADMIN' | 'APPROVER';
  groupsJson?: string[] | null;
  folders: string[];
};

const styles = mergeStyles(sharedStyles, {
  page: {
    display: 'grid',
    gap: 20,
    width: '100%',
    minWidth: 0
  }
});

function roleBadgeStyle(role: 'ADMIN' | 'APPROVER'): React.CSSProperties {
  if (role === 'ADMIN') {
    return {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '6px 10px',
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 800,
      background: 'rgba(124, 58, 237, 0.18)',
      color: '#c4b5fd',
      border: '1px solid rgba(167,139,250,0.35)'
    };
  }

  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    background: 'rgba(37, 99, 235, 0.18)',
    color: '#93c5fd',
    border: '1px solid rgba(96,165,250,0.35)'
  };
}

function folderChipStyle(): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 12px',
    gap: 6,
    borderRadius: 999,
    background: 'rgba(81, 255, 0, 0.73)',
    border: '1px solid rgba(3, 199, 35, 0.62)',
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: 700
  };
}

export default function ApproverScopesPage() {
  const [items, setItems] = useState<ApproverScopeItem[]>([]);
  const [filter, setFilter] = useState('');
  const [selectedEmail, setSelectedEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [messageKind, setMessageKind] = useState<'info' | 'success' | 'error'>('info');
  const [loading, setLoading] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!message) return;

    const timer = window.setTimeout(() => {
      setMessage('');
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    if (!message) return;

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, [message]);

  async function load() {
    setLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/admin/approver-scopes', {
        credentials: 'include'
      });

      const data = await res.json().catch(() => []);

      if (!res.ok) {
        throw new Error(data?.message || 'Erro ao carregar aprovadores.');
      }

      const normalized = Array.isArray(data) ? data : [];
      setItems(normalized);

      const nextDrafts: Record<string, string> = {};
      for (const item of normalized) {
        nextDrafts[item.email] = Array.isArray(item.folders) ? item.folders.join(', ') : '';
      }
      setDrafts(nextDrafts);
    } catch (error: any) {
      setMessage(error?.message || 'Erro ao carregar aprovadores.');
      setMessageKind('error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();

    return items.filter((item) => {
      if (item.role !== 'APPROVER') {
        return false;
      }

      if (!q) {
        return true;
      }

      return [item.email || '', item.displayName || '', item.role || '']
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [items, filter]);

  const selectedItem = useMemo(() => {
    return filtered.find((item) => item.email === selectedEmail) || null;
  }, [filtered, selectedEmail]);

  useEffect(() => {
    if (!selectedEmail) return;
    const stillExists = filtered.some((item) => item.email === selectedEmail);
    if (!stillExists) {
      setSelectedEmail('');
    }
  }, [filtered, selectedEmail]);

  function getFoldersFromDraft(email: string) {
    return String(drafts[email] || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  }

  async function saveConfirmed() {
    if (!selectedItem) return;

    const email = selectedItem.email;
    setSavingEmail(email);
    setMessage('');

    try {
      const folders = getFoldersFromDraft(email);

      const res = await fetch('/api/admin/approver-scopes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          email,
          folders
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || 'Erro ao salvar escopo.');
      }

      const successMessage =
        `Pastas salvas com sucesso para ${selectedItem.displayName || selectedItem.email} (${selectedItem.email}): ${
          folders.length ? folders.join(', ') : 'nenhuma pasta'
        }.`;

      setMessage(successMessage);
      setMessageKind('success');

      await showSuccessAlert('Salvo com sucesso', successMessage);
      await load();
    } catch (error: any) {
      const errorMessage = error?.message || 'Erro ao salvar escopo.';

      setMessage(errorMessage);
      setMessageKind('error');

      await showErrorAlert('Erro ao salvar', errorMessage);
    } finally {
      setSavingEmail(null);
    }
  }

  async function handleSaveClick() {
    if (!selectedItem || savingEmail) return;

    const folders = getFoldersFromDraft(selectedItem.email);
    const confirmed = await showConfirmAlert({
      title: 'Confirmar salvamento',
      text:
        `Confirma salvar as pastas de quarentena para ${selectedItem.displayName || selectedItem.email}? ` +
        `Pastas: ${folders.length ? folders.join(', ') : 'nenhuma pasta'}.`,
      confirmText: 'Sim, salvar',
      cancelText: 'Cancelar'
    });

    if (!confirmed) return;

    await saveConfirmed();
  }

  const selectedFolders = selectedItem ? getFoldersFromDraft(selectedItem.email) : [];

  return (
    <div style={styles.page}>
      <section style={styles.card}>
        <div style={styles.title}>Aprovadores de quarentena</div>
        <div style={styles.subtitle}>
          Defina quais pastas de quarentena cada aprovador pode visualizar e aprovar.
        </div>

        <div style={{ display: 'grid', gap: 14 }}>
          <input
            style={styles.input}
            placeholder="Filtrar por nome, e-mail ou role"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />

          <div style={styles.helper}>
            Busque e selecione um aprovador para editar as pastas permitidas.
          </div>

          {message ? (
            <div
              style={
                messageKind === 'error'
                  ? styles.errorBox
                  : messageKind === 'success'
                  ? styles.successBox
                  : styles.infoBox
              }
            >
              {message}
            </div>
          ) : null}

          <div style={{ display: 'grid', gap: 8 }}>
            <label style={styles.label}>Selecionar aprovador</label>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <select
                value={selectedEmail}
                onChange={(event) => {
                  setSelectedEmail(event.target.value);
                  setMessage('');
                }}
                style={{
                  ...styles.input,
                  marginBottom: 0,
                  cursor: 'pointer',
                  flex: 1,
                  minWidth: 280
                }}
              >
                <option value="">
                  {loading ? 'Carregando aprovadores...' : 'Selecione um aprovador'}
                </option>

                {filtered.map((item) => (
                  <option key={item.id} value={item.email}>
                    {(item.displayName || item.email) + ' — ' + item.email}
                  </option>
                ))}
              </select>

              <button
                type="button"
                style={styles.button}
                onClick={() => {
                  setSelectedEmail('');
                  setMessage('');
                }}
                disabled={!selectedEmail}
              >
                Limpar seleção
              </button>
            </div>

            {!filtered.length && !loading ? (
              <div style={styles.infoBox}>Nenhum aprovador encontrado para o filtro informado.</div>
            ) : null}
          </div>
        </div>

        {selectedItem ? (
          <div style={{ ...styles.innerCard, marginTop: 18, display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div style={styles.innerTitle}>{selectedItem.displayName || selectedItem.email}</div>
              <span style={roleBadgeStyle(selectedItem.role)}>{selectedItem.role}</span>
            </div>

            <div style={styles.kvLine}>
              <span style={styles.kvKey}>E-mail: </span>
              <span style={styles.kvValue}>{selectedItem.email}</span>
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              <label style={styles.label}>Pastas atuais</label>

              {selectedFolders.length ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {selectedFolders.map((folder) => (
                    <span key={folder} style={folderChipStyle()}>
                      {folder}
                    </span>
                  ))}
                </div>
              ) : (
                <div style={styles.infoBox}>Nenhuma pasta configurada para este aprovador.</div>
              )}
            </div>

            <div style={{ marginTop: 4 }}>
              <label style={styles.label}>Editar pastas permitidas</label>

              <textarea
                style={styles.textarea}
                value={drafts[selectedItem.email] || ''}
                onChange={(event) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [selectedItem.email]: event.target.value
                  }))
                }
                placeholder="Ex.: LGPD, Financeiro, RH, Executivos"
              />

              <div style={styles.helper}>
                Separe por vírgula. Depois vamos usar isso para filtrar a listagem do usuário logado.
              </div>
            </div>

            <div style={styles.buttonRow}>
              <button
                type="button"
                style={styles.primaryBtn}
                onClick={() => void handleSaveClick()}
                disabled={savingEmail === selectedItem.email}
              >
                {savingEmail === selectedItem.email ? 'Salvando...' : 'Salvar pastas'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ ...styles.infoBox, marginTop: 18 }}>
            Selecione um aprovador para visualizar e editar as pastas permitidas.
          </div>
        )}
      </section>
    </div>
  );
}