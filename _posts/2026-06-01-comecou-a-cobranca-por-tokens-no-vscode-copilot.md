---
layout: post
title: "Começou a cobrança por tokens no vscode (copilot)"
date: 2026-06-01 10:09:07 -0300
tags: [vscode,caveman,copilot,github]
---

Hoje, dia 1 de junho de 2026, a Microsoft começou a cobrar por tokens a utilização dos modelos de IA disponíveis no VS Code via Github Copilot.

Para quem quiser economizar tokens, existe uma skill chamada Caveman, já totalmente aceita e aprovada pela comunidade: [https://github.com/juliusbrussee/caveman](https://github.com/juliusbrussee/caveman).

Ela pode ser instalada em vários agentes, inclusive no VS Code. Para instalar no VS Code execute o comando `npx skills add JuliusBrussee/caveman -a github-copilot`. O instalador exibirá várias skills; selecione pelo menos a skill **caveman**, escolha a opção **Global**, para que ela fique disponível em qualquer projeto, e prossiga com a instalação.

Depois disso, dentro do VS Code, quando quiser iniciar uma sessão com o Caveman basta digitar no chat `/caveman <insira aqui o seu prompt normalmente>`. Se não quiser utilizar o Caveman escreva o prompt normalmente sem o `/caveman` no início.

Essa skill compacta tanto as entradas quanto as saídas de tokens.

Vale observar que se o objetivo for gerar documentação ou explicações detalhadas é melhor não utilizar essa skill. Como o uso é opcional você pode mantê-la instalada e ativá-la com `/caveman` apenas quando necessário.
