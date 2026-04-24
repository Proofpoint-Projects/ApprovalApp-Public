import Swal from 'sweetalert2';

type ConfirmApprovalOptions = {
  count?: number;
  requireJustification?: boolean;
  initialValue?: string;
};

type ConfirmApprovalResult =
  | { confirmed: false; justification: '' }
  | { confirmed: true; justification: string }; 

type ConfirmAlertOptions = {
  title?: string;
  text?: string;
  confirmText?: string;
  cancelText?: string;
};

const sharedSwalOptions = {
  background: 'linear-gradient(180deg, #071a4a 0%, #08142f 100%)',
  color: '#e5eefc',
  backdrop: 'rgba(2, 6, 23, 0.78)',
  draggable: false,
  customClass: {
    popup: 'portal-swal-popup',
    title: 'portal-swal-title',
    htmlContainer: 'portal-swal-html',
    actions: 'portal-swal-actions',
    input: 'portal-swal-textarea',
    validationMessage: 'portal-swal-validation'
  },
  buttonsStyling: true
} as const;

export async function showApproveConfirmAlert(
  options?: ConfirmApprovalOptions
): Promise<ConfirmApprovalResult> {
  const count = options?.count ?? 1;
  const requireJustification = options?.requireJustification ?? true;

  const result = await Swal.fire({
    ...sharedSwalOptions,
    title: 'Confirmar aprovação',
    text:
      count === 1
        ? 'Você tem certeza que quer aprovar esta mensagem?'
        : 'Você tem certeza que quer aprovar essas mensagens?',
    icon: 'question',
    iconColor: '#f59e0b',
    input: 'textarea',
    inputLabel: 'Justificativa',
    inputPlaceholder: 'Digite a justificativa da aprovação...',
    inputValue: options?.initialValue || '',
    inputAttributes: {
      'aria-label': 'Digite a justificativa da aprovação'
    },
    showCancelButton: true,
    confirmButtonText: 'Sim, aprovar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#75a9ff',
    cancelButtonColor: '#7f1d1d',
    reverseButtons: true,
    preConfirm: (value) => {
      const justification = String(value || '').trim();

      if (requireJustification && !justification) {
        Swal.showValidationMessage('A justificativa é obrigatória.');
        return;
      }

      return justification;
    },
    allowOutsideClick: () => !Swal.isLoading()
  });

  if (!result.isConfirmed) {
    return { confirmed: false, justification: '' };
  }

  return {
    confirmed: true,
    justification: String(result.value || '').trim()
  };
}

export async function showSuccessAlert(title: string, text?: string) {
  return Swal.fire({
    ...sharedSwalOptions,
    icon: 'success',
    iconColor: '#00ff2a',
    title,
    text,
    confirmButtonText: 'OK',
    confirmButtonColor: '#75a9ff'
  });
}

export async function showErrorAlert(title: string, text?: string) {
  return Swal.fire({
    ...sharedSwalOptions,
    icon: 'error',
    iconColor: '#f87171',
    title,
    text,
    confirmButtonText: 'Fechar',
    confirmButtonColor: '#7f1d1d'
  });
}

export async function showConfirmAlert(options?: ConfirmAlertOptions) {
  const result = await Swal.fire({
    ...sharedSwalOptions,
    title: options?.title || 'Tem certeza?',
    text: options?.text || 'Você não poderá desfazer esta ação.',
    icon: 'warning',
    iconColor: '#f59e0b',
    showCancelButton: true,
    confirmButtonText: options?.confirmText || 'Sim, continuar',
    cancelButtonText: options?.cancelText || 'Cancelar',
    confirmButtonColor: '#75a9ff',
    cancelButtonColor: '#7f1d1d',
    reverseButtons: true
  });

  return result.isConfirmed;
}