# Portal de aprovacoes de quarentena, Endpoint, ITM e DLP

Projeto de referencia completo para hospedar em Linux com:
- Frontend em Next.js
- Backend em NestJS
- PostgreSQL
- Redis + BullMQ
- SAML com Microsoft Entra ID
- nginx na frente
- Cloudflare no DNS / proxy
- Tokens bearer da Proofpoint criptografados em repouso
- Auditoria administrativa
- Webhooks para Endpoint, ITM e DLP
- Job para grupo `temp-approved` via Entra ID ou AD bridge

> Importante: na parte de e-mail/quarentena, os contratos dos endpoints da Proofpoint foram deixados como adaptadores de exemplo. O modo `mock` ja funciona para desenvolver a UI e a logica de aprovacao. Ao integrar no tenant real, ajuste os paths e o payload exato do fornecedor.

---

## 1. Arquitetura

### Componentes
- `apps/web`: Next.js App Router
- `apps/api`: NestJS + SAML + auditoria + webhooks + API
- `apps/worker`: jobs para aplicar e revogar acesso temporario
- `postgres`: persistencia
- `redis`: fila e delayed jobs
- `nginx`: reverse proxy TLS e roteamento

### Fluxos principais
1. Usuario acessa `/login`
2. Login redireciona para Entra ID via SAML
3. Entra posta o assertion em `/api/auth/saml/acs`
4. Backend cria sessao HTTP-only
5. Frontend consome `/api/...`
6. Endpoint/ITM/DLP enviam webhooks para `/api/webhooks/...`
7. Aprovador aprova ou nega
8. Worker adiciona ou remove o usuario do grupo `temp-approved`
9. Tudo vira trilha de auditoria em `/dashboard/audit`

---

## 2. Seguranca aplicada aos tokens bearer da Proofpoint

### Como o projeto armazena os tokens
- O token bearer **nao** fica em texto puro no banco.
- O valor e criptografado com **AES-256-GCM**.
- A chave mestra **nao** fica no banco.
- A chave mestra fica em arquivo secreto montado no container:
  - `secrets/app_master_keys.json`
- O banco guarda apenas:
  - `ciphertext`
  - `iv`
  - `authTag`
  - `keyVersion`
  - `fingerprintSha256`
  - `tokenLast4`
- O frontend **nunca** recebe o token completo depois de salvo.
- Rotacao de token gera auditoria.
- Desativacao gera auditoria.

### Formato do arquivo de chaves
```json
{
  "v1": "BASE64_32_BYTES"
}
```

### Gerando a chave mestra
```bash
./scripts/generate-master-key.sh
```

### Regras operacionais recomendadas
- Nunca commitar `secrets/` no Git.
- Rotacionar `APP_MASTER_KEYS_FILE` por versao.
- Manter no arquivo apenas a chave atual e chaves antigas enquanto houver segredos antigos ainda nao recriptografados.
- Fazer backup do banco e das chaves **separadamente**.
- Dar acesso a pagina de tokens somente para `ADMIN`.
- Nunca logar header `Authorization`.

---

## 3. Estrutura do repositório

```text
quarantine-approval-portal/
  apps/
    api/
    web/
    worker/
  infra/
    nginx/
    systemd/
    windows-ad-bridge/
  scripts/
  secrets/
  docker-compose.yml
  .env.example
  README-PTBR.md
```

---

## 4. Subindo localmente ou no servidor Linux

### 4.1. Preparacao do host
No servidor Linux instale:
- Docker Engine
- Docker Compose plugin
- Git
- OpenSSL

### 4.2. Copie e edite variaveis
```bash
cp .env.example .env
```

Revise pelo menos:
- `APP_URL`
- `WEB_ORIGIN`
- `COOKIE_DOMAIN`
- `DATABASE_URL`
- `SESSION_SECRET`
- `SAML_ENTRY_POINT`
- `SAML_ISSUER`
- `SAML_CALLBACK_URL`
- `SAML_ADMIN_GROUP_IDS`
- `SAML_APPROVER_GROUP_IDS`
- `WEBHOOK_SHARED_SECRET`
- `GROUP_MEMBERSHIP_MODE`
- `ENTRA_*`
- `TEMP_APPROVED_DURATION_MINUTES`

### 4.3. Crie os arquivos secretos
Crie os seguintes arquivos em `./secrets`:
- `app_master_keys.json`
- `entra_idp_signing_cert.pem`
- `entra_client_secret.txt`
- `ad_bridge_api_key.txt` (so se usar AD bridge)

