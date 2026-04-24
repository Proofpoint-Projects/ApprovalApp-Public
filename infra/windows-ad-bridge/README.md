Use esta ponte somente se voce realmente precisar manipular grupo do Active Directory on-prem a partir do portal Linux.

Recomendacao operacional:
1. Hospede este script em um Windows Server de gerenciamento interno.
2. Execute com uma conta de servico com privilegio minimo apenas no grupo temp-approved.
3. Restrinja firewall para aceitar chamadas somente do host do worker.
4. Coloque TLS/mTLS na frente com IIS/ARR ou um reverse proxy interno.
5. Nunca exponha este listener diretamente na internet.

Exemplo de execucao:
pwsh -File .\ad-bridge.ps1 -ListenPrefix http://+:8085/ -ApiKey "troque-isto"
