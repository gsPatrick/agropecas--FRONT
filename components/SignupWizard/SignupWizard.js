'use client';

/**
 * SignupWizard — cadastro em passos.
 *
 * Campos derivados de Maturacao/05_perfis_e_funcoes.md, mais um quarto perfil
 * que o documento não previa e a prática pediu — quem só compra:
 *  · Produtor Rural  → dados básicos de contato e localização
 *  · Loja de Peças   → perfil comercial: nome da loja, CNPJ, dados comerciais
 *  · Prestador       → perfil profissional: quais serviços presta
 *  · Cliente         → só conta, favoritos e mensagens — nenhum campo extra
 *
 * 1. Perfil       → decide os campos dos passos seguintes
 * 2. Seus dados   → identificação e contato
 * 3. Localização  → onde está / onde atende (+ serviços, se prestador)
 * 4. Acesso       → e-mail, senha e aceites
 *
 * O perfil é o primeiro passo de propósito: ele muda o rótulo e o tipo de
 * documento de tudo que vem depois. Perguntar isso no fim obrigaria a
 * reescrever os campos já preenchidos.
 */

import { useState } from 'react';
import Link from 'next/link';
import Stepper from '@/components/Stepper/Stepper';
import AddressFields from '@/components/AddressFields/AddressFields';
import ServiceMarquee from '@/components/ServiceMarquee/ServiceMarquee';
import ServicePicker from '@/components/ServicePicker/ServicePicker';
import Button from '@/components/Button/Button';
import Field from '@/components/Field/Field';
import Input from '@/components/Input/Input';
import PasswordField, { scorePassword } from '@/components/PasswordField/PasswordField';
import Icon from '@/components/Icon/Icon';
import * as auth from '@/lib/dados/auth';
import styles from './SignupWizard.module.css';

/**
 * Em qual passo mora cada campo que a API pode recusar.
 *
 * O envio só acontece no fim, então um erro de CPF (passo 2) chegaria com o
 * usuário olhando o passo 4 e nenhuma mensagem visível. Este mapa devolve a
 * pessoa ao passo do campo errado — sem isso o cadastro trava sem explicação.
 */
const PASSO_DO_CAMPO = {
  nome: 1,
  documento: 1,
  whatsapp: 1,
  telefone: 1,
  email: 3,
  senha: 3,
  consentimentos: 3,
};

/* ⚠️ a máscara só formata o que aparece na tela — `lib/dados/auth.js` já
   limpa tudo para dígitos (whatsapp/telefone) ou envia como veio (documento)
   antes de mandar à API, então mudar a máscara aqui não muda o que é
   enviado */