### 4.4. Gere a chave mestra
```bash
./scripts/generate-master-key.sh
```

### 4.5. Build e start
```bash
docker compose up -d --build
```

### 4.6. Execute migrations e seed
```bash
docker compose exec api npx prisma migrate deploy
docker compose exec api npx prisma db seed
```

---

## 5. Configuracao do Microsoft Entra ID para SAML

## 5.1. Crie a aplicacao Enterprise
No portal do Entra:
1. Entre em **Enterprise Applications**
2. **New application**
3. **Create your own application**
4. Nome sugerido: `Approval Portal`
5. Escolha integracao SAML

### 5.2. Configure SSO SAML
Use:
- **Identifier (Entity ID)**: valor de `SAML_ISSUER`
- **Reply URL (ACS)**: valor de `SAML_CALLBACK_URL`
- **Sign on URL**: `https://portal.example.com/login`
- **Relay state**: deixe vazio
- **Logout URL**: opcional

### 5.3. Claims recomendados
Em **User Attributes & Claims**, mantenha pelo menos:
- email / mail
- display name / name
- givenname
- surname
- groups

### 5.4. Claims de grupo
Crie dois grupos no Entra e atribua ao app:
- `approval-portal-admins`
- `approval-portal-approvers`

Depois configure a emissao de **group object IDs** no token SAML e filtre para apenas os grupos atribuidos ao app.

Preencha o `.env` com os Object IDs:
- `SAML_ADMIN_GROUP_IDS`
- `SAML_APPROVER_GROUP_IDS`

### 5.5. User assignment required
Marque **User assignment required = Yes** para bloquear acesso acidental.

### 5.6. Certificado do Entra
Baixe o certificado de assinatura SAML do app e salve em:
```text
./secrets/entra_idp_signing_cert.pem
```

---

## 6. Configuracao do Entra para o worker mexer no grupo temp-approved

Se voce for usar **ENTRA** como provider de membership:

### 6.1. App registration separada para automacao
Crie um App Registration dedicado, por exemplo:
- `approval-portal-worker`

### 6.2. Client secret
Crie um client secret e salve em:
```text
./secrets/entra_client_secret.txt
```

### 6.3. Permissoes de Application no Microsoft Graph
Conceda e admin-consent para:
- `GroupMember.ReadWrite.All`
- `User.Read.All`

Se o grupo for **role-assignable**, adicione tambem:
- `RoleManagement.ReadWrite.Directory`

### 6.4. Variaveis
Preencha:
- `ENTRA_TENANT_ID`
- `ENTRA_CLIENT_ID`
- `ENTRA_TEMP_APPROVED_GROUP_ID`

### 6.5. Observacao importante
Use um **Security Group** normal para `temp-approved`, nao um grupo dinamico.

---

## 7. Configuracao opcional para Active Directory on-prem

Se voce realmente precisar mexer no **AD local** a partir do portal Linux, use o modo:
```env
GROUP_MEMBERSHIP_MODE=AD_BRIDGE
```

Nesse modo o worker Linux chama uma pequena ponte HTTP interna em Windows, presente em:
```text
infra/windows-ad-bridge/ad-bridge.ps1
```

### 7.1. Host Windows de gerenciamento
Prepare um Windows Server com:
- RSAT / modulo ActiveDirectory
- conta de servico com privilegio minimo no grupo `temp-approved`
- firewall aceitando somente o host do worker

### 7.2. Executar a ponte
Exemplo:
```powershell
pwsh -File .\ad-bridge.ps1 -ListenPrefix http://+:8085/ -ApiKey "troque-isto"
```

### 7.3. Variaveis no portal
```env
AD_BRIDGE_URL=http://win-mgmt.internal:8085
```

Salve a API key em:
```text
./secrets/ad_bridge_api_key.txt
```

---

## 8. Configuracao do Cloudflare

### 8.1. DNS
Crie um registro:
- `A portal.example.com -> IP_DO_SERVIDOR`
- deixe **Proxied** ligado (nuvem laranja)

### 8.2. SSL/TLS
Use:
- **Full (strict)**

### 8.3. Certificado do origin
Voce tem duas opcoes:
1. **Cloudflare Origin CA** se o host sempre ficar atras do proxy Cloudflare
2. **Certificado publico** se voce precisa acesso direto ao origin

Coloque os arquivos em:
```text
infra/nginx/certs/fullchain.pem
infra/nginx/certs/privkey.pem
```

