'use client';

import BrandMark from '@/components/BrandMark/BrandMark';
import Button from '@/components/Button/Button';
import Badge from '@/components/Badge/Badge';
import Card from '@/components/Card/Card';
import Field from '@/components/Field/Field';
import Input from '@/components/Input/Input';
import Icon, { iconNames } from '@/components/Icon/Icon';
import SearchBar from '@/components/SearchBar/SearchBar';
import SectionHeading from '@/components/SectionHeading/SectionHeading';
import AudienceCard from '@/components/AudienceCard/AudienceCard';
import StepCard from '@/components/StepCard/StepCard';
import PartTile from '@/components/PartTile/PartTile';
import FeatureItem from '@/components/FeatureItem/FeatureItem';
import StatBlock from '@/components/StatBlock/StatBlock';
import Swatch from '@/components/Swatch/Swatch';
import Specimen from '@/components/Specimen/Specimen';
import styles from './page.module.css';

const brandColors = [
  { name: 'Verde Mata', token: '--color-forest', hex: '#1F5E2D', note: 'Institucional. Títulos, faixa escura, footer.' },
  { name: 'Verde Campo', token: '--color-green', hex: '#4CAF50', note: 'Ação. Botões, ícones ativos, links.' },
  { name: 'Verde Broto', token: '--color-lime', hex: '#A3C23C', note: 'Acento. Uma aparição por dobra.' },
  { name: 'Off-white', token: '--color-bone', hex: '#F4F6F2', note: 'Canvas alternado entre seções.' },
  { name: 'Grafite', token: '--color-ink', hex: '#1A1A1A', note: 'Texto corrente.' },
];

const supportColors = [
  { name: 'Mata Profunda', token: '--color-forest-deep', hex: '#16431F' },
  { name: 'Mata Suave', token: '--color-forest-soft', hex: '#2C7A3D' },
  { name: 'Verde Pálido', token: '--color-green-soft', hex: '#E9F3E2' },
  { name: 'Verde Névoa', token: '--color-green-tint', hex: '#F2F8EE' },
  { name: 'Tinta 2', token: '--color-ink-2', hex: '#4A524C' },
  { name: 'Tinta 3', token: '--color-ink-3', hex: '#7C857E' },
  { name: 'Linha', token: '--color-line', hex: '#E4E8E1' },
  { name: 'Linha Forte', token: '--color-line-strong', hex: '#CFD6CC' },
];

const semanticColors = [
  { name: 'Sucesso', token: '--color-success', hex: '#4CAF50' },
  { name: 'Atenção', token: '--color-warning', hex: '#E0A32E' },
  { name: 'Erro', token: '--color-danger', hex: '#D24B43' },
  { name: 'Informação', token: '--color-info', hex: '#2F6FB0' },
];

const typeScale = [
  { role: 'Herói', token: '--text-hero', size: 'clamp(40px, 7vw, 76px)', weight: 800, sample: 'O campo não pode parar', className: 'hero' },
  { role: 'Título de seção', token: '--text-h2', size: 'clamp(26px, 3.4vw, 40px)', weight: 700, sample: 'Peças mais procuradas hoje', className: 'h2' },
  { role: 'Título de cartão', token: '--text-h3', size: 'clamp(18px, 1.6vw, 22px)', weight: 700, sample: 'Produtor Rural', className: 'h3' },
  { role: 'Corpo', token: '--text-body', size: '16px', weight: 400, sample: 'Sua máquina parou? Encontre a peça ou o serviço que precisa.', className: 'body' },
  { role: 'Corpo pequeno', token: '--text-sm', size: '14px', weight: 400, sample: 'Busque pela peça que precisa ou pela máquina.', className: 'small' },
  { role: 'Rótulo', token: '--text-label', size: '12px · 0.08em', weight: 600, sample: 'VERSÕES DO LOGO', className: 'label' },
];

