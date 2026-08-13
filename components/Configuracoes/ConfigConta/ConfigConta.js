'use client';

/**
 * Configurações → Conta.
 *
 * Dados de acesso. Virou tela de LEITURA — o mock tinha e-mail e telefone
 * editáveis, mas não existe endpoint para trocar nenhum dos dois: e-mail é o
 * login (trocar exigiria um fluxo de verificação próprio, que não existe
 * ainda) e telefone/CPF não têm rota de edição fora do cadastro. Mostrar um
 * campo editável que não salva é pior do que mostrar só o dado — por isso os
 * três campos ficam como estavam, sem formulário fingindo que grava.
 */

import PainelCartao from '@/components/PainelCartao/PainelCartao';
import Field from '@/components/Field/Field';
import Input from '@/components/Input/Input';
import Icon from '@/components/Icon/Icon';
import { useSessao } from '@/lib/sessao';
import styles from './ConfigConta.module.css';

export default function ConfigConta() {
  const { usuario } = useSessao();

  if (!usuario) return null;

  return (
    <div className={styles.form}>
      {!usuario.emailVerificado ? (
        <div className={styles.pendencia}>
          <Icon name="bell" size={17} />

          <div className={styles.pendenciaTexto}>
            <strong>E-mail ainda não confirmado</strong>
            <span>Sem ele, não há como recuperar a senha se você perder o acesso.</span>
          </div>
        </div>
      ) : null}

      <PainelCartao titulo="Dados de acesso" icone="user">
        <div className={styles.campos}>
          <Field label="E-mail" htmlFor="email" hint="É o seu login — não pode ser trocado por aqui">
            <Input id="email" type="email" value={usuario.email} readOnly />
          </Field>

          <Field label="Telefone" htmlFor="telefone" hint="Editável em Minha propriedade/Atendimento/Meus serviços">
            <Input id="telefone" value={usuario.telefone || 'Não informado'} readOnly />
          </Field>
        </div>
      </PainelCartao>
    </div>
  );
}
