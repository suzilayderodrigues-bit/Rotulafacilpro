# Sprint 2 - Login e Acesso

## Objetivo principal

Criar apenas o fluxo de acesso ao sistema.

## Escopo

- Tela de login.
- Tela de criacao de conta.
- Tela de recuperacao de senha.
- Logout.
- Rota interna protegida temporaria.
- Modelos e migration minimos para autenticacao.
- Sessao com cookie httpOnly e token armazenado como hash no banco.

## Estrategia de autenticacao

A sprint usa autenticacao propria minima, compativel com Next.js e Prisma 7.

Auth.js foi avaliado como preferencia, mas nao foi adotado nesta sprint para evitar adicionar uma camada externa antes de existir provedor de e-mail e antes de consolidar o adapter do Prisma 7. A solucao atual usa primitives do Next.js, validacao no servidor e senha com hash.

## Fora do escopo

- Dashboard final.
- Autenticacao social.
- Envio real de e-mail.
- Produtos.
- Ingredientes.
- Receitas.
- Tabelas nutricionais.
- Producoes.
- Etiquetas.
- Planos.
- Deploy.
