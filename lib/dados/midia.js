/**
 * Upload de arquivo — `POST /midia`, multipart de verdade (não JSON).
 *
 * Usado hoje só pelo formulário de anúncio (`AnuncioForm.js`), que antes só
 * reservava o espaço da foto sem enviar nada (`adicionarFoto` criava um objeto
 * `{id: 'f123'}` fake — ver histórico de `components/AnuncioForm/AnuncioForm.js`).
 *
 * A API aceita o arquivo no campo `arquivos` (multipart), com `referenciaTipo`
 * e `referenciaId` opcionais para já vincular no upload — mas o anúncio ainda
 * não existe quando a pessoa está montando o formulário, então o vínculo
 * acontece depois, mandando os ids devolvidos aqui dentro de `fotos` na
 * criação/edição do anúncio (`anuncio.validators.js: fotos: lista(uuid)`).
 */

import api from '@/lib/api';

function paraFoto(arquivo) {
  return {
    id: arquivo.id,
    url: arquivo.url,
    status: arquivo.status,
  };
}

/** um `File` por vez: a tela adiciona foto uma de cada vez (botão "Adicionar"),
    e um upload por clique dá barra de progresso e erro por arquivo — um POST
    com N arquivos falharia ou passaria como bloco só.

    `referenciaTipo` é `'anuncio'` por padrão (o uso mais comum, foto de
    anúncio); a foto/capa do perfil manda `'perfil_foto'`/`'perfil_capa'` —
    ver `REFERENCIAS` em `midia.constants.js` na API */
export async function enviarFoto(arquivo, { referenciaTipo = 'anuncio', sinal } = {}) {
  const formData = new FormData();
  formData.append('arquivos', arquivo);
  formData.append('referenciaTipo', referenciaTipo);

  const [criado] = await api.enviarArquivo('/midia', formData, { sinal });
  return paraFoto(criado);
}
