# Guia rápido do blog em Jekyll

Este documento resume como criar, editar e publicar posts do blog na raiz do site (`/`).

## Estrutura principal

- `_config.yml`: configuração do Jekyll
- `_layouts/`: layouts HTML do blog
- `_posts/`: posts em Markdown
- `assets/css/blog.css`: estilos
- `index.html`: página inicial/listagem de posts
- `about.md`: página Sobre
- `_data/projects.yml`: catálogo da sidebar fixa de projetos

## Publicação no GitHub Pages

Você nao precisa rodar nada localmente para publicar.

O GitHub Pages faz o build do Jekyll automaticamente ao receber push na branch publicada.

Fluxo mínimo:

1. Crie ou edite um post em `_posts/`
2. Faça commit e push
3. Aguarde o GitHub Pages publicar
4. Abra `https://llagerlof.github.io/`

## Como criar um novo post

Crie um arquivo em `_posts/` com o formato:

`YYYY-MM-DD-titulo-do-post.md`

Exemplo:

`2026-04-05-como-organizar-notas-tecnicas.md`

Modelo de conteúdo:

```md
---
layout: post
title: "Como organizar notas tecnicas"
date: 2026-04-05 09:30:00 -0300
tags: [organizacao, produtividade]
---

Texto do post em Markdown.
```

## Como editar um post existente

1. Abra o arquivo do post em `_posts/`
2. Edite o conteúdo Markdown
3. Se quiser, ajuste `title`, `tags` ou `date` no front matter
4. Commit e push

## Preview local (opcional)

Use apenas se quiser validar visualmente antes de subir.

Requisitos:

- Ruby instalado
- Bundler instalado

Comandos (na raiz do repositório):

```bash
bundle install
bundle exec jekyll serve --livereload
```

Acesse:

- `http://127.0.0.1:4000/`

## Edição de layout e design

- Layout base: `_layouts/default.html`
- Layout de post: `_layouts/post.html`
- CSS: `assets/css/blog.css`
- Sidebar de projetos: `_includes/sidebar-projects.html` + `_data/projects.yml`

Ao alterar layout/CSS:

1. Teste no preview local
2. Valide desktop e mobile
3. Verifique se links e assets usam caminhos corretos do blog

## Erros comuns e correcoes

1. Post nao aparece na home:
   - Verifique nome do arquivo (`YYYY-MM-DD-slug.md`)
   - Verifique front matter valido entre `---` e `---`
2. CSS nao carrega:
   - Confirme se o arquivo existe em `assets/css/blog.css`
   - Verifique se o `baseurl` esta configurado como vazio (`""`)
3. Link quebrado em producao:
   - Prefira links com `relative_url` nos templates
   - Evite caminhos absolutos incorretos para a raiz

## Checklist antes de publicar

1. Conteúdo revisado
2. Front matter valido
3. Links internos funcionando
4. Sem erro de console no navegador
5. Commit com mensagem clara
