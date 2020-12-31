#!/bin/bash

echo "Starting tests with promgrep activated. Check http://0.0.0.0:8880/metrics"

/launch_resolve_estudantes_tests.sh | promgrep --output $PROMGREP_OUTPUT \
                       --summary "accounts_created@Account.*created successfully" \
                       --summary "tests_launched@Launching tests for" \
                       --gauge "active_users@ACTIVE USERS: ([0-9]+)" \
                       --gauge "chrome_processes@CHROME PROCESSES: ([0-9]+)" \
                       --summary "timeout_error@TimeoutError: waiting for" \
                       --summary "tests_failed@Tests:\\s+([0-9]+) failed" \
                       --summary "test_seconds@Time:\\s+([0-9\\.]+) s" \
                       --summary "question_started@question-started(=[0-9]+)" \
                       --summary "question_finished_millis@question-finished(=[0-9]+).*time=([0-9]+)ms" \
                       --summary "question_transition_millis@question-transition(=[0-9]+).*time=([0-9]+)ms" \
                       --summary "test_finished@test-finished" \
                       --summary "browser_login@user logged in" \
                       --summary "unsupported_question_type@tipo-questao-nao-suportada(=[0-9]+)" \
                       --summary "questao_subjetiva_detectada@-questaosubjetiva(=[0-9]+)-textresp" \
                       --summary "questao_multiplaescolha_detectada@-questaomultiplaescolha(=[0-9+])-selectionopt" \
                       --summary "fail_qtde_tela_grava_difere@QTDE_QUESTOES_GRAVADA_DIFERE_TELA" \
                       --summary "fail_resposta_gravada_difere_tela@RESPOSTA_GRAVADA_DIFERE_DA_TELA" \
                       --summary "fail_prova_gravada_not_found@PROVA_GRAVADA_NAO_ENCONTRADA" \
                       --summary "fail_texto_gravado_curto@QUESTAO_TEXTO_GRAVADA_MUITO_CURTA" \
                       --summary "fail_prova_encerrada@PROVA_JAH_ENCERRADA" \
                       --summary "fail_questao_fora_ordem@QUESTAO_FORA_ORDEM" \
                       --summary "prova_conferida_gravacao_sucesso@prova-tela-conferida-com-gravada-sucesso" \
                       --summary "question_action@-action-(.*)" \
                       --summary "test_will_exit@Will exit in a minute"


# echo "test" | promgrep

