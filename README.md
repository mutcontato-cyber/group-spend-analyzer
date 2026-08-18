# Crystal Clear Spending

crie para nos um dashboard finaceiro que vai analisar os gastos, ele vai puxar de uma planilha/data base do n8n: https://noiton-n8n.lm218l.easypanel.host/webhook/puxar-planilha - aqui ele vai retornar todos os itens do banco de dados, separado viria nesse estilo:  "[{"Grupo":"Obra casa cristal","Comprovante":true,"data":"2017-07-25","hora":"11:02:35","metodo_pagamento":"Cartão de Crédito","valor":"70.31","recebedor":"IMPERIO DA SERRA COM DE FRUTAS E LEGUMES LTDA","itens":null,"id":1,"createdAt":"2026-08-17T02:09:12.576Z","updatedAt":"2026-08-17T02:09:12.576Z"},{"Grupo":"Obra casa cristal","Comprovante":false,"data":"2017-07-25","hora":"11:02:35","metodo_pagamento":"Cartão de Crédito","valor":"70.31","recebedor":"IMPERIO DA SERRA-COM DE FRUTAS E LEGUMES LTDA","itens":"DRUMET FGO CONG | Qtd: 1.326 KG | Unit: R$ 9.98 | Total: R$ 13.23\nGOIABA CMP | Qtd: 0.96 KG | Unit: R$ 3.99 | Total: R$ 3.83\nCHOC LIQ T.T.TP 200 | Qtd: 1 UN | Unit: R$ 1.99 | Total: R$ 1.99\nLEITE LV ELEGE | Qtd: 1 UN | Unit: R$ 3.49 | Total: R$ 3.49\nPOKAN CMP | Qtd: 0.58 KG | Unit: R$ 2.99 | Total: R$ 1.73\nBATATA DOCE CMP | Qtd: 0.815 KG | Unit: R$ 1.99 | Total: R$ 1.62\nABOBRINHA CMP | Qtd: 0.635 KG | Unit: R$ 3.99 | Total: R$ 2.53\nPIPOCA MICRO Y.I.C. | Qtd: 2 UN | Unit: R$ 2.99 | Total: R$ 5.98\nBATATA LAVADA CMP | Qtd: 0.845 KG | Unit: R$ 1.49 | Total: R$ 1.26\nQUEIJO EMBALADO C/4 | Qtd: 1 UN | Unit: R$ 5.99 | Total: R$ 5.99\nMUSCULO BOV RESE | Qtd: 0.652 KG | Unit: R$ 25.99 | Total: R$ 16.94\nALHO CMP | Qtd: 0.675 KG | Unit: R$ 2.99 | Total: R$ 2.01\nVAGEM | Qtd: 1 UN | Unit: R$ 3.99 | Total: R$ 3.99\nABOBORA BRANCA | Qtd: 1.322 KG | Unit: R$ 1.99 | Total: R$ 2.63\nMANGA TOMY CMP | Qtd: 0.865 KG | Unit: R$ 3.99 | Total: R$ 3.45","id":2,"createdAt":"2026-08-17T02:21:06.167Z","updatedAt":"2026-08-17T02:21:06.167Z"},{"Grupo":"Obra casa cristal","Comprovante":true,"data":"2024-04-24","hora":"14:41:00","metodo_pagamento":"PIX","valor":"300","recebedor":"Anderson Rodrigo Gomes de Souza","itens":"Prego, parafusadeira, martelo","id":3,"createdAt":"2026-08-17T02:33:59.830Z","updatedAt":"2026-08-17T02:33:59.830Z"},{"Grupo":"Obra casa cristal","Comprovante":true,"data":"2024-04-24","hora":"14:41:00","metodo_pagamento":"PIX","valor":"300","recebedor":"Anderson Rodrigo Gomes de Souza","itens":"Prego, parafusadeira, martelo","id":4,"createdAt":"2026-08-17T02:34:28.985Z","updatedAt":"2026-08-17T02:34:28.985Z"},{"Grupo":"Obra casa cristal","Comprovante":false,"data":"2026-08-13","hora":"","metodo_pagamento":"","valor":"171.25","recebedor":"","itens":"","id":5,"createdAt":"2026-08-17T02:35:58.246Z","updatedAt":"2026-08-17T02:35:58.246Z"},{"Grupo":"Obra casa cristal","Comprovante":false,"data":"","hora":"","metodo_pagamento":"","valor":"802.65","recebedor":"","itens":"72 UN COCA COLA 2LTS, 1 CX COCA COLA LATA 350ML CX/12, 1 FD COCA-COLA PET 1L CX06, 1 CX AGUA LIA C/GAS PT 500ML, 1 CX AGUA LIA S/GAS PT 500ML CX12","id":6,"createdAt":"2026-08-17T02:38:08.409Z","updatedAt":"2026-08-17T02:38:08.409Z"},{"Grupo":"Obra casa cristal","Comprovante":false,"data":"","hora":"","metodo_pagamento":"","valor":"171.25","recebedor":"","itens":"Arroz","id":7,"createdAt":"2026-08-17T02:39:53.199Z","updatedAt":"2026-08-17T02:39:53.199Z"}]" = logo vamos precisar organizar por nome do grupo, cada grupo tera estilo uma pagina, vamos poder alteranar entre elas, quando estivermos em um grupo x vamos poder sempre filtrar, ter itens mais comprados, ver itens, recebedores, e filtrar por ano, mes e dia, por padrao no dashboard vai mostrar gasto do mes sendo possivel alterar

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://group-spend-analyzer.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d8f34f42-88f9-4c00-8269-6a600c711e9d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
