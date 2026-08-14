/**
 * Gatilho e dispensa do assistente de primeiro acesso.
 *
 * ─── por que "completude baixa", e não "primeiro login" ───────────────────
 *
 * `GET /auth/eu` não expõe hoje um jeito confiável de saber "esta pessoa nunca
 * entrou antes" — `montarUsuario()` em `lib/sessao.js` não repassa
 * `usuario.ultimoLoginEm`, e mesmo se repassasse, teria de comparar com
 * `criadoEm` para inferir "primeiro login", o que quebra no primeiro request
 * que chega um segundo depois do cadastro (fuso, latência de rede).
 *
 * `completudeDoPerfil(...).porcentagem` (`lib/dados/perfil-publico.js`) já
 * resolve o problema de um jeito mais robusto: alguém que nunca logou tem
 * perfil vazio, então cai abaixo do limite de qualquer forma — e ao contrário
 * de um sinal de "primeiro acesso", ele também para de incomodar sozinho
 * assim que a pessoa preenche o suficiente, mesmo sem passar pelo assistente
 * (ex.: preencheu direto em `/painel/perfil`). Um sinal de "primeiro login"
 * teria de ser combinado com a completude de qualquer forma para não voltar a
 * cutucar quem já preencheu tudo — então usar só a completude é mais simples
 * E mais correto.
 *
 * 45% como limite: dá pra chegar em ~45% preenchendo só 2-3 dos 5 campos
 * comuns (foto, sobre, telefone, whatsapp, cidade) sem tocar nos campos do
 * tipo — ou seja, alguém que só documentou o básico não é mais incomodado.
 * Abaixo disso é perfil praticamente em branco, o caso que o assistente existe
 * para resolver.
 */

const LIMITE_PORCENTAGEM = 45;

const chave = (usuarioId) => `agropecas:onboarding-visto:${usuarioId}`;

export function onboardingFoiDispensado(usuarioId) {
  if (!usuarioId) return true;
  try {
    return localStorage.getItem(chave(usuarioId)) === '1';
  } catch {
    /* navegação privada pode bloquear o storage: melhor não insistir do que
       travar a pessoa num redirecionamento em loop */
    return true;
  }
}

export function marcarOnboardingDispensado(usuarioId) {
  if (!usuarioId) return;
  try {
    localStorage.setItem(chave(usuarioId), '1');
  } catch {
    /* sem storage, sem o que persistir — a tela simplesmente pode perguntar
       de novo na próxima visita, o que não é grave */
  }
}

export function precisaDeOnboarding(porcentagemCompletude) {
  return porcentagemCompletude < LIMITE_PORCENTAGEM;
}

export { LIMITE_PORCENTAGEM };
