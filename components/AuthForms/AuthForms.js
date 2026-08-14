'use client';

/**
 * AuthForms — os quatro formulários das telas de acesso.
 * Ficam juntos porque compartilham cabeçalho, espaçamentos e rodapé de troca.
 *
 * Os dados vêm de `lib/dados/auth.js`; o desenho não mudou por causa disso —
 * erro de API é pintado nos `Field` que já existiam, e o estado de envio usa o
 * `disabled` que o `Button` já repassa para o elemento.
 */

import { useEffect, useRef, useState } from 'react';
import Button from '@/components/Button/Button';
import Field from '@/components/Field/Field';
import Input from '@/components/Input/Input';
import Icon from '@/components/Icon/Icon';
import PasswordField, { scorePassword } from '@/components/PasswordField/PasswordField';
import * as auth from '@/lib/dados/auth';
import styles from './AuthForms.module.css';

/**
 * Erro da API → mensagem no campo certo.
 *
 * `campos` vem do servidor ({ email: 'Já está em uso.' }). Quando o erro não é
 * de campo nenhum (credencial inválida, servidor fora), ele cai no campo
 * indicado em `padrao` — é o único lugar de erro que o desenho oferece, e
 * inventar um bloco novo mudaria a tela.
 */
function erroPorCampo(erro, padrao) {
  const campos = { ...(erro?.campos || {}) };
  if (!Object.keys(campos).length) campos[padrao] = erro?.message || 'Algo deu errado.';
  return campos;
}

function Head({ eyebrow, title, text }) {
  return (
    <header className={styles.head}>
      {eyebrow ? <span className={styles.eyebrow}>{eyebrow}</span> : null}
      <h1 className={styles.title}>{title}</h1>
      {text ? <p className={styles.text}>{text}</p> : null}
    </header>
  );
}