const spacing = [
  { token: '--space-2', value: '8px', key: 's2' },
  { token: '--space-4', value: '16px', key: 's4' },
  { token: '--space-6', value: '24px', key: 's6' },
  { token: '--space-8', value: '32px', key: 's8' },
  { token: '--space-12', value: '48px', key: 's12' },
  { token: '--space-16', value: '64px', key: 's16' },
  { token: '--space-24', value: '96px', key: 's24' },
];

const radii = [
  { token: '--radius-sm', key: 'rSm' },
  { token: '--radius-md', key: 'rMd' },
  { token: '--radius-lg', key: 'rLg' },
  { token: '--radius-xl', key: 'rXl' },
  { token: '--radius-2xl', key: 'r2xl' },
];

const shadows = [
  { token: '--shadow-sm', use: 'repouso de cartão', key: 'shSm' },
  { token: '--shadow-md', use: 'hover de cartão', key: 'shMd' },
  { token: '--shadow-lg', use: 'busca do herói', key: 'shLg' },
  { token: '--shadow-cta', use: 'hover do botão primário', key: 'shCta' },
];

const parts = [
  { icon: 'belt', label: 'Correia' },
  { icon: 'bearing', label: 'Rolamento' },
  { icon: 'filter', label: 'Filtro' },
  { icon: 'pump', label: 'Bomba Hidráulica' },
  { icon: 'cross', label: 'Cruzeta' },
  { icon: 'grid', label: 'Ver todas' },
];

const statuses = [
  { tone: 'neutral', label: 'Aberta' },
  { tone: 'info', label: 'Em triagem' },
  { tone: 'lime', label: 'Direcionada' },
  { tone: 'warning', label: 'Sem resposta' },
  { tone: 'success', label: 'Concluída' },
  { tone: 'danger', label: 'Não atendida' },
];

