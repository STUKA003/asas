# Design Direction

## Objetivo

Elevar o produto de um "app Tailwind limpo" para uma plataforma com presença premium, confiança operacional e identidade própria.

Referência de ambição:

- clareza e confiança de produto tipo Fresha
- mais personalidade visual
- mais contraste de tipografia
- booking mais aspiracional e mais convincente
- áreas internas com sensação de sistema profissional

## Diagnóstico Rápido

O frontend atual já tem base competente:

- boa legibilidade
- hierarquia razoável
- uso consistente de `accent`
- componentes reutilizáveis

Mas ainda há sinais claros de UI genérica:

- tipografia demasiado neutra
- excesso de cards semelhantes
- linguagem visual repetida entre público, booking, admin e superadmin
- páginas de login demasiado básicas
- pouca diferenciação entre "marca", "conversão" e "operação"

## Nova Direção

### 1. Público

Tom:

- premium
- editorial
- masculino contemporâneo
- confiante sem parecer luxo artificial

Objetivo:

- vender marca
- transmitir confiança
- empurrar para booking

Características visuais:

- hero mais cinematográfico
- mais contraste entre texto grande e microcopy
- maior uso de imagem, textura e blocos assimétricos
- menos grelha uniforme de cards
- secções com ritmos visuais diferentes

Palavras-chave:

- premium
- sharp
- tactile
- editorial

### 2. Booking

Tom:

- concierge digital
- claro
- rápido
- tranquilizador

Objetivo:

- reduzir fricção
- aumentar confiança
- fazer a reserva parecer simples e valiosa

Características visuais:

- estrutura mais focada em conversão
- stepper menos genérico e mais "flow"
- resumo lateral mais forte e mais premium
- estados de seleção muito claros
- melhores vazios, agrupamento e ritmo vertical

Palavras-chave:

- guided
- calm
- precise
- premium utility

### 3. Admin da Barbearia

Tom:

- operating system
- profissional
- rápido de ler
- orientado a decisão

Objetivo:

- permitir gerir a casa com menos esforço mental
- destacar o que precisa de ação
- dar sensação de controlo

Características visuais:

- menos caixas decorativas
- mais hierarquia de informação
- dashboards com densidade melhor calibrada
- navegação lateral mais madura
- componentes de tabela, filtros e estados mais consistentes

Palavras-chave:

- control
- signal
- clarity
- operational confidence

### 4. Super Admin

Tom:

- plataforma
- estratégico
- monitorização
- inteligência de negócio

Objetivo:

- parecer camada de gestão de plataforma, não só mais um dashboard

Características visuais:

- linguagem mais "executive"
- painéis mais compactos e mais analíticos
- menos glow decorativo, mais precisão
- melhor leitura de métricas, distribuição e health

Palavras-chave:

- platform intelligence
- oversight
- scale
- system

## Sistema Visual Proposto

### Tipografia

Problema atual:

- `Inter` em tudo funciona, mas não cria carácter

Proposta:

- Headings: `Manrope`, `Plus Jakarta Sans` ou `Sora`
- UI/body: `Inter` ou `Instrument Sans`

Direção recomendada:

- `Manrope` para títulos e métricas
- `Inter` para interface e corpo

Efeito:

- mantém legibilidade
- cria mais assinatura visual
- melhora presença em hero, dashboards e pricing

### Cor

Problema atual:

- o `accent` já ajuda, mas o produto vive demasiado em branco/cinza/laranja

Proposta:

- manter `accent` dinâmico por barbearia
- criar uma base neutra mais sofisticada
- introduzir superfícies com camadas mais claras
- usar uma cor secundária estrutural para profundidade

Base recomendada:

- background principal: `stone/zinc` muito leve no público
- background operacional: `slate/zinc` limpo e frio no admin
- cor secundária estrutural: azul petróleo / steel / ink

Princípio:

- `accent` vende a marca
- os neutros vendem profissionalismo

### Radius e sombra

Problema atual:

- quase tudo usa o mesmo tipo de card arredondado com sombra leve

Proposta:

- definir 3 níveis de surface
- usar radius com mais intenção

Escala recomendada:

- `radius-sm`: 14px
- `radius-md`: 20px
- `radius-lg`: 28px

Surfaces:

- `surface-1`: base limpa
- `surface-2`: painel elevado
- `surface-3`: painel hero ou destaque

Sombras:

- menos "blur genérico"
- mais separação por layers

### Motion

Problema atual:

- animação quase inexistente como linguagem

Proposta:

- stagger suave na entrada de blocos
- transições de hover mais refinadas
- step transitions no booking
- motion de painel no sidebar mobile

Princípio:

- movimento curto e útil
- nunca decorativo demais

## Regras de Composição

### Público

- alternar secções densas com secções abertas
- evitar sequência longa de cards iguais
- usar pelo menos um bloco hero com composição assimétrica
- usar números, prova social e detalhes de marca de forma mais elegante

### Booking

- cada passo deve responder a uma pergunta
- a página deve ter foco visual num só gesto principal
- resumo deve parecer "carrinho premium", não sidebar auxiliar
- confirmar seleção com feedback visual forte

### Admin

- cada ecrã precisa de:
  - headline curta
  - estado operacional imediato
  - zona principal de ação
  - zona secundária de contexto

- menos decoração, mais leitura

### Superadmin

- métricas primeiro
- distribuição segundo
- insights terceiro

- precisa de parecer uma camada acima do admin, não uma cópia escura

## Diferenças Claras Entre os 4 Sites

Não devem parecer o mesmo sistema com cores diferentes.

### Público

- marca
- desejo
- confiança

### Booking

- foco
- simplicidade
- decisão

### Admin

- operação diária
- rapidez
- legibilidade

### Superadmin

- visão global
- escala
- inteligência de plataforma

## Prioridade de Implementação

### Fase 1

- definir tokens globais de tipografia, spacing, radius e surface
- rever `Button`, `Card`, `Input`, `Badge`
- introduzir nova stack tipográfica

### Fase 2

- redesenhar home pública
- redesenhar booking
- redesenhar logins

### Fase 3

- consolidar `AdminLayout`
- consolidar `BarberLayout`
- redesenhar dashboard admin
- redesenhar dashboard barber

### Fase 4

- elevar superadmin para linguagem própria
- refinar tabelas, filtros, empty states e feedbacks

## Decisões Concretas Recomendadas

- manter o conceito premium clean
- abandonar a sensação de template SaaS genérico
- introduzir tipografia com mais assinatura
- reduzir repetição de cards iguais
- transformar booking na melhor experiência visual do produto
- fazer admin parecer ferramenta séria de operação
- fazer superadmin parecer camada de inteligência da plataforma

## Referência de Norte

Se tivermos de resumir a direção numa frase:

> Menos "Tailwind app bonito", mais "produto premium com controlo, marca e confiança".