export function LoginForm({ onForgot, onSwitch, onSubmit }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [erros, setErros] = useState({});
  const [enviando, setEnviando] = useState(false);

  const preenchido = Boolean(email.trim() && senha.trim());

  async function submeter(evento) {
    evento.preventDefault();
    if (enviando) return;

    setErros({});
    setEnviando(true);

    try {
      const sessao = await auth.entrar({ email, senha });
      /* o token já está guardado: só então a tela avança para o sucesso.
         `sessao` sobe para a página decidir o destino — cliente vai para
         /conta, os demais para /painel (ver `rotaDaConta` em lib/sessao) */
      if (onSubmit) onSubmit(sessao);
    } catch (erro) {
      /* credencial inválida não diz QUAL dos dois está errado, de propósito
         (isso entregaria quais e-mails existem): a mensagem fica na senha */
      setErros(erroPorCampo(erro, 'senha'));
      setEnviando(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={submeter}>
      <Head eyebrow="Entrar" title="Que bom te ver de novo" text="Acesse sua conta para continuar." />

      <div className={styles.fields}>
        <Field label="E-mail" htmlFor="login-email" error={erros.email} required>
          <Input
            id="login-email"
            type="email"
            placeholder="voce@exemplo.com.br"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            invalid={Boolean(erros.email)}
          />
        </Field>

        <Field label="Senha" htmlFor="login-senha" error={erros.senha} required>
          <div className={styles.senhaWrap}>
            <Input
              id="login-senha"
              type={senhaVisivel ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              invalid={Boolean(erros.senha)}
              className={styles.senhaInput}
            />

            <button
              type="button"
              className={styles.senhaToggle}
              onClick={() => setSenhaVisivel((atual) => !atual)}
              aria-label={senhaVisivel ? 'Ocultar senha' : 'Mostrar senha'}
              tabIndex={-1}
            >
              <Icon name={senhaVisivel ? 'eye-off' : 'eye'} size={18} />
            </button>
          </div>
        </Field>

        <button type="button" className={styles.inlineLink} onClick={onForgot}>
          Esqueci minha senha
        </button>
      </div>

      <Button type="submit" size="lg" fullWidth disabled={enviando || !preenchido}>
        {enviando ? 'Entrando…' : 'Entrar'}
      </Button>

      <p className={styles.footer}>
        Ainda não tem conta?{' '}
        <button type="button" className={styles.footerLink} onClick={onSwitch}>
          Criar conta gratuita
        </button>
      </p>
    </form>
  );
}

const PROFILES = [
  { id: 'produtor', label: 'Produtor' },
  { id: 'loja', label: 'Loja de peças' },
  { id: 'prestador', label: 'Prestador' },
];

export function SignupForm({ onSwitch, onSubmit }) {
  const [profile, setProfile] = useState('produtor');

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        if (onSubmit) onSubmit();
      }}
    >
      <Head eyebrow="Criar conta" title="Comece em poucos minutos" text="O cadastro é gratuito." />

      <div className={styles.fields}>
        <fieldset className={styles.profiles}>
          <legend className={styles.legend}>Eu sou</legend>
          <div className={styles.chips}>
            {PROFILES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`${styles.chip} ${profile === item.id ? styles.chipOn : ''}`}
                aria-pressed={profile === item.id}
                onClick={() => setProfile(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </fieldset>

        <Field label="Nome completo" htmlFor="cad-nome" required>
          <Input id="cad-nome" placeholder="Como você se chama?" autoComplete="name" />
        </Field>

        <Field label="WhatsApp" htmlFor="cad-zap" hint="É por aqui que você recebe as respostas." required>
          <Input id="cad-zap" type="tel" placeholder="(65) 9 9999-9999" autoComplete="tel" />
        </Field>

        <Field label="E-mail" htmlFor="cad-email" required>
          <Input id="cad-email" type="email" placeholder="voce@exemplo.com.br" autoComplete="email" />
        </Field>

        <Field label="Senha" htmlFor="cad-senha" hint="Mínimo de 8 caracteres." required>
          <Input id="cad-senha" type="password" placeholder="••••••••" autoComplete="new-password" />
        </Field>
      </div>

      <Button type="submit" size="lg" fullWidth>
        Criar conta
      </Button>

      <p className={styles.footer}>
        Já tem conta?{' '}
        <button type="button" className={styles.footerLink} onClick={onSwitch}>
          Entrar
        </button>
      </p>
    </form>
  );
}

export function ForgotForm({ onSubmit, onSwitch }) {
  const [email, setEmail] = useState('');
  const [erros, setErros] = useState({});
  const [enviando, setEnviando] = useState(false);

  async function submeter(evento) {
    evento.preventDefault();
    if (enviando) return;

    setErros({});
    setEnviando(true);

    try {
      await auth.solicitarCodigo(email);
      /* a API responde igual para e-mail existente ou não — de propósito.
         A tela segue para o código nos dois casos */
      if (onSubmit) onSubmit(email.trim());
    } catch (erro) {
      setErros(erroPorCampo(erro, 'email'));
      setEnviando(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={submeter}>
      <Head
        eyebrow="Recuperar acesso"
        title="Esqueceu a senha?"
        text="Informe seu e-mail e enviamos um código de verificação."
      />

      <div className={styles.fields}>
        <Field label="E-mail" htmlFor="rec-email" error={erros.email} required>
          <Input
            id="rec-email"
            type="email"
            placeholder="voce@exemplo.com.br"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            invalid={Boolean(erros.email)}
          />
        </Field>
      </div>

      <Button type="submit" size="lg" fullWidth iconRight="arrow-right" disabled={enviando}>
        {enviando ? 'Enviando…' : 'Enviar código'}
      </Button>

      <p className={styles.footer}>
        Lembrou a senha?{' '}
        <button type="button" className={styles.footerLink} onClick={onSwitch}>
          Voltar para o login
        </button>
      </p>
    </form>
  );
}

export function ResetPasswordForm({ onSubmit, onSwitch, email, codigo }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [erros, setErros] = useState({});
  const [enviando, setEnviando] = useState(false);

  const tooShort = password.length > 0 && password.length < 8;
  const mismatch = confirm.length > 0 && confirm !== password;
  const ready = password.length >= 8 && confirm === password && scorePassword(password) >= 1;

  async function submeter(evento) {
    evento.preventDefault();
    if (!ready || enviando) return;

    setErros({});
    setEnviando(true);

    try {
      /* e-mail e código vêm dos passos anteriores: a API redefine numa chamada
         só, então o código precisa chegar aqui junto */
      await auth.redefinirSenha(email, codigo, password);
      if (onSubmit) onSubmit();
    } catch (erro) {
      setErros(erroPorCampo(erro, 'senha'));
      setEnviando(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={submeter}>
      <Head
        eyebrow="Nova senha"
        title="Crie sua nova senha"
        text="Ela substitui a anterior em todos os seus acessos."
      />

      <div className={styles.fields}>
        <PasswordField
          id="nova-senha"
          label="Nova senha"
          value={password}
          onChange={setPassword}
          error={erros.senha || erros.codigo}
          required
        />

        <Field
          label="Repita a nova senha"
          htmlFor="nova-senha-confirma"
          error={mismatch ? 'As senhas não são iguais.' : undefined}
          required
        >
          <Input
            id="nova-senha-confirma"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            invalid={mismatch}
          />
        </Field>
      </div>

      <Button type="submit" size="lg" fullWidth disabled={!ready || enviando}>
        {enviando ? 'Salvando…' : 'Salvar nova senha'}
      </Button>

      <p className={styles.footer}>
        {tooShort ? (
          <span className={styles.timer}>A senha precisa ter ao menos 8 caracteres.</span>
        ) : (
          <button type="button" className={styles.footerLink} onClick={onSwitch}>
            Voltar para o login
          </button>
        )}
      </p>
    </form>
  );
}

const OTP_LENGTH = 6;

/**
 * Contador regressivo do reenvio.
 *
 * Existe como hook porque a trava de tempo é o que separa "reenviar" de
 * "disparador de e-mail": sem ela, um clique repetido vira uma fila de
 * mensagens e a API responde com bloqueio por excesso de requisições —
 * punindo justamente quem só queria o código de novo.
 */
function useContagem(inicial) {
  const [seconds, setSeconds] = useState(inicial);

  useEffect(() => {
    if (seconds <= 0) return undefined;
    const id = setTimeout(() => setSeconds((value) => value - 1), 1000);
    return () => clearTimeout(id);
  }, [seconds]);

  return [seconds, setSeconds];
}

/**
 * As seis caixas do código.
 *
 * Extraídas para serem usadas pelo OTP da recuperação de senha E pela
 * confirmação de e-mail: são a mesma interação (avançar ao digitar, voltar no
 * backspace, aceitar colagem) e duplicá-la garantiria que a correção feita num
 * lugar não chegasse no outro. A marcação é a de sempre — as classes e o
 * comportamento não mudaram.
 */
function CaixasOtp({ digits, setDigits }) {
  const refs = useRef([]);

  function setDigit(index, value) {
    const clean = value.replace(/\D/g, '').slice(-1);
    setDigits((current) => {
      const next = [...current];
      next[index] = clean;
      return next;
    });
    if (clean && index < OTP_LENGTH - 1) refs.current[index + 1]?.focus();
  }

  function onKeyDown(index, event) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  }

  function onPaste(event) {
    const text = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!text) return;
    event.preventDefault();
    const next = Array(OTP_LENGTH).fill('');
    text.split('').forEach((char, i) => {
      next[i] = char;
    });
    setDigits(next);
    refs.current[Math.min(text.length, OTP_LENGTH - 1)]?.focus();
  }

  return (
    <div className={styles.otp} onPaste={onPaste}>
      {digits.map((digit, index) => (
        <input
          // eslint-disable-next-line react/no-array-index-key
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          className={styles.otpBox}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={digit}
          aria-label={`Dígito ${index + 1} de ${OTP_LENGTH}`}
          onChange={(e) => setDigit(index, e.target.value)}
          onKeyDown={(e) => onKeyDown(index, e)}
        />
      ))}
    </div>
  );
}

/**
 * Confirmação do e-mail recém-cadastrado.
 *
 * A conta nasce com o e-mail pendente e a API já mandou o código no registro —
 * esta tela é onde ele é gasto. Reusa a moldura (`AuthLayout`), o cabeçalho, as
 * caixas de dígito e o botão dos outros passos: é o mesmo momento do fluxo,
 * então não pode parecer outro produto.
 *
 * "Confirmar depois" existe porque a conta JÁ está criada e utilizável para
 * navegar; barrar a pessoa aqui transformaria um cadastro concluído numa
 * parede. O que exige e-mail verificado é barrado depois, pela própria API
 * (`exigirVerificado`), no momento em que a função for usada.
 */
export function ConfirmEmailForm({ email, onSubmit, onSkip }) {
  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(''));
  const [seconds, setSeconds] = useContagem(45);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [reenviando, setReenviando] = useState(false);

  const complete = digits.every(Boolean);

  async function submeter(evento) {
    evento.preventDefault();
    if (!complete || enviando) return;

    setErro('');
    setEnviando(true);

    try {
      await auth.confirmarEmail(email, digits.join(''));
      if (onSubmit) onSubmit();
    } catch (falha) {
      setErro(falha?.campos?.codigo || falha?.message || 'Código inválido.');
      setEnviando(false);
    }
  }

  async function reenviar() {
    if (reenviando || seconds > 0) return;

    setErro('');
    setReenviando(true);
    /* a trava sobe ANTES da resposta: o clique já foi gasto, e esperar a API
       para travar deixaria a janela aberta para uma sequência de cliques */
    setSeconds(45);

    try {
      await auth.reenviarConfirmacao(email);
    } catch {
      setErro('Não foi possível reenviar agora. Tente em instantes.');
    } finally {
      setReenviando(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={submeter}>
      <Head
        eyebrow="Verificação"
        title="Confirme seu e-mail"
        text={
          email
            ? `Enviamos um código de 6 dígitos para ${email}.`
            : 'Enviamos um código de 6 dígitos para o seu e-mail.'
        }
      />

      <CaixasOtp digits={digits} setDigits={setDigits} />

      <Button type="submit" size="lg" fullWidth disabled={!complete || enviando}>
        {enviando ? 'Confirmando…' : 'Confirmar e-mail'}
      </Button>

      <p className={styles.footer}>
        {/* o erro ocupa o mesmo lugar do contador: o bloco de dígitos não tem
            campo com slot de erro */}
        {erro ? (
          <span className={styles.timer} role="alert">
            {erro}
          </span>
        ) : seconds > 0 ? (
          <span className={styles.timer}>Reenviar em {seconds}s</span>
        ) : (
          <button type="button" className={styles.footerLink} onClick={reenviar} disabled={reenviando}>
            {reenviando ? 'Reenviando…' : 'Reenviar código'}
          </button>
        )}
      </p>

      <p className={styles.footer}>
        <button type="button" className={styles.footerLink} onClick={onSkip}>
          Confirmar depois
        </button>
      </p>
    </form>
  );
}

export function OtpForm({ onSubmit, onResend, email }) {
  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(''));
  const [seconds, setSeconds] = useContagem(45);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const complete = digits.every(Boolean);

  async function submeter(evento) {
    evento.preventDefault();
    if (!complete || enviando) return;

    const codigo = digits.join('');
    setErro('');
    setEnviando(true);

    try {
      /* conferir antes de pedir a senha nova evita o usuário digitar a senha
         duas vezes só para descobrir que o código estava errado */
      await auth.conferirCodigo(email, codigo);
      if (onSubmit) onSubmit(codigo);
    } catch (falha) {
      setErro(falha?.campos?.codigo || falha?.message || 'Código inválido.');
      setEnviando(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={submeter}>
      <Head
        eyebrow="Verificação"
        title="Digite o código"
        text="Enviamos um código de 6 dígitos para o seu e-mail."
      />

      <CaixasOtp digits={digits} setDigits={setDigits} />

      <Button type="submit" size="lg" fullWidth disabled={!complete || enviando}>
        {enviando ? 'Conferindo…' : 'Confirmar'}
      </Button>

      <p className={styles.footer}>
        {/* o erro do código ocupa o mesmo lugar do contador: não há campo
            com slot de erro no bloco de dígitos */}
        {erro ? (
          <span className={styles.timer} role="alert">
            {erro}
          </span>
        ) : seconds > 0 ? (
          <span className={styles.timer}>Reenviar em {seconds}s</span>
        ) : (
          <button
            type="button"
            className={styles.footerLink}
            onClick={() => {
              setSeconds(45);
              setErro('');
              /* reenviar é a mesma solicitação do passo anterior; o servidor
                 invalida o código antigo */
              auth.solicitarCodigo(email).catch(() => setErro('Não foi possível reenviar agora.'));
              if (onResend) onResend();
            }}
          >
            Reenviar código
          </button>
        )}
      </p>
    </form>
  );
}