export default function DesignSystemPage() {
  return (
    <div className={styles.page}>
      <header className={styles.masthead}>
        <div className={styles.mastheadInner}>
          <BrandMark size="lg" tone="dark" showTagline />
          <div className={styles.mastheadText}>
            <span className={styles.kicker}>Design System · v1.0</span>
            <h1 className={styles.mastheadTitle}>
              A linguagem visual do <em>AgroPeças MT</em>
            </h1>
            <p className={styles.mastheadLead}>
              Tokens, componentes e regras que sustentam toda a plataforma. Tudo o que
              for construído daqui pra frente sai daqui.
            </p>
          </div>
        </div>
        <div className={styles.mastheadGlow} aria-hidden="true" />
      </header>

      <main className={styles.main}>
        <Specimen
          id="cores"
          index="01"
          title="Paleta"
          description="Cinco cores de marca, fixas. As derivadas existem para construir; as semânticas, para comunicar estado. Regra dura: um acento por dobra."
        >
          <div>
            <h3 className={styles.groupTitle}>Marca</h3>
            <div className={styles.swatchGrid}>
              {brandColors.map((color) => (
                <Swatch key={color.token} {...color} />
              ))}
            </div>
          </div>

          <div>
            <h3 className={styles.groupTitle}>Derivadas</h3>
            <div className={styles.swatchGrid}>
              {supportColors.map((color) => (
                <Swatch key={color.token} {...color} />
              ))}
            </div>
          </div>

          <div>
            <h3 className={styles.groupTitle}>Semânticas</h3>
            <div className={styles.swatchGrid}>
              {semanticColors.map((color) => (
                <Swatch key={color.token} {...color} />
              ))}
            </div>
          </div>
        </Specimen>

        <Specimen
          id="tipografia"
          index="02"
          title="Tipografia"
          description="Sora nos títulos, Inter no corpo. Display nunca em parágrafo; corpo nunca acima de 62 caracteres por linha."
        >
          <div className={styles.typeList}>
            {typeScale.map((item) => (
              <div className={styles.typeRow} key={item.token}>
                <div className={styles.typeMeta}>
                  <span className={styles.typeRole}>{item.role}</span>
                  <code className={styles.code}>{item.token}</code>
                  <span className={styles.typeSize}>
                    {item.size} · {item.weight}
                  </span>
                </div>
                <p className={`${styles.typeSample} ${styles[item.className]}`}>{item.sample}</p>
              </div>
            ))}
          </div>
        </Specimen>

        <Specimen
          id="marca"
          index="03"
          title="Marca"
          description="Engrenagem com broto ao centro, wordmark em duas linhas e tagline com o NÃO em Verde Broto. Herda a cor do contexto — nunca importe PNG no header."
        >
          <div className={styles.brandGrid}>
            <Card className={styles.brandCell}>
              <span className={styles.cellLabel}>Fundo claro · com tagline</span>
              <BrandMark size="lg" showTagline />
            </Card>
            <Card className={`${styles.brandCell} ${styles.brandCellDark}`}>
              <span className={styles.cellLabel}>Fundo escuro · com tagline</span>
              <BrandMark size="lg" tone="dark" showTagline />
            </Card>
            <Card className={styles.brandCell}>
              <span className={styles.cellLabel}>Reduzida · header</span>
              <BrandMark size="sm" />
            </Card>
            <Card className={styles.brandCell}>
              <span className={styles.cellLabel}>Padrão</span>
              <BrandMark />
            </Card>
          </div>
        </Specimen>

        <Specimen
          id="botoes"
          index="04"
          title="Botões"
          description="Cinco variantes, três alturas. O primário é o único caminho de conversão — um por dobra."
        >
          <div className={styles.row}>
            <Button variant="primary">Cadastrar</Button>
            <Button variant="forest">Acessar</Button>
            <Button variant="outline">Entrar</Button>
            <Button variant="ghost" iconRight="chevron-right">
              Como funciona
            </Button>
          </div>

          <div className={styles.row}>
            <Button size="sm">Pequeno</Button>
            <Button size="md">Médio</Button>
            <Button size="lg" iconRight="arrow-right">
              Grande
            </Button>
          </div>

          <div className={styles.row}>
            <Button iconLeft="whatsapp">Enviar no WhatsApp</Button>
            <Button variant="outline" iconLeft="search">
              Buscar por máquina
            </Button>
            <Button disabled>Desabilitado</Button>
          </div>

          <div className={`${styles.row} ${styles.rowDark}`}>
            <Button variant="onDark">Sobre fundo escuro</Button>
            <Button variant="onDark" iconRight="arrow-right">
              Começar agora
            </Button>
          </div>
        </Specimen>

        <Specimen
          id="formularios"
          index="05"
          title="Formulários"
          description="Todo campo tem rótulo real — placeholder não substitui label. O foco é sempre visível: anel Verde Broto a 16%."
        >
          <div className={styles.formGrid}>
            <Field label="Nome completo" htmlFor="ds-nome" required>
              <Input id="ds-nome" placeholder="Como você se chama?" />
            </Field>

            <Field label="Buscar peça" htmlFor="ds-busca" hint="Digite o nome ou o código da peça.">
              <Input id="ds-busca" iconLeft="search" placeholder="Correia, rolamento, filtro…" />
            </Field>

            <Field label="Tipo de solicitação" htmlFor="ds-tipo">
              <Input as="select" id="ds-tipo" defaultValue="peca">
                <option value="peca">Peça</option>
                <option value="servico">Serviço</option>
              </Input>
            </Field>

            <Field label="WhatsApp" htmlFor="ds-zap" error="Informe um número válido com DDD.">
              <Input id="ds-zap" invalid defaultValue="(65) 9" />
            </Field>

            <Field
              label="Descrição"
              htmlFor="ds-desc"
              hint="Marca, modelo e ano da máquina ajudam a achar mais rápido."
              className={styles.formWide}
            >
              <Input as="textarea" id="ds-desc" placeholder="Descreva o que você precisa…" />
            </Field>
          </div>

          <div className={styles.searchDemo}>
            <span className={styles.cellLabel}>SearchBar · componente-assinatura do herói</span>
            <SearchBar />
          </div>
        </Specimen>

        <Specimen
          id="badges"
          index="06"
          title="Etiquetas e status"
          description="A mesma escala serve para etiqueta de conteúdo e para o status da solicitação, que é a espinha dorsal da operação."
        >
          <div className={styles.row}>
            {statuses.map((status) => (
              <Badge key={status.label} tone={status.tone} dot>
                {status.label}
              </Badge>
            ))}
          </div>
          <div className={styles.row}>
            <Badge tone="forest" icon="check">
              Fornecedor aprovado
            </Badge>
            <Badge tone="neutral">Pendente</Badge>
            <Badge tone="lime" icon="pin">
              Tangará da Serra · MT
            </Badge>
          </div>
        </Specimen>

        <Specimen
          id="icones"
          index="07"
          title="Ícones"
          description="Um estilo só: linha, traço 1.6, cantos arredondados, currentColor. Nunca misturar com ícone sólido ou colorido."
        >
          <div className={styles.iconGrid}>
            {iconNames.map((name) => (
              <div className={styles.iconCell} key={name}>
                <span className={styles.iconDisc}>
                  <Icon name={name} size={26} />
                </span>
                <code className={styles.code}>{name}</code>
              </div>
            ))}
          </div>
        </Specimen>

        <Specimen
          id="blocos"
          index="08"
          title="Blocos de conteúdo"
          description="Os componentes compostos que aparecem na landing e se repetem no produto."
        >
          <div>
            <h3 className={styles.groupTitle}>SectionHeading</h3>
            <SectionHeading
              eyebrow="Como funciona"
              title="Três passos até resolver"
              description="O traço em Verde Broto sob o título é a assinatura visual de toda seção."
            />
          </div>

          <div>
            <h3 className={styles.groupTitle}>AudienceCard</h3>
            <div className={styles.trio}>
              <AudienceCard
                icon="tractor"
                title="Produtor Rural"
                text="Anuncie suas peças e encontre o que precisa sem parar a produção."
              />
              <AudienceCard
                icon="store"
                title="Loja de Peças"
                text="Divulgue seu estoque e conecte-se com produtores da sua região."
              />
              <AudienceCard
                icon="wrench"
                title="Prestador de Serviços"
                text="Divulgue seus serviços e seja encontrado por quem precisa."
              />
            </div>
          </div>

          <div>
            <h3 className={styles.groupTitle}>StepCard</h3>
            <div className={styles.steps}>
              <StepCard
                step="1"
                icon="search"
                tone="forest"
                title="Procure"
                text="Busque pela peça que precisa ou pela máquina."
              />
              <Icon name="chevron-right" size={22} className={styles.stepArrow} />
              <StepCard
                step="2"
                icon="pin"
                title="Encontre"
                text="Veja quem tem próximo de você com disponibilidade."
              />
              <Icon name="chevron-right" size={22} className={styles.stepArrow} />
              <StepCard
                step="3"
                icon="whatsapp"
                title="Resolva"
                text="Entre em contato direto e resolve seu problema."
              />
            </div>
          </div>

          <div>
            <h3 className={styles.groupTitle}>PartTile</h3>
            <div className={styles.partGrid}>
              {parts.map((part) => (
                <PartTile key={part.label} icon={part.icon} label={part.label} />
              ))}
            </div>
          </div>

          <div>
            <h3 className={styles.groupTitle}>StatBlock</h3>
            <div className={styles.statGrid}>
              <StatBlock value="+500" label="Fazendas conectadas" />
              <StatBlock value="+120" label="Lojas parceiras" />
              <StatBlock value="+80" label="Prestadores de serviços" />
              <StatBlock value="+2.000" label="Peças disponíveis todos os dias" />
            </div>
          </div>

          <div>
            <h3 className={styles.groupTitle}>FeatureItem · faixa institucional</h3>
            <div className={styles.band}>
              <SectionHeading
                tone="dark"
                title="Por que usar a AgroPeças MT?"
                className={styles.bandHeading}
              />
              <div className={styles.bandGrid}>
                <FeatureItem
                  icon="search"
                  title="Busca inteligente"
                  text="Encontre o que precisa em segundos."
                />
                <FeatureItem
                  icon="pin"
                  title="Próximo de você"
                  text="Resultados por região para mais agilidade."
                />
                <FeatureItem
                  icon="phone"
                  title="Contato rápido"
                  text="Fale direto com quem tem a peça."
                />
                <FeatureItem
                  icon="gear"
                  title="Menos máquina parada"
                  text="Mais tempo produzindo, mais lucro para você."
                />
              </div>
            </div>
          </div>
        </Specimen>

        <Specimen
          id="fundacao"
          index="09"
          title="Espaço, raio e elevação"
          description="Escala de 4. A sombra do projeto é sempre esverdeada — cinza neutro é proibido."
        >
          <div>
            <h3 className={styles.groupTitle}>Espaçamento</h3>
            <div className={styles.spaceList}>
              {spacing.map((item) => (
                <div className={styles.spaceRow} key={item.token}>
                  <code className={styles.code}>{item.token}</code>
                  <span className={`${styles.spaceBar} ${styles[item.key]}`} />
                  <span className={styles.spaceValue}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className={styles.groupTitle}>Raio</h3>
            <div className={styles.radiusRow}>
              {radii.map((item) => (
                <div className={styles.radiusCell} key={item.token}>
                  <span className={`${styles.radiusBox} ${styles[item.key]}`} />
                  <code className={styles.code}>{item.token}</code>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className={styles.groupTitle}>Elevação</h3>
            <div className={styles.shadowRow}>
              {shadows.map((item) => (
                <div className={`${styles.shadowCell} ${styles[item.key]}`} key={item.token}>
                  <code className={styles.code}>{item.token}</code>
                  <span className={styles.shadowUse}>{item.use}</span>
                </div>
              ))}
            </div>
          </div>
        </Specimen>

        <Specimen
          id="regras"
          index="10"
          title="Regras que não se quebram"
          description="Se um layout novo violar qualquer um destes pontos, ele volta para a prancheta."
          className={styles.rulesSection}
        >
          <div className={styles.rules}>
            <Card className={styles.ruleCard}>
              <Badge tone="success" icon="check">
                Sempre
              </Badge>
              <ul className={styles.ruleList}>
                <li>Um acento (Verde Broto) por dobra — no traço, na palavra ou nos ícones. Nunca nos três.</li>
                <li>Sombra esverdeada, cantos arredondados, respiro generoso.</li>
                <li>Rótulo real em todo campo e foco visível em todo elemento interativo.</li>
                <li>Mobile-first: a versão de 375px é entregável de mesmo peso.</li>
                <li>`prefers-reduced-motion` desliga `transform` e mantém `opacity`.</li>
              </ul>
            </Card>

            <Card className={styles.ruleCard}>
              <Badge tone="danger">Nunca</Badge>
              <ul className={styles.ruleList}>
                <li>Verde Broto em texto pequeno sobre branco — reprova em contraste.</li>
                <li>Grade de seis cartõezinhos iguais com ícone, título e parágrafo.</li>
                <li>Sombra cinza neutra, gradiente arco-íris, canto vivo.</li>
                <li>`height: 100vh` no herói — recorta a foto diferente em cada tela.</li>
                <li>Estilo inline no JSX e estilo de componente no `globals.css`.</li>
              </ul>
            </Card>
          </div>
        </Specimen>
      </main>

      <footer className={styles.footer}>
        <BrandMark tone="dark" showTagline />
        <p className={styles.footerText}>
          Design System AgroPeças MT · derivado da prancheta de identidade aprovada.
          Documentação completa em <code>Maturacao/04_design_system.md</code>.
        </p>
      </footer>
    </div>
  );
}
