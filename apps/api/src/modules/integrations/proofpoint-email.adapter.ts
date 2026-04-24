import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { IntegrationsService } from './integrations.service';

export interface QuarantineEmailItem {
  id: string;
  recipientEmail: string;
  sender: string;
  subject: string;
  policyName: string;
  policyReason: string;
  receivedAt: string;
  previewText: string;
}

@Injectable()
export class ProofpointEmailAdapter {
  constructor(private readonly integrationsService: IntegrationsService) {}

  async listMessagesForUser(userEmail: string): Promise<QuarantineEmailItem[]> {
    if (process.env.PROOFPOINT_EMAIL_MODE === 'mock') {
      return [
        {
          id: 'mock-mail-001',
          recipientEmail: userEmail,
          sender: 'financeiro@fornecedor-exemplo.com',
          subject: 'Fatura pendente de aprovacao',
          policyName: 'Suspicious Attachment',
          policyReason: 'Arquivo ZIP protegido por senha',
          receivedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          previewText: 'Segue documento solicitado. Senha: 1234.'
        },
        {
          id: 'mock-mail-002',
          recipientEmail: userEmail,
          sender: 'rh@empresa-exemplo.com',
          subject: 'Atualizacao de beneficios',
          policyName: 'Keyword Monitor',
          policyReason: 'Detectada palavra-chave sensivel em anexo',
          receivedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          previewText: 'Favor revisar o PDF em anexo antes de seguir com a entrega.'
        }
      ];
    }

    const integrationKey = process.env.PROOFPOINT_EMAIL_INTEGRATION_KEY || 'email-quarantine-api';
    const secret = await this.integrationsService.resolveProofpointSecret(integrationKey);

    const response = await axios.get(`${secret.baseUrl}/v1/quarantine/messages`, {
      params: { userEmail },
      headers: {
        Authorization: `Bearer ${secret.bearerToken}`,
        Accept: 'application/json'
      },
      timeout: 15000
    });

    return response.data.items as QuarantineEmailItem[];
  }

  async getMessageById(userEmail: string, messageId: string): Promise<QuarantineEmailItem> {
    if (process.env.PROOFPOINT_EMAIL_MODE === 'mock') {
      const items = await this.listMessagesForUser(userEmail);
      const item = items.find((entry) => entry.id === messageId);
      if (!item) {
        throw new Error('Mensagem nao encontrada no modo mock.');
      }
      return item;
    }

    const integrationKey = process.env.PROOFPOINT_EMAIL_INTEGRATION_KEY || 'email-quarantine-api';
    const secret = await this.integrationsService.resolveProofpointSecret(integrationKey);
    const response = await axios.get(`${secret.baseUrl}/v1/quarantine/messages/${messageId}`, {
      headers: {
        Authorization: `Bearer ${secret.bearerToken}`,
        Accept: 'application/json'
      },
      timeout: 15000
    });

    return response.data as QuarantineEmailItem;
  }

  async approveMessage(messageId: string): Promise<{ ok: true; providerResponse?: unknown }> {
    if (process.env.PROOFPOINT_EMAIL_MODE === 'mock') {
      return { ok: true };
    }

    const integrationKey = process.env.PROOFPOINT_EMAIL_INTEGRATION_KEY || 'email-quarantine-api';
    const secret = await this.integrationsService.resolveProofpointSecret(integrationKey);
    const response = await axios.post(
      `${secret.baseUrl}/v1/quarantine/messages/${messageId}/release`,
      {},
      {
        headers: {
          Authorization: `Bearer ${secret.bearerToken}`,
          Accept: 'application/json'
        },
        timeout: 15000
      }
    );

    return { ok: true, providerResponse: response.data };
  }
}
