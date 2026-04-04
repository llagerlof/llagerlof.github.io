---
layout: post
title: "Ai ai, Markdown"
date: 2026-04-03 10:00:00 -0300
tags: [markdown, llm, ia, ai]
---
Eu tenho usado bastante Markdown para documentação, anotações e instruções para LLMs. E isso é o que descobri sobre esse formato: não tão maravilhoso, mas ótimo para o que se propõe.

## LLMs respondem em Markdown quando acessados por interface web

As IAs generativas respondem em Markdown. Se o usuário está acessando um LLM por interface web, como o ChatGPT, é certo que a resposta chega em Markdown e é renderizada na tela do navegador. Se você copiar a resposta usando o botão de copiar que aparece no final de cada resposta e depois colá-la no bloco de notas, aquilo é Markdown.

Por exemplo, quando você pede ao ChatGPT "liste 3 escritores de ficção científica", a resposta chega assim:

```markdown
### 3 escritores de ficção científica

1. **Isaac Asimov**: autor da série *Fundação* e referência da ficção científica clássica.
2. **Robin Cook**: conhecido por thrillers médicos como *Coma* e por popularizar o gênero.
3. **Andy Weir**: autor de *Perdido em Marte* e conhecido por ficção científica com base científica realista.
```

Na interface web isso aparece formatado, com título um pouco maior, nomes dos autores em negrito e lista numerada.

## LLMs entendem melhor quando o prompt está em Markdown

Escrever em Markdown para um LLM é extremamente útil, principalmente por causa de títulos, subtítulos e tabelas. Se você escreve um prompt com títulos e subtítulos em texto puro, sem usar Markdown, o LLM precisa inferir o que é título, o que é subtítulo e a qual seção ou subseção pertence cada bloco de texto.

Quando você usa Markdown para separar títulos e subtítulos, está explicando para o LLM exatamente como o texto está organizado. O LLM não precisa ficar adivinhando o que é cada linha do texto, se é um título, subtítulo, parágrafo comum, item de lista ou outro elemento. Nada fica ambíguo.

Usar Markdown é ter a segurança de passar um contexto correto para o LLM.

Compare esses dois prompts. Primeiro, sem Markdown:

```
Quero que você atue como um revisor de textos em português do Brasil.
Foco: ortografia, gramática e clareza.
Mantenha o sentido original.
Ignore preferências de estilo pessoal.
Analise o texto abaixo.
A gente vamos marcar uma reuniao amanhã, mais eu nao sei se todos pode participar.
```

Agora o mesmo prompt, com Markdown:

````markdown
# Tarefa
Atue como um revisor de textos em português do Brasil.

## Configuração
- **Foco:** ortografia, gramática e clareza
- **Manter:** sentido original do texto
- **Ignorar:** preferências de estilo pessoal

## Texto para análise
```
A gente vamos marcar uma reuniao amanhã, mais eu nao sei se todos pode participar.
```
````

A versão com Markdown elimina qualquer ambiguidade. O LLM sabe exatamente onde termina a configuração e onde começa o código.

## Listas de tarefas

Outro recurso muito prático do Markdown é a lista de tarefas (checklist). É útil tanto para organização pessoal quanto para dar instruções a um LLM:

```markdown
## Etapas da pesquisa em educação
- [x] Revisar a literatura sobre alfabetização
- [x] Definir os objetivos e a pergunta de pesquisa
- [ ] Aplicar os questionários com professores
- [ ] Analisar os dados coletados
```

Ao passar uma checklist para um LLM, ele entende claramente quais itens já foram concluídos e quais ainda estão pendentes.

## Tabelas

Tabelas feitas em Markdown são estruturadas e excelentes para passar para o Gemini ou o Claude. Se você tiver de passar uma tabela para um LLM, use o formato Markdown ou CSV. Quando você faz o upload de uma planilha, a aplicação converte a planilha em CSV antes de passar para o LLM, mas isso é transparente para o usuário.

Exemplo de tabela em Markdown:

```markdown
| Ferramenta | Tipo      | Gratuita |
|------------|-----------|----------|
| ChatGPT    | Chat      | Parcial  |
| Claude     | Chat      | Parcial  |
| Ollama     | Local     | Sim      |
```

Você pode colar essa tabela direto no prompt e pedir para o LLM comparar as ferramentas, adicionar colunas, filtrar linhas ou converter para outro formato. Isso são apenas alguns exemplos, a imaginação é o limite.

## Blocos de código

Markdown permite identificar a linguagem de um trecho de código usando os três crases com o nome da linguagem (neste exemplo, o **SQL**). Isso é útil ao interagir com LLMs, porque ajuda o modelo a entender o contexto:

````markdown
```sql
SELECT nome, email FROM usuarios WHERE ativo = true;
```
````

Se você colar esse trecho num prompt, o LLM já sabe que é SQL e pode sugerir otimizações, encontrar erros ou converter para outra linguagem com muito mais precisão do que se o código estivesse solto no meio do texto.

## Um exemplo real, minha documentação pessoal

Eu mantenho minha documentação pessoal toda em Markdown, e como é texto puro, é extremamente fácil para um agente de IA consultar as informações na documentação sem precisar converter nada nem fazer nenhuma operação mirabolante para recuperar as informações solicitadas.

Um caso de uso prático: eu mantenho vários arquivos `.md` no formato `yyyy-mm-dd_hh-mm-ss_tag1-tag2-tag3.md` (por exemplo, `2025-04-27_19-45-20_reuniao-oficina-ia.md`). Quando preciso consultar algo, simplesmente peço a informação ao meu agente (atualmente o `codex` da OpenAI). Como todos os documentos já estão estruturados em Markdown e o nome dos arquivos contém a data e algumas tags, o LLM entende o contexto imediatamente.

## Conclusão

O formato é bom, principalmente para utilização com inteligências artificiais generativas. Mas não é só isso: Markdown é útil para qualquer tipo de documentação pessoal ou profissional. É simples, legível e universal. Se você ainda não usa, considere começar pelos seus próprios rascunhos e anotações.
