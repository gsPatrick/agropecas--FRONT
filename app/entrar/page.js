'use client';

/**
 * /entrar — fluxo de acesso em passos, num palco só.
 *
 * gate       70/30  ← entrada padrão, sempre
 * login      50/50
 * cadastro   50/50
 * esqueci    60/40
 * otp        60/40
 *
 * A largura da coluna da foto é o único valor que muda entre passos; o painel
 * troca de conteúdo com um crossfade curto por cima da transição do grid.
 * Os dois tempos são diferentes de propósito: o palco leva 850ms, o conteúdo
 * 320ms. Se fossem iguais, o texto novo entraria enquanto as colunas ainda se
 * movem e a leitura ficaria instável.
 */

import { useState } from 'react';
import AuthLayout from '@/components/AuthLayout/AuthLayout';
import AuthGate from '@/components/AuthGate/AuthGate';
import AuthSuccess from '@/components/AuthSuccess/AuthSuccess';
import {
  LoginForm,
  ForgotForm,
  OtpForm,
  ResetPasswordForm,
  ConfirmEmailForm,
} from '@/components/AuthForms/AuthForms';
import SignupWizard from '@/components/SignupWizard/SignupWizard';
import { rotaDaConta } from '@/lib/sessao';
import styles from './page.module.css';

const SPLITS = {
  gate: '70%',
  login: '50%',
  cadastro: '50%',
  esqueci: '60%',
  otp: '60%',
  'nova-senha': '60%',
  /* a confirmação de e-mail é o mesmo tipo de passo do OTP: mesma proporção */
  'confirmar-email': '60%',
  /* na conclusão a foto vai a 100% (ver `overlay` no AuthLayout) */
  sucesso: '100%',
  cadastrado: '100%',
};

export default function EntrarPage() {
  const [step, setStep] = useState('gate');
  /* a recuperação de senha é UMA operação em três telas: o e-mail digitado em
     "esqueci" e o código conferido no OTP só são gastos na última chamada,
     então precisam viver acima dos formulários */
  const [recuperacao, setRecuperacao] = useState({ email: '', codigo: '' });
  /* o e-mail recém-cadastrado, para a tela de confirmação. Vem do wizard e não
     de um campo novo: pedir de novo o que a pessoa acabou de digitar é o tipo
     de atrito que faz abandonar o cadastro no último passo */
  const [emailCadastrado, setEmailCadastrado] = useState('');
  /* onde o "Tudo certo" manda depois: painel de quem anuncia, /conta de quem
     só compra. Calculado no momento do login/cadastro, não lido de novo
     depois — a sessão pode levar um instante para propagar ao store */
  const [destino, setDestino] = useState('/painel');
  /* A intro do clip-path é só de chegada: quem volta de um formulário vê o
     palco se reajustando, não a imagem abrindo do zero de novo. */
  const [arrived, setArrived] = useState(false);

  function go(next) {
    setArrived(true);
    setStep(next);
  }

  const back = {
    login: () => go('gate'),
    cadastro: () => go('gate'),
    esqueci: () => go('login'),
    otp: () => go('esqueci'),
    'nova-senha': () => go('login'),
    /* na confirmação não há volta: a conta já foi criada e voltar ao wizard
       tentaria cadastrar o mesmo e-mail de novo */
  }[step];

  /* na conclusão não há volta: o caminho é adiante, para o painel */
  const done = step === 'sucesso' || step === 'cadastrado';

  return (
    <AuthLayout
      split={SPLITS[step] || '50%'}
      intro={step === 'gate' && !arrived}
      onBack={back}
      hideBack={done}
      overlay={
        done ? (
          step === 'cadastrado' ? (
            <AuthSuccess
              title="Conta criada"
              text={
                destino === '/conta'
                  ? 'Bem-vindo à AgroPeças MT. Estamos abrindo sua conta.'
                  : 'Bem-vindo à AgroPeças MT. Estamos abrindo o seu painel.'
              }
              to={destino}
            />
          ) : (
            <AuthSuccess
              text={destino === '/conta' ? 'Estamos abrindo sua conta.' : undefined}
              to={destino}
            />
          )
        ) : null
      }
    >
      {/* a key remonta o bloco a cada passo, disparando o fade de entrada */}
      <div className={styles.step} key={step}>
        {step === 'gate' ? <AuthGate onChoose={(choice) => go(choice)} /> : null}

        {step === 'login' ? (
          <LoginForm
            onForgot={() => go('esqueci')}
            onSwitch={() => go('cadastro')}
            onSubmit={(sessao) => {
              setDestino(rotaDaConta(sessao?.perfil?.tipo));
              go('sucesso');
            }}
          />
        ) : null}

        {step === 'cadastro' ? (
          <SignupWizard
            onSwitch={() => go('login')}
            onFinish={(sessao) => {
              setEmailCadastrado(sessao?.usuario?.email || '');
              setDestino(rotaDaConta(sessao?.perfil?.tipo));

              /* a conta nasce com o e-mail pendente, então o caminho normal é
                 a confirmação. O `emailVerificado` é checado mesmo assim: se
                 um dia o servidor passar a verificar no ato (convite, login
                 social), esta tela vira um passo vazio — e passo vazio é pior
                 do que passo nenhum */
              go(sessao?.usuario?.emailVerificado ? 'cadastrado' : 'confirmar-email');
            }}
          />
        ) : null}

        {step === 'confirmar-email' ? (
          <ConfirmEmailForm
            email={emailCadastrado}
            onSubmit={() => go('cadastrado')}
            onSkip={() => go('cadastrado')}
          />
        ) : null}

        {step === 'esqueci' ? (
          <ForgotForm
            onSubmit={(email) => {
              setRecuperacao({ email, codigo: '' });
              go('otp');
            }}
            onSwitch={() => go('login')}
          />
        ) : null}

        {step === 'otp' ? (
          <OtpForm
            email={recuperacao.email}
            onSubmit={(codigo) => {
              setRecuperacao((atual) => ({ ...atual, codigo }));
              go('nova-senha');
            }}
          />
        ) : null}

        {step === 'nova-senha' ? (
          <ResetPasswordForm
            email={recuperacao.email}
            codigo={recuperacao.codigo}
            onSubmit={() => go('login')}
            onSwitch={() => go('login')}
          />
        ) : null}

      </div>
    </AuthLayout>
  );
}
