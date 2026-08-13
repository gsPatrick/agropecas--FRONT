/**
 * O formato mínimo em que os documentos legais são gravados — num lugar só.
 *
 * O parser nasceu dentro de `app/termos/TermosCliente.js`, que é quem mostra o
 * texto ao visitante. Saiu de lá quando o admin ganhou um editor com prévia:
 * a prévia só cumpre a promessa ("é assim que a pessoa vai ver") se
 * interpretar o texto pelo MESMO código. Duas cópias do parser divergiriam na
 * primeira correção feita em uma delas, e a divergência apareceria como
 * documento legal publicado quebrado no site público — descoberto pelo
 * usuário, não por quem publicou.
 *
 * São só três formas — `## título`, item `- ` e parágrafo — e isso é limite,
 * não rascunho: o texto vem de um campo editável no painel e NUNCA vira HTML.
 * Sai como filho de `<p>` e `<li>`, escapado pelo React. Um parser maior seria
 * superfície para o conteúdo do banco virar marcação executável.
 */

/** os três documentos que a plataforma mantém, na ordem em que se lê */
export const TIPOS_DOCUMENTO = [
  {
    id: 'termos_de_uso',
    /* `caminho` só existe onde a página pública JÁ existe: hoje só `/termos`.
       Apontar para `/privacidade` e `/cookies` renderizaria um link para 404
       dentro da tela que serve justamente para conferir o resultado */
    rotulo: 'Termos de Uso',
    caminho: '/termos',
    resumo: 'As condições para usar a plataforma. Sem aceite, não há cadastro.',
    /* muda o tom do aviso de publicação: estes dois travam o uso da
       plataforma até o reaceite, o de cookies não */
    travaUso: true,
  },
  {
    id: 'politica_privacidade',
    rotulo: 'Política de Privacidade',
    caminho: null,
    resumo: 'O que é coletado, por quê, e o que o titular pode exigir.',
    travaUso: true,
  },
  {
    id: 'politica_cookies',
    rotulo: 'Política de Cookies',
    caminho: null,
    resumo: 'O que o navegador guarda e para quê.',
    travaUso: false,
  },
];

export const documentoPorTipo = (tipo) => TIPOS_DOCUMENTO.find((item) => item.id === tipo) || null;

export const rotuloDoTipo = (tipo) =>
  documentoPorTipo(tipo)?.rotulo || String(tipo || '').replace(/_/g, ' ');

/**
 * Âncora do índice.
 *
 * Precisa ser estável e válida em URL, e o título vem do banco com número,
 * acento e espaço — `#3. Anúncios e conteúdo` não sobrevive a um link
 * copiado.
 */
export function paraAncora(titulo) {
  return (
    String(titulo || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'secao'
  );
}

/** converte o texto gravado em seções com blocos de parágrafo e de lista */
export function converterConteudo(texto) {
  const secoes = [];
  let atual = null;

  String(texto || '')
    .split('\n')
    .forEach((bruta) => {
      const linha = bruta.trim();
      if (!linha) return;

      if (linha.startsWith('## ')) {
        const title = linha.slice(3).trim();
        atual = { id: paraAncora(title), title, blocos: [] };
        secoes.push(atual);
        return;
      }

      /* linha antes de qualquer título: cria uma seção sem cabeçalho para o
         texto não sumir da tela por causa de formatação ruim do admin */
      if (!atual) {
        atual = { id: 'introducao', title: '', blocos: [] };
        secoes.push(atual);
      }

      if (linha.startsWith('- ')) {
        const item = linha.slice(2).trim();
        const ultimo = atual.blocos[atual.blocos.length - 1];

        if (ultimo?.tipo === 'lista') ultimo.itens.push(item);
        else atual.blocos.push({ tipo: 'lista', itens: [item] });

        return;
      }

      atual.blocos.push({ tipo: 'paragrafo', texto: linha });
    });

  return secoes.filter((secao) => secao.blocos.length);
}

/**
 * Problemas de formatação que valem um aviso ANTES de publicar.
 *
 * Não são erros de validação — a API aceita o texto do mesmo jeito. São o que
 * faz o site público renderizar diferente do que quem escreveu imaginou, e
 * descobrir isso depois de publicar custa uma versão nova de documento legal,
 * que por sua vez custa o reaceite de toda a base.
 */
export function conferirFormato(texto) {
  const avisos = [];
  const bruto = String(texto || '');
  const linhas = bruto.split('\n').map((linha) => linha.trim());
  const secoes = converterConteudo(bruto);

  if (!secoes.length) return ['O texto está vazio ou não produz nenhuma seção.'];

  if (!linhas.some((linha) => linha.startsWith('## '))) {
    avisos.push('Nenhum título de seção (“## Título”) — o índice do site ficará vazio.');
  }

  if (secoes[0] && !secoes[0].title) {
    avisos.push('Há texto antes do primeiro “## Título” — ele aparece sem cabeçalho e fora do índice.');
  }

  /* `#`, `**` e `*` são o que se digita por hábito de Markdown e este formato
     não interpreta: sairiam impressos, literais, no documento legal */
  if (linhas.some((linha) => /^#(?!#)/.test(linha))) {
    avisos.push('Linhas com “#” simples não viram título — use “## ” com dois sinais.');
  }

  if (/\*\*|__/.test(bruto)) {
    avisos.push('Negrito (“**texto**”) não é interpretado — os asteriscos aparecem no site.');
  }

  if (linhas.some((linha) => /^[*+•]\s/.test(linha))) {
    avisos.push('Itens de lista precisam começar com “- ” — “*” e “•” viram parágrafo.');
  }

  return avisos;
}
