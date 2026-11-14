# Robô do Google Agenda (Mural de Fretes)

Quem recebe cada aviso (entrega nova, concluída, alterada, problema por motivo), por Agenda e/ou e-mail na hora,
o lembrete e os horários dos turnos: tudo no painel → Ajustes → "Avisos no Google Agenda". O robô lê de lá.
- Dia e horário pelo turno: Manhã 8h–12h, Tarde 13h–18h, Qualquer turno 8h–18h, "Depois das 15:30" 15h30–16h30.
- Mudou dia/turno no mural → o evento muda. Entregue → ✅ e verde. Prioridade → ⬆ e vermelho. Apagada → some (1x por dia, 6h).
- Roda na conta Google do Bruno, a cada 5 minutos, de graça. Só LÊ o mural; não muda nada nele.

## Passo a passo (uma vez só, de preferência no computador)
1. Publicar as regras novas do Firestore (o texto completo está em `firestore.rules`).
2. Painel → Ajustes → "Avisos no Google Agenda": pôr o Gmail de cada um → Salvar.
3. Abrir https://script.google.com com a conta brunolemosxd@gmail.com → **Novo projeto**.
4. Apagar o que vier escrito e colar todo o arquivo `Codigo.gs`.
5. Engrenagem (Configurações do projeto) → marcar **Mostrar o arquivo de manifesto "appsscript.json"**.
   Voltar ao Editor, abrir `appsscript.json`, apagar tudo e colar o arquivo `appsscript.json` daqui.
6. Salvar (ícone de disquete). No alto, escolher a função **instalar** e tocar em **Executar**.
7. Autorizar: escolher a conta → "Avançado" → "Acessar (não seguro)" → Permitir.
   (É o aviso normal do Google para scripts feitos por você mesmo.)
8. Pronto. Para desligar: escolher a função **desligar** → Executar.

Os freteiros recebem um convite por e-mail na primeira entrega; se o Agenda deles não mostrar,
em Configurações do Google Agenda → "Adicionar convites à minha agenda" → "De todos".
