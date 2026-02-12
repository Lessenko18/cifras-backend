# Cifras Caritas - Fullstack Project

Este repositorio contem a solucao completa para gestao de cifras e playlists da Caritas, composta por um Frontend em React 19 e um Backend REST em Node.js.

## Visao geral

O projeto foi desenvolvido para facilitar a organizacao de repertorios musicais, permitindo o gerenciamento de cifras com visualizacao otimizada, controle de acesso por niveis (ADM/USER) e compartilhamento de listas entre usuarios.

## Frontend (React)

Aplicacao web moderna construida com Vite e voltada para a experiencia do usuario musico.

### Funcionalidades

- Autenticacao completa: login, cadastro e recuperacao de senha.
- Visualizacao de cifras com suporte a duas colunas (usando o separador !!!).
- Autoscroll com ajuste de velocidade para leitura durante a execucao musical.
- Gestao de playlists: criar, editar e compartilhar por email com busca dinamica de usuarios.
- Perfil do usuario com edicao de dados e upload de avatar integrado ao S3.
- Painel administrativo: CRUD de categorias e usuarios (restrito a perfis ADM).

### Tecnologias

- React 19 / Vite
- React Router DOM
- Styled Components
- Axios (interceptors para tratamento de token JWT)
- React Hot Toast

### Rotas da aplicacao

- / e /login - Login
- /signup - Cadastro
- /forgot-password - Recuperacao de senha
- /home - Home
- /home/profile - Perfil
- /home/cifras - Cifras
- /home/cifra/:id - Visualizar cifra
- /home/playlists - Playlists
- /home/playlists/:id/ver - Visualizar playlist
- /home/users - Usuarios (ADM)
- /home/categorias - Categorias (ADM)

O controle de acesso para rotas ADM e feito via localStorage com user.level === "ADM".

### Observacoes de uso

- O token JWT e armazenado no localStorage e enviado automaticamente pelo interceptor do Axios.
- Se a API retornar 401, o usuario e deslogado e redirecionado para /login.
- Para separar a cifra em duas colunas, use !!! no campo de observacao.

## Backend (Node.js)

API REST que fornece todos os recursos necessarios para o funcionamento do ecossistema.

### Tecnologias

- Runtime: Node.js + Express
- Banco de dados: MongoDB (Mongoose)
- Autenticacao: JWT (JSON Web Tokens)
- Storage: integracao com AWS S3 para imagens

### Endpoints principais

Autenticacao

- POST /auth/login
- POST /auth/register
- GET /auth/me
- POST /auth/forgot-password

Usuarios

- GET /user/
- POST /user/create
- PATCH /user/update/:id
- DELETE /user/delete/:id
- GET /user/search?q=

Categorias

- GET /categoria/
- GET /categoria/:id
- POST /categoria/create
- PATCH /categoria/update/:id
- DELETE /categoria/delete/:id
- GET /categoria/search?nome=

Cifras

- GET /cifra/
- GET /cifra/:id
- POST /cifra/create
- PATCH /cifra/update/:id
- DELETE /cifra/delete/:id
- GET /cifra/search?nome=

Playlists

- GET /playlist/
- GET /playlist/:id
- GET /playlist/:id/view
- POST /playlist/create
- PATCH /playlist/update/:id
- DELETE /playlist/delete/:id
- POST /playlist/:id/share
- DELETE /playlist/:id/share

Upload de avatar (S3)

- POST /user/get-presigned-url (opcional, quando usar upload direto)
- POST /user/upload-avatar (upload via backend, usado atualmente)

## Configuracao e instalacao

### Configuracao do ambiente

Crie um arquivo .env na pasta do backend com as seguintes variaveis. Nao inclua valores reais no README e nao commite o .env no repositorio.

```env
PORT=3000
DATABASE_URL=
JWT_SECRET=
AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET_NAME=
```

### Como rodar o backend

1. Instale as dependencias:

```bash
npm install
```

2. Rode em modo desenvolvimento:

```bash
npm run dev
```

O servidor sobe por padrao em http://localhost:3000.

### Como rodar o frontend

No diretorio do frontend:

```bash
npm install
npm run dev
```

## Problemas comuns

- CORS: garanta que o backend permita requests do frontend.
- 401 constante: verifique se o token esta sendo retornado no login.
- Upload de avatar falha: confira configuracao de S3 no backend.

## Roadmap

- Permitir edicao de cifras apenas pelo autor ou ADM master.
- Compartilhar cifras via checkbox (similar ao compartilhamento de playlists).

## Licenca

Projeto interno da Caritas. 
