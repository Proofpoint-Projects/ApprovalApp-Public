import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ProofpointAuthService } from './proofpoint-auth.service';

@Injectable()
export class ProofpointRulerService {
  private readonly baseUrl = 'https://app.us-east-1-op1.op.analyze.proofpoint.com/v2/apis';

  constructor(private readonly proofpointAuthService: ProofpointAuthService) {}

  private async authHeaders() {
    const token = await this.proofpointAuthService.getValidBearerToken(false);
    return {
      accept: 'application/json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  private async parseJson(response: Response) {
    const text = await response.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return { raw: text };
    }
  }

  async getRuleWithPredicate(ruleId: string) {
    const headers = await this.authHeaders();
    const url = `${this.baseUrl}/ruler/rules/${encodeURIComponent(ruleId)}?includes=details,predicate`;

    console.log('[PFPT][GET RULE]', JSON.stringify({ url, ruleId }, null, 2));
    const response = await fetch(url, { method: 'GET', headers });
    const json = await this.parseJson(response);

    if (!response.ok) {
      throw new InternalServerErrorException(
        `Erro ao buscar rule ${ruleId}: ${response.status} ${JSON.stringify(json)}`
      );
    }

    return json;
  }

  async getPredicateWithDefinition(predicateId: string) {
    const headers = await this.authHeaders();
    const url = `${this.baseUrl}/depot/predicates/${encodeURIComponent(predicateId)}?includes=definition`;

    console.log('[PFPT][GET PREDICATE]', JSON.stringify({ url, predicateId }, null, 2));
    const response = await fetch(url, { method: 'GET', headers });
    const json = await this.parseJson(response);

    if (!response.ok) {
      throw new InternalServerErrorException(
        `Erro ao buscar predicate ${predicateId}: ${response.status} ${JSON.stringify(json)}`
      );
    }

    return json;
  }

  async patchPredicateDefinition(predicateId: string, definition: any) {
    const headers = await this.authHeaders();
    const url = `${this.baseUrl}/depot/predicates/${encodeURIComponent(predicateId)}?consistency=read&timeout=5000`;

    console.log('[PFPT][PATCH PREDICATE]', JSON.stringify({ url, predicateId, definition }, null, 2));
    const response = await fetch(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ definition })
    });

    const json = await this.parseJson(response);

    if (!response.ok) {
      throw new InternalServerErrorException(
        `Erro ao fazer patch do predicate ${predicateId}: ${response.status} ${JSON.stringify(json)}`
      );
    }

    return json;
  }

  private findUserControlBlock(definition: any) {
    const andList = Array.isArray(definition?.$and) ? definition.$and : [];

    for (const item of andList) {
      const values = item?.$not?.$stringIn?.['{{resource.user.name}}'];
      if (Array.isArray(values)) {
        return { block: item, values };
      }
    }

    return null;
  }


  async addUsernameToMultipleRulePredicates(params: {
    ruleIds: string[];
    username: string;
    controlUsername: string;
  }) {
    const uniqueRuleIds = Array.from(
      new Set(
        (Array.isArray(params.ruleIds) ? params.ruleIds : [])
          .map((id) => String(id || '').trim())
          .filter(Boolean)
      )
    );

    if (!uniqueRuleIds.length) {
      throw new InternalServerErrorException('Nenhum ruleId informado para aprovacao endpoint.');
    }

    const results = [];

    for (const ruleId of uniqueRuleIds) {
      const result = await this.addUsernameToRulePredicate({
        ruleId,
        username: params.username,
        controlUsername: params.controlUsername
      });

      results.push(result);
    }

    return {
      ok: true,
      totalRules: uniqueRuleIds.length,
      results
    };
  }

  async addUsernameToRulePredicate(params: {
    ruleId: string;
    username: string;
    controlUsername: string;
  }) {
    const ruleJson = await this.getRuleWithPredicate(params.ruleId);

    const predicateId =
      ruleJson?.predicate?.id ||
      ruleJson?.data?.predicate?.id ||
      ruleJson?.data?.predicate?.predicate?.id ||
      null;

    const ruleDetails =
      ruleJson?.details ||
      ruleJson?.data?.details ||
      ruleJson?.rule?.details ||
      null;

    if (!predicateId) {
      throw new InternalServerErrorException(`Rule ${params.ruleId} nao retornou predicate.id`);
    }

    const predicateJson = await this.getPredicateWithDefinition(predicateId);

    const definition =
      predicateJson?.definition ||
      predicateJson?.data?.definition ||
      predicateJson?.data?.predicate?.definition ||
      null;

    if (!definition) {
      throw new InternalServerErrorException(`Predicate ${predicateId} nao retornou definition`);
    }

    const controlBlock = this.findUserControlBlock(definition);
    if (!controlBlock) {
      throw new InternalServerErrorException(
        'Predicate sem bloco $not.$stringIn["{{resource.user.name}}"].'
      );
    }

    if (!controlBlock.values.includes(params.controlUsername)) {
      throw new InternalServerErrorException(
        `Predicate sem usuario de controle ${params.controlUsername}. Configuracao invalida da regra.`
      );
    }

    const username = String(params.username || '').trim();
    if (!username) {
      throw new InternalServerErrorException('Username vazio para aprovacao endpoint.');
    }

    const alreadyPresent = controlBlock.values.includes(username);
    if (!alreadyPresent) {
      controlBlock.values.push(username);
    }

    console.log('[PATCH PREDICATE]', JSON.stringify({ predicateId, definition }, null, 2));
    const patchResult = await this.patchPredicateDefinition(predicateId, definition);

    return {
      ok: true,
      ruleId: params.ruleId,
      predicateId,
      username,
      alreadyPresent,
      ruleDetails,
      patchResult
    };
  }

  async removeUsernameFromPredicate(params: {
    predicateId: string;
    username: string;
    controlUsername: string;
  }) {
    const predicateJson = await this.getPredicateWithDefinition(params.predicateId);

    const definition =
      predicateJson?.definition ||
      predicateJson?.data?.definition ||
      predicateJson?.data?.predicate?.definition ||
      null;

    if (!definition) {
      throw new InternalServerErrorException(
        `Predicate ${params.predicateId} nao retornou definition`
      );
    }

    const controlBlock = this.findUserControlBlock(definition);
    if (!controlBlock) {
      throw new InternalServerErrorException(
        'Predicate sem bloco $not.$stringIn["{{resource.user.name}}"].'
      );
    }

    if (!controlBlock.values.includes(params.controlUsername)) {
      throw new InternalServerErrorException(
        `Predicate sem usuario de controle ${params.controlUsername}.`
      );
    }

    const username = String(params.username || '').trim();
    controlBlock.block.$not.$stringIn['{{resource.user.name}}'] =
      controlBlock.values.filter((value: string) => value !== username);

    const patchResult = await this.patchPredicateDefinition(params.predicateId, definition);

    return {
      ok: true,
      predicateId: params.predicateId,
      username,
      patchResult
    };
  }
}