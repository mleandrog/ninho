# Título da Diretiva (Ex: Coletar Dados de Vendas)

## Objetivo
Descreva claramente o que deve ser alcançado com esta diretiva.
Ex: Extrair dados de vendas do último mês e gerar um relatório CSV.

## Inputs
- O que é necessário para começar? (Ex: URL, credenciais, parâmetros de data)

## Ferramentas / Scripts
- `execution/exemplo.py`: Script principal para realizar a tarefa.

## Processo
1. Verificar se as credenciais estão configuradas no `.env`.
2. Executar o script `execution/exemplo.py`.
3. Validar se o arquivo CSV foi gerado em `.tmp/`.

## Saída Esperada
- Arquivo: `.tmp/vendas_2023_10.csv`
- Formato: CSV com colunas Data, Produto, Valor.

## Casos de Borda e Erros Comuns
- Se a API retornar erro 429 (Rate Limit), aguardar 60 segundos e tentar novamente.
- Se o arquivo de saída estiver vazio, verificar logs de conexão.
