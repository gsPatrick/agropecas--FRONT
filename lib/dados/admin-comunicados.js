/**
 * Comunicados do admin → `POST /notificacoes/massa`.
 *
 * ⚠️ Duas coisas que a tela antiga (mock) oferecia e a API não tem:
 *  · **Agendamento.** `notificacao.massa.service.js` enfileira o envio na
 *    hora do pedido — não existe campo de "enviar em tal data". Agendar de
 *    verdade pediria um job com disparo futuro, que não existe hoje.
 *  · **Canal "faixa" (banner no site).** O sistema de notificação entrega em
 *    `sistema` (o que vira o `ComunicadoModal`) e `email` — não há um canal de
 *    banner público, e construir um seria uma feature nova (avisos para
 *    VISITANTE sem sessão), fora do que este endpoint faz.
 *
 * Por isso o formulário do admin ficou só com "enviar agora", pelos canais
 * que a API realmente entrega.
 */

import api from '@/lib/api';

export async function enviarComunicado({ titulo, mensagem, publico, canais, link }) {
  return api.post('/notificacoes/massa', {
    tipo: 'sistema',
    titulo,
    mensagem,
    canais,
    dados: link ? { link } : undefined,
    segmento: publico && publico !== 'todos' ? { tipoPerfil: publico } : undefined,
  });
}

/**
 * "há 2 horas" em vez de uma data ISO — mesma lógica de `lib/dados/anuncios.js`,
 * pequena demais para justificar compartilhar módulo.
 */
function quando(iso) {
  if (!iso) return '';

  const minutos = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (Number.isNaN(minutos)) return '';

  if (minutos < 1) return 'agora';
  if (minutos < 60) return `há ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`;

  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} ${horas === 1 ? 'hora' : 'horas'}`;

  const dias = Math.floor(horas / 24);
  if (dias < 30) return `há ${dias} ${dias === 1 ? 'dia' : 'dias'}`;

  const meses = Math.floor(dias / 30);
  return `há ${meses} ${meses === 1 ? 'mês' : 'meses'}`;
}

/**
 * Histórico de comunicados já enviados — `GET /notificacoes/massa`.
 *
 * ⚠️ A auditoria guarda o texto ORIGINAL do template (`titulo`), não o
 * `mensagem` renderizado por pessoa — por isso o item de histórico não tem
 * corpo de texto, só título, canais, público e alcance. Itens enviados
 * NESTA sessão (ainda em `lista` local) continuam mostrando o texto porque
 * vêm do rascunho, não da API.
 */
export async function listarHistoricoComunicados({ pagina, porPagina, sinal } = {}) {
  const { dados, meta } = await api.listar(
    '/notificacoes/massa',
    { pagina, porPagina },
    { sinal }
  );

  const itens = (dados || []).map((item) => ({
    id: item.loteId,
    titulo: item.titulo,
    texto: '',
    publico: item.segmento?.tipoPerfil || 'todos',
    canais: item.canais || [],
    situacao: 'enviado',
    quando: quando(item.enviadoEm),
    alcance: item.alcance,
    enviadoPor: item.enviadoPor?.nome || null,
  }));

  return { itens, total: meta.total || 0 };
}