function maskCpf(digitos) {
  return digitos
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function maskCnpj(digitos) {
  return digitos
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

/** até 11 dígitos vira CPF, dali para cima CNPJ — não trava por perfil porque
    "Autônomo pode informar CPF" mesmo numa conta de loja/prestador */
function maskDocumento(valor) {
  const digitos = valor.replace(/\D/g, '').slice(0, 14);
  return digitos.length > 11 ? maskCnpj(digitos) : maskCpf(digitos);
}

/** (65) 9999-9999 para fixo, (65) 9 9999-9999 para celular — o mesmo formato
    do placeholder que já existia no campo */
function maskTelefone(valor) {
  const digitos = valor.replace(/\D/g, '').slice(0, 11);
  const ddd = digitos.slice(0, 2);
  const resto = digitos.slice(2);

  if (!digitos) return '';
  if (digitos.length <= 2) return `(${ddd}`;
  if (resto.length <= 4) return `(${ddd}) ${resto}`;
  if (digitos.length <= 10) return `(${ddd}) ${resto.slice(0, 4)}-${resto.slice(4)}`;
  return `(${ddd}) ${resto.slice(0, 1)} ${resto.slice(1, 5)}-${resto.slice(5, 9)}`;
}

const STEPS = ['Perfil', 'Seus dados', 'Localização', 'Acesso'];

const PROFILES = [
  {
    id: 'produtor',
    icon: 'tractor',
    title: 'Produtor Rural',
    text: 'Anuncio peças e busco o que preciso.',
  },
  {
    id: 'loja',
    icon: 'store',
    title: 'Loja de Peças',
    text: 'Divulgo meus produtos e recebo contatos.',
  },
  {
    id: 'prestador',
    icon: 'wrench',
    title: 'Prestador de Serviços',
    text: 'Divulgo os serviços que presto.',
  },
  {
    id: 'cliente',
    icon: 'user',
    title: 'Só quero comprar',
    text: 'Não vou anunciar — só buscar, favoritar e conversar.',
  },
];

/* ⚠️ PROVISÓRIO — esta lista NÃO veio da cliente. O documento dela só diz
   "informar quais serviços presta", sem enumerar. Servem como exemplo até a
   lista real chegar; no sistema final devem ser categorias gerenciadas pelo
   Admin (Maturacao/05, §2.4), não constantes de código. */
const SERVICES = [
  'Mecânica agrícola',
  'Elétrica',
  'Hidráulica',
  'Solda',
  'Borracharia',
  'Funilaria',
  'Manutenção preventiva',
  'Atendimento no campo',
];

export default function SignupWizard({ onSwitch, onFinish }) {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState(null);
  const [services, setServices] = useState([]);
  const [address, setAddress] = useState(null);
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  /* os campos de texto ficam num objeto só: o corpo enviado à API é montado a
     partir dele de uma vez, em vez de juntar dez `useState` no submit */
  const [dados, setDados] = useState({
    nome: '',
    documento: '',
    whatsapp: '',
    telefone: '',
    propriedade: '',
    bio: '',
    email: '',
  });
  const [exibirWhatsapp, setExibirWhatsapp] = useState(true);
  const [erros, setErros] = useState({});
  const [enviando, setEnviando] = useState(false);

  const preencher = (campo, mascara) => (evento) => {
    const bruto = evento.target.value;
    const value = mascara ? mascara(bruto) : bruto;
    setDados((atual) => ({ ...atual, [campo]: value }));
    /* o erro do servidor é sobre o valor antigo: manter aceso enquanto a
       pessoa corrige é ruído */
    setErros((atual) => (atual[campo] ? { ...atual, [campo]: undefined } : atual));
  };

  const isStore = profile === 'loja';
  const isProvider = profile === 'prestador';
  const isCompany = isStore || isProvider;
  const last = STEPS.length - 1;

  /* mesmos campos marcados `required` na tela — sem isso o "Continuar"
     avançava com nome/documento/whatsapp ou endereço em branco, e o erro só
     aparecia depois, vindo do servidor no passo de acesso */
  const step1Valido = Boolean(
    dados.nome.trim() && dados.documento.trim() && dados.whatsapp.trim()
  );
  const step2Valido = Boolean(
    address?.cep?.replace(/\D/g, '').length === 8 &&
      address?.numero?.trim() &&
      address?.cidade?.trim()
  );
  const emailValido = /^\S+@\S+\.\S+$/.test(dados.email.trim());

  function toggleService(name) {
    setServices((current) =>
      current.includes(name) ? current.filter((item) => item !== name) : [...current, name]
    );
  }

  async function criarConta() {
    if (enviando) return;

    setErros({});
    setEnviando(true);

    try {
      const sessao = await auth.cadastrar({
        ...dados,
        perfil: profile,
        senha: password,
        aceiteTermos: acceptedTerms,
        exibirWhatsapp,
      });

      /* bio, município e serviços não cabem em /auth/registrar: vão logo
         depois, com o token recém-emitido, sem segurar a tela de sucesso */
      auth.complementarPerfil({ ...dados, endereco: address, servicos: services }, sessao?.tokens?.acesso);

      /* a sessão sobe junto: quem decide o próximo passo é a página, e ela
         precisa saber o e-mail cadastrado e se ele já nasceu verificado para
         escolher entre a confirmação e o sucesso */
      if (onFinish) onFinish(sessao);
    } catch (erro) {
      const campos = erro?.campos || {};
      const temCampo = Object.keys(campos).length > 0;

      setErros(temCampo ? campos : { email: erro?.message || 'Não foi possível criar a conta.' });

      /* volta ao passo do primeiro campo recusado: a mensagem precisa estar
         visível para ser corrigida */
      const passos = Object.keys(campos)
        .map((campo) => PASSO_DO_CAMPO[campo])
        .filter((valor) => valor !== undefined);

      if (passos.length) setStep(Math.min(...passos));
      setEnviando(false);
    }
  }

  function next() {
    if (step < last) setStep(step + 1);
    else criarConta();
  }

  return (
    <div className={styles.root}>
      <Stepper steps={STEPS} current={step} />

      <div className={styles.body} key={step}>
        {step === 0 ? (
          <>
            <header className={styles.head}>
              <h1 className={styles.title}>Qual é o seu perfil?</h1>
              <p className={styles.text}>
                É o que define quais informações vamos pedir a seguir. Todos os perfis
                podem anunciar e buscar na plataforma.
              </p>
            </header>

            <div className={styles.profiles}>
              {PROFILES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`${styles.profile} ${profile === item.id ? styles.profileOn : ''}`}
                  aria-pressed={profile === item.id}
                  onClick={() => setProfile(item.id)}
                >
                  <span className={styles.profileIcon}>
                    <Icon name={item.icon} size={24} />
                  </span>
                  <span className={styles.profileBody}>
                    <span className={styles.profileTitle}>{item.title}</span>
                    <span className={styles.profileText}>{item.text}</span>
                  </span>
                  <span className={styles.check} aria-hidden="true">
                    <Icon name="check" size={13} />
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <header className={styles.head}>
              <h1 className={styles.title}>
                {isStore ? 'Dados da loja' : isProvider ? 'Seu perfil profissional' : 'Seus dados'}
              </h1>
              <p className={styles.text}>
                É o que aparece para quem encontrar os seus anúncios.
              </p>
            </header>

            <div className={styles.fields}>
              <Field
                label={isStore ? 'Nome da loja' : isProvider ? 'Nome ou nome do negócio' : 'Nome completo'}
                htmlFor="cad-nome"
                error={erros.nome}
                required
              >
                <Input
                  id="cad-nome"
                  placeholder={isStore ? 'Ex.: Peças Tangará' : 'Como você quer ser identificado?'}
                  value={dados.nome}
                  onChange={preencher('nome')}
                  invalid={Boolean(erros.nome)}
                />
              </Field>

              <Field
                label={isCompany ? 'CNPJ ou CPF' : 'CPF'}
                htmlFor="cad-doc"
                hint={isCompany ? 'Autônomo pode informar CPF.' : undefined}
                error={erros.documento}
                required
              >
                <Input
                  id="cad-doc"
                  inputMode="numeric"
                  placeholder={isCompany ? '00.000.000/0000-00' : '000.000.000-00'}
                  value={dados.documento}
                  onChange={preencher('documento', maskDocumento)}
                  invalid={Boolean(erros.documento)}
                />
              </Field>

              <Field
                label="WhatsApp"
                htmlFor="cad-zap"
                hint="É o contato principal: o botão do anúncio abre a conversa aqui."
                error={erros.whatsapp}
                required
              >
                <Input
                  id="cad-zap"
                  type="tel"
                  inputMode="numeric"
                  placeholder="(65) 9 9999-9999"
                  autoComplete="tel"
                  value={dados.whatsapp}
                  onChange={preencher('whatsapp', maskTelefone)}
                  invalid={Boolean(erros.whatsapp)}
                />
              </Field>

              <Field label="Telefone adicional" htmlFor="cad-fone" error={erros.telefone}>
                <Input
                  id="cad-fone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="(65) 9999-9999"
                  value={dados.telefone}
                  onChange={preencher('telefone', maskTelefone)}
                  invalid={Boolean(erros.telefone)}
                />
              </Field>
            </div>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <header className={styles.head}>
              <h1 className={styles.title}>
                {isProvider ? 'Serviços e região' : 'Onde você está'}
              </h1>
              <p className={styles.text}>
                {isProvider
                  ? 'Os serviços aparecem no seu perfil e nos filtros de busca.'
                  : 'A localização é um dos filtros de busca da plataforma.'}
              </p>
            </header>

            <div className={styles.fields}>
              <AddressFields idPrefix="cad" onChange={setAddress} />

              {isProvider ? (
                <fieldset className={styles.services}>
                  <legend className={styles.legend}>
                    <span>
                      Serviços que presta
                      {services.length > 0 ? (
                        <span className={styles.count}>{services.length} selecionados</span>
                      ) : null}
                    </span>

                    {services.length > 0 ? (
                      <button
                        type="button"
                        className={styles.seeAll}
                        onClick={() => setPickerOpen(true)}
                      >
                        Editar
                        <Icon name="chevron-right" size={14} />
                      </button>
                    ) : null}
                  </legend>

                  {services.length > 0 ? (
                    <div className={styles.selected}>
                      {services.map((name) => (
                        <button
                          key={name}
                          type="button"
                          className={styles.selectedChip}
                          onClick={() => toggleService(name)}
                          aria-label={`Remover ${name}`}
                        >
                          {name}
                          <Icon name="close" size={13} />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      fullWidth
                      iconLeft="search"
                      onClick={() => setPickerOpen(true)}
                    >
                      Selecionar serviços
                    </Button>
                  )}
                </fieldset>
              ) : null}

              {profile === 'produtor' ? (
                <Field label="Nome da propriedade" htmlFor="cad-fazenda">
                  <Input
                    id="cad-fazenda"
                    placeholder="Opcional"
                    value={dados.propriedade}
                    onChange={preencher('propriedade')}
                  />
                </Field>
              ) : null}

              <Field
                label={isCompany ? 'Sobre o negócio' : 'Sobre você'}
                htmlFor="cad-bio"
                hint="Aparece no seu perfil público. Opcional."
              >
                <Input
                  as="textarea"
                  id="cad-bio"
                  value={dados.bio}
                  onChange={preencher('bio')}
                  placeholder={
                    isProvider
                      ? 'Conte sua experiência e o tipo de máquina que atende.'
                      : 'Uma descrição curta.'
                  }
                />
              </Field>
            </div>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <header className={styles.head}>
              <h1 className={styles.title}>Dados de acesso</h1>
              <p className={styles.text}>Falta só criar a sua senha.</p>
            </header>

            <div className={styles.fields}>
              <Field label="E-mail" htmlFor="cad-email" error={erros.email} required>
                <Input
                  id="cad-email"
                  type="email"
                  placeholder="voce@exemplo.com.br"
                  autoComplete="email"
                  value={dados.email}
                  onChange={preencher('email')}
                  invalid={Boolean(erros.email)}
                />
              </Field>

              <PasswordField
                id="cad-senha"
                value={password}
                onChange={(valor) => {
                  setPassword(valor);
                  setErros((atual) => (atual.senha ? { ...atual, senha: undefined } : atual));
                }}
                error={erros.senha}
                required
              />

              <label className={styles.consent} htmlFor="cad-contato">
                <input
                  className={styles.checkbox}
                  type="checkbox"
                  id="cad-contato"
                  checked={exibirWhatsapp}
                  onChange={(e) => setExibirWhatsapp(e.target.checked)}
                />
                <span>
                  Autorizo exibir meu WhatsApp nos meus anúncios para quem tiver interesse.
                </span>
              </label>

              <label className={styles.consent} htmlFor="cad-termos">
                <input
                  className={styles.checkbox}
                  type="checkbox"
                  id="cad-termos"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  required
                />
                <span>
                  Li e concordo com os{' '}
                  <Link href="/termos" className={styles.consentLink} target="_blank">
                    Termos de Uso
                  </Link>{' '}
                  da AgroPeças MT.
                </span>
              </label>
            </div>
          </>
        ) : null}
      </div>

      <div className={styles.actions}>
        {step > 0 ? (
          <Button variant="outline" size="lg" onClick={() => setStep(step - 1)}>
            Voltar
          </Button>
        ) : null}

        <Button
          size="lg"
          fullWidth
          onClick={next}
          disabled={
            enviando ||
            (step === 0 && !profile) ||
            (step === 1 && !step1Valido) ||
            (step === 2 && !step2Valido) ||
            (step === last && (!acceptedTerms || scorePassword(password) < 1 || !emailValido))
          }
          iconRight={step === last ? undefined : 'arrow-right'}
        >
          {step === last ? (enviando ? 'Criando conta…' : 'Criar conta') : 'Continuar'}
        </Button>
      </div>

      {step === 1 && !step1Valido ? (
        <p className={styles.blocked} role="status">
          Preencha nome, documento e WhatsApp para continuar.
        </p>
      ) : null}

      {step === 2 && !step2Valido ? (
        <p className={styles.blocked} role="status">
          Preencha CEP, número e município para continuar.
        </p>
      ) : null}

      {step === last && !emailValido ? (
        <p className={styles.blocked} role="status">
          Informe um e-mail válido para continuar.
        </p>
      ) : null}

      {step === last && emailValido && !acceptedTerms ? (
        <p className={styles.blocked} role="status">
          Para criar a conta é preciso aceitar os Termos de Uso.
        </p>
      ) : null}

      {/* recusa que não pertence a um campo (consentimento, por exemplo) usa
          o mesmo aviso que já existia para o aceite */}
      {erros.consentimentos ? (
        <p className={styles.blocked} role="alert">
          {erros.consentimentos}
        </p>
      ) : null}

      <ServicePicker
        open={pickerOpen}
        items={SERVICES}
        selected={services}
        onToggle={toggleService}
        onClear={() => setServices([])}
        onClose={() => setPickerOpen(false)}
      />

      <p className={styles.footer}>
        Já tem conta?{' '}
        <button type="button" className={styles.footerLink} onClick={onSwitch}>
          Entrar
        </button>
      </p>
    </div>
  );
}
