# ── dependências ──────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── build ─────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* é inlined no bundle em tempo de build. `next build` carrega
# .env.production sozinho — não precisa de build arg nem env de runtime aqui;
# se um dia a URL da API mudar, o valor certo é editar esse arquivo.
RUN npm run build

# ── runtime ───────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# fixo em 80: é a porta padrão que o proxy do EasyPanel espera — deixar a
# cargo da variável PORT injetada pela plataforma já causou descompasso
# entre onde o server.js escuta e para onde o proxy roteava
ENV PORT=80
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 80
CMD ["node", "server.js"]
