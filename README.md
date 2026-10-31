# Moeda

Protótipo de conversor em português, com tema claro/escuro, catálogo dinâmico e taxas reais do Frankfurter v2. HTML, CSS e JavaScript sem dependências de runtime.

## Executar

Requer Node.js 20+ para executar os testes. Para servir o app localmente, na pasta do projeto rode:

\`\`\`powershell
py -m http.server 8000
\`\`\`

Abra http://localhost:8000. Servir localmente evita restrições que alguns navegadores aplicam a chamadas da API quando a página é aberta como arquivo.

Execute os testes:

\`\`\`powershell
npm.cmd test
\`\`\`

## Estrutura

- \`index.html\` e \`styles.css\`: interface responsiva, acessível por teclado e com alternância persistida de tema.
- \`app.js\`: estados da interface, catálogo pesquisável, favoritos, histórico e categorias.
- \`converter-core.js\`: cálculo decimal e inversão de moedas, sem dependência de DOM.
- \`provider.js\`: integração intercambiável com a API e cache local.
- \`converter-core.test.js\`: testes de cálculo, validação e inversão.

## API, cobertura e limitações

O catálogo usa \`GET https://api.frankfurter.dev/v2/currencies\`, que retorna moedas ativas por padrão; códigos históricos não são carregados. A opção \`scope=all\` inclui códigos legados, mas não é usada nesta versão. A documentação do Frankfurter informa cobertura de 228 moedas e dados de 106 bancos centrais e fontes oficiais, com taxas de referência atualizadas periodicamente. A disponibilidade de cada par varia. A API pública não exige chave e não publica cotas diárias ou mensais, mas aplica rate limiting contra abuso. As taxas não são cotações de negociação em tempo real.

As taxas são consultadas por \`GET /v2/rate/{base}/{quote}\`; a resposta, o par, a taxa e a data são validados antes do cálculo. O app mostra a data efetiva da taxa e o horário local em que o navegador consultou a API. O cache local dura 12 horas para taxas e 7 dias para o catálogo; “Atualizar taxa” ignora o cache da taxa. Pares sem cotação válida e falhas de rede mostram erro. Não há valores simulados; a interface identifica explicitamente esse comportamento. Conversões da moeda para ela mesma usam a taxa identidade e deixam claro que não consultaram o provedor.

O catálogo padrão contém moedas ativas. BTC, BCH, ETH, LTC e XRP, se retornados pela API, ficam numa seção separada de ativos digitais. A documentação informa que essas cotações têm cobertura limitada, vêm de uma única fonte e são publicadas em dias úteis; não são preços intradiários. Códigos históricos ficam fora desta versão. Para adicionar outras classes de ativos, confirme primeiro que a fonte cobre esses ativos e mostre-os em uma categoria separada.

O cálculo usa inteiros de precisão arbitrária para multiplicar decimais e arredonda conforme as casas da moeda de destino. Casas e símbolos usam \`Intl\`; o idioma está configurado como \`pt-BR\` em \`app.js\`. O tema inicial segue a preferência do sistema, e a escolha manual fica salva no navegador.

## Referências

- [Documentação do Frankfurter](https://frankfurter.dev/)
- [Especificação OpenAPI v2](https://api.frankfurter.dev/v2/openapi.json)