### 8.4. Cache rules
Crie regra para bypass em:
- `/api/*`
- `/login`
- `/dashboard/*`

### 8.5. WAF e rate limit
Crie regras pelo menos para:
- `/api/auth/saml/login`
- `/api/auth/saml/acs`
- `/api/webhooks/*`

### 8.6. Protecao do origin
Se o trafego vier somente da Cloudflare, habilite tambem:
- Authenticated Origin Pulls
- firewall do servidor aceitando 80/443 apenas da Cloudflare ou do seu bastion

---

## 9. Configuracao do nginx

O arquivo principal esta em:
```text
infra/nginx/nginx.conf
```

O vhost esta em:
```text
infra/nginx/app.conf
```

### O que ele faz
- redireciona 80 -> 443
- termina TLS
- manda `/api/*` para o NestJS
- manda `/` para o Next.js
- aplica security headers
- aplica rate limit em login, API e webhook

---

## 10. Producao com systemd

Se voce quiser iniciar tudo no boot:
1. copie o projeto para `/opt/quarantine-approval-portal`
2. copie `infra/systemd/approval-portal.service` para `/etc/systemd/system/`
3. habilite:
```bash
sudo systemctl daemon-reload
sudo systemctl enable approval-portal.service
sudo systemctl start approval-portal.service
```

---

## 11. Configurando a pagina de tokens Proofpoint

A tela esta em:
```text
/dashboard/settings/proofpoint-tokens
```

### Integracoes sugeridas
Cadastre pelo menos estas chaves:
- `email-quarantine-api`
- `endpoint-api`
- `itm-api`
- `dlp-api`

### Campos
- `integrationKey`
- `displayName`
- `baseUrl`
- `bearerToken`
- `notes`

### Comportamento de seguranca
- token completo so aparece no momento da digitacao
- depois de salvo, apenas `************1234`
- hash SHA-256 para identificacao e auditoria
- rotacao manual sem expor token antigo

---

## 12. Webhooks

Endpoints expostos:
- `POST /api/webhooks/endpoint-itm`
- `POST /api/webhooks/dlp`

### Assinatura HMAC do exemplo
Cabecalhos esperados:
- `x-proofpoint-event-id`
- `x-proofpoint-timestamp`
- `x-proofpoint-signature`

Formato calculado:
```text
sha256 = HMAC_SHA256(secret, timestamp + '.' + rawBody)
```

### Teste de exemplo
```bash
./scripts/sample-webhook.sh https://portal.example.com
```

> Se o formato real do seu webhook Proofpoint for diferente, ajuste apenas `WebhooksService`.

---

## 13. O que a aplicacao entrega

### Aprovador
- login SAML
- ver fila de quarentena por e-mail
- pre-visualizar mensagem e policy
- aprovar uma a uma
- aprovar em lote
- ver fila Endpoint / ITM / DLP
- aprovar ou negar cada bloqueio

### Administrador
- ver trilha de auditoria
- filtrar por usuario
- ver pendencias
- cadastrar/rotacionar/desativar tokens Proofpoint

### Worker
- aplica `temp-approved`
- agenda revogacao automatica
- registra auditoria de apply/remove

---

## 14. Ajustes que voce provavelmente fara no tenant real

1. Mapear os endpoints reais da Proofpoint no `ProofpointEmailAdapter`
2. Ajustar o contrato real do webhook no `WebhooksService`
3. Ajustar claims SAML especificos do seu tenant
4. Ajustar politicas de retencao e exportacao de auditoria
5. Definir SLA para duracao do `temp-approved`
6. Enviar notificacoes de aprovacao/negacao por e-mail ou Teams

---

## 15. Checklist final de hardening

- [ ] `Full (strict)` ligado na Cloudflare
- [ ] certificado do origin instalado
- [ ] proxy ligado no DNS
- [ ] AOP habilitado se o origin nao precisar acesso publico direto
- [ ] grupos SAML filtrados so para grupos do app
- [ ] `User assignment required` ligado
- [ ] `SESSION_SECRET` forte
- [ ] `WEBHOOK_SHARED_SECRET` forte
- [ ] `APP_MASTER_KEYS_FILE` fora do Git
- [ ] segredo do Graph em arquivo secreto
- [ ] tokens Proofpoint cadastrados pela UI admin
- [ ] backup do Postgres + backup das chaves mestras
- [ ] observabilidade dos containers e do nginx

