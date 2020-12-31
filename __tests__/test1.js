const { fail } = require("assert");
const mkdirp = require("mkdirp");
const utils = require("/app/__tests__/utils");

const timeout = process.env.JEST_TEST_TIMEOUT;
const appAlunosURL = process.env.APP_ALUNOS_URL;
const email = process.env.EMAIL;
const password = process.env.PASSWORD;
let lastlog = "init";

const screenshotBase = "/app/screenshots/" + process.env.BROWSERID + "/";
if (process.env.TAKE_SCREENSHOTS == "true") {
  mkdirp.sync(screenshotBase);
}

const resolveTesteIdByURL = async (page) => {
  return page.evaluate(() => {
    const pathArr = window.location.pathname.split(/\//g);
    if (pathArr.length >= 3) {
      return pathArr[2];
    }
    return null;
  });
};

const resolveLoggedUserData = async (page) => {
  return page.evaluate(() => {
    const ud = window.localStorage["userData"];
    if (ud == null) {
      return { err: "USER IS NULL" };
    }
    user = JSON.parse(ud);
    return user;
  });
};

describe(
  "Usuários Respondendo Testes",
  () => {
    let page;

    beforeAll(async (done) => {
      try {
        //LOGIN
        log("create new browser tab: " + appAlunosURL);
        page = await global.__BROWSER__.newPage();
        await page.setViewport({ width: 1024, height: 768 });
        await page.goto(appAlunosURL);

        await page.waitFor(2000);
        log("fill login credentials. Email: " + email + ". Senha: " + password);
        await page.waitForSelector("input[type=email]");
        await page.waitFor(2000);
        await page.type("input[type=email]", email);
        await utils.screenshot(page, screenshotBase, "login0");
        await page.type("input[type=password]", password);
        await utils.screenshot(page, screenshotBase, "login1");
        await page.waitForSelector("button");
        await page.click("button[type=submit]");
        await utils.screenshot(page, screenshotBase, "login2");
        log("submit login form");
        await page.waitForSelector(".sair-button");
        await utils.screenshot(page, screenshotBase, "login3");
        log("user logged in");
        await page.waitFor(3000);
      } catch (error) {
        log("beforeall-exception-detected-" + error + "-lastlog-" + lastlog);
        await utils.screenshot(page, screenshotBase, "beforeall-exit-error-try-catch");
        await utils.sendAuditScreenshot(
          page,
          screenshotBase,
          "audit",
          "0000",
          "0000",
          "0000-login-error-try-catch-" + email + "-lastlog-" + lastlog
        );
        const errorDetailed = "EXCEPTION_INESPERADA-DETAILS: " + error;
        await utils.saveAuditLog({
          estudanteId: "0000",
          testeId: "0000",
          questaoId: "0000",
          resposta: "_BY_PASSED_",
          timestampAtualizacaoResposta: new Date().getTime(),
          info: errorDetailed,
          name: "beforeall-exception-detected",
          lastlog: lastlog,
        });

        throw error;
      }
      done();
    }, 30000);

    afterAll(async () => {
      await page.close();
    });

    it(
      "find test and answer",
      async () => {
        let estudanteId = null;
        let testeId = null;
        try {
          //GET CONTEXT
          log("resolve-logged-user-data");
          const usuario = await resolveLoggedUserData(page);
          estudanteId = usuario.id;

          log("logged-user-data: " + usuario);

          //CLICK TEST MENU
          log("click-link-Testes");
          await utils.clickByText(page, "Provas");
          await utils.screenshot(page, screenshotBase, "2testes1");

          log("waiting-button-teste-box");
          await page.waitForSelector(".btn-primary-acessar");
          await page.waitFor(1000);

          // await utils.sendAuditScreenshot(page, screenshotBase, "audit", estudanteId, "0000", "after-click-btn-primary-acessar");

          await page.click(".btn-primary-acessar");
          log("clicked-teste-box");
          await page.waitForSelector(".virologia_cnt");

          // await utils.sendAuditScreenshot(page, screenshotBase, "audit", estudanteId, "0000", "0000-after-wait-for-virologia_cnt");
          await utils.screenshot(page, screenshotBase, "2testes2");

          testeId = await resolveTesteIdByURL(page);
          if (!testeId) {
            throw "TESTEID_NOT_FOUND_IN_URL";
          }
          let boxNota = await page.evaluate(() => document.querySelector(".box-nota"));
          if (boxNota) {
            // await utils.sendAuditScreenshot(page, screenshotBase, "audit", estudanteId, testeId, "0000-prova-ja-encerrada");
            throw new Error("PROVA_JAH_ENCERRADA");
          }

          //CLICK INICIAR PROVA
          log("wait-actionArea");
          await page.waitForSelector(".actionArea button");
          log("showed-iniciar-prova-agora");
          // await utils.sendAuditScreenshot(page, screenshotBase, "audit", estudanteId, testeId, "0000-after-wait-action-iniciar-prova");

          await utils.scrollToEnd(page);
          await page.waitFor(2000);
          await page.waitForSelector(".actionArea button");
          await utils.screenshot(page, screenshotBase, "iniciar-prova-click");
          // await utils.sendAuditScreenshot(page, screenshotBase, "audit", estudanteId, testeId, "0000-before-click-iniciar-prova");
          await page.click(".actionArea button");
          log("clicked-iniciar-prova");

          //TEST SCREEN OPEN
          log("wait-virologia_cnt");
          await page.waitForSelector(".virologia_cnt h1");
          // await utils.sendAuditScreenshot(page, screenshotBase, "audit", estudanteId, testeId, "0000-after-wait-for-virologia_cnt-h1");
          await page.waitFor(2000);
          const pageHeight = await page.evaluate(() => {
            const body = document.body;
            const html = document.documentElement;
            return Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight);
          });

          // const timeInQuestionMillis = (((pageHeight/768) * 20) + ((Math.random()*50))) * 1000
          const minQuestionTime = parseFloat(process.env.MIN_QUESTION_TIME);
          const maxQuestionTime =
            parseFloat(process.env.MAX_QUESTION_TIME) + (pageHeight / 768.0) * (parseFloat(process.env.MAX_QUESTION_TIME) / 4.0);
          log("minQuestionTime=" + minQuestionTime + "; maxQuestionTime=" + maxQuestionTime + "; pageHeight=" + pageHeight);

          let hasMoreQuestions = true;
          let sc = 1;
          let lastClickTime = 0;
          let questionNumber = 0;
          let totalQuestions = 0;
          let previousQuestionNumber = 0;

          var selectedQuestionOptions = new Map();
          // await utils.sendAuditScreenshot(page, screenshotBase, "audit", estudanteId, testeId, "0000-first-question-test-has-started");

          //ANSWER QUESTIONS
          while (hasMoreQuestions) {
            //LAST SCREEN DETECTED

            //VALIDATE SCREEN INPUTS WITH SERVER STATE
            let resultadoArea = await page.$(".teste-resultado-area"); // will have because in the previous loop there was a `waitForSelector(".teste-resultado-area")`
            if (resultadoArea != null) {
              log(sc + "-questao" + questionNumber + "-final-prova");
              log(sc + "-test-finished-id=" + testeId);
              await utils.screenshot(page, screenshotBase, "-resultados");

              let provaGravada = await page.evaluate(
                async (provaId, backendURL) => {
                  let user = { id: -1 };
                  try {
                    ud = window.localStorage["userData"];
                    if (ud == null) {
                      return { err: "USER IS NULL" };
                    }
                    user = JSON.parse(ud);
                    const authData = JSON.parse(window.localStorage["[manuh-retained]session/usuario"]);
                    let response = await fetch(`${backendURL}/api/v1/testes/${provaId}/estudante/${user.id}/latest`, {
                      redirect: "follow",
                      headers: {
                        authorization: "Bearer " + authData.token,
                      },
                    });
                    let data = await response.json();
                    return data;
                  } catch (e) {
                    return {
                      err: e + " " + `${backendURL}/api/v1/testes/${provaId}/estudante/${user.id}/latest`,
                    };
                  }
                },
                testeId,
                process.env.APP_BACKEND_URL
              );

              // log(">>>>> AFTER EVAL " + JSON.stringify(provaGravada.testeRealizado.questoes));

              if (
                provaGravada == null ||
                provaGravada.err != null ||
                provaGravada.testeRealizado == null ||
                provaGravada.testeRealizado.questoes == null
              ) {
                throw "PROVA_GRAVADA_NAO_ENCONTRADA-provaid-" + testeId + "-email-" + email + "-" + JSON.stringify(provaGravada);
              }

              // console.log(">>>>>PROVA GRAVADA ENCONTRADA " + JSON.stringify(provaGravada))
              // console.log("Clicked options: " + JSON.stringify(selectedQuestionOptions))

              nrquestoesGravada = provaGravada.testeRealizado.questoes.length;
              if (nrquestoesGravada != selectedQuestionOptions.size) {
                const errorDetailed =
                  "QTDE_QUESTOES_GRAVADA_DIFERE_TELA-[" + selectedQuestionOptions.size + "]-GRAVADA-[" + nrquestoesGravada + "]";
                await utils.saveAuditLog({
                  estudanteId,
                  testeId,
                  questaoId: "0000",
                  resposta: "_BY_PASSED_",
                  timestampAtualizacaoResposta: new Date().getTime(),
                  info: errorDetailed,
                  name: "QTDE_QUESTOES_GRAVADA_DIFERE_TELA",
                });
                throw errorDetailed;
              } else {
                for (q = 1; q <= nrquestoesGravada; q++) {
                  respSelecionadaTela = selectedQuestionOptions.get("" + q);

                  qgravada = provaGravada.testeRealizado.questoes[q - 1];
                  respEstudanteGravada = qgravada.respostaEstudante;

                  //resposta discursiva
                  // console.log(">>>>>> respSelecionadaTela = " + respSelecionadaTela)
                  if (respSelecionadaTela.startsWith("TEXT")) {
                    respSelecionadaTela = respSelecionadaTela.replace("TEXT-", "");
                    respEstudanteGravada = qgravada.respostaEstudante.texto;

                    //resposta objetiva
                  } else {
                    respEstudanteGravada = qgravada.respostaEstudante.toLowerCase().charCodeAt(0) - 97;
                  }

                  // console.log(">>> QUESTAO " + q + " - RESP ESTUDANTE TELA=" + respSelecionadaTela + " - GRAVADA=" + respEstudanteGravada)

                  if (respEstudanteGravada != respSelecionadaTela) {
                    const errorDetailed =
                      "RESPOSTA_GRAVADA_DIFERE_DA_TELA-" +
                      q +
                      "tela=" +
                      respSelecionadaTela +
                      "-gravada=" +
                      respEstudanteGravada +
                      "-email=" +
                      email +
                      "-testeId=" +
                      testeId +
                      "-questionNumber=" +
                      questionNumber;
                    await utils.saveAuditLog({
                      estudanteId,
                      testeId: "RESPOSTA_GRAVADA_DIFERE_DA_TELA",
                      questaoId: qgravada.uuid,
                      resposta: respSelecionadaTela,
                      timestampAtualizacaoResposta: new Date().getTime(),
                      info: errorDetailed,
                      name: "testeId-" + testeId,
                    });
                    throw errorDetailed;
                  }

                  if (respEstudanteGravada.length < 7) {
                    throw "QUESTAO_TEXTO_GRAVADA_MUITO_CURTA-" + q;
                  }
                }
              }

              log("prova-tela-conferida-com-gravada-sucesso");

              break;
            }

            log("wait-virologia_cnt_h2");
            await page.waitForSelector(".virologia_cnt h2");

            //FINISH CONFIRMATION DETECTED
            let confirmButton = await page.$(".swal-icon--warning"); // will have because in the previous loop there was a `waitForSelector(".swal-icon--warning")`
            if (confirmButton != null) {
              log("questao" + questionNumber + "-confirmacao-finalizacao-prova");
              await utils.screenshot(page, screenshotBase, sc + "-finish-1");
              await page.click(".swal-button--confirm");
              log("wait-teste-resultado-area");
              await page.waitForSelector(".teste-resultado-area");
              await utils.screenshot(page, screenshotBase, sc + "-finish-2");
              continue;
            }

            //QUESTION SCREEN (question number)
            log("wait-virologia_cnt_h2-2");
            await page.waitForSelector(".virologia_cnt h2");
            // await page.waitFor(1000)
            log("wait-virologia_cnt_h2t");
            let h2t = await page.evaluate(() => document.querySelector(".virologia_cnt h2").textContent);
            let s = h2t.split("/");
            if (s.length != 2) {
              log("question-number-not-found-error-parsing");
              await utils.screenshot(page, screenshotBase, sc + "-question-number-parse-error");
              throw "QUESTION_NUMBER_NOT_FOUND-ERROR-PARSING";
            }
            questionNumber = parseInt(s[0].trim());
            totalQuestions = parseInt(s[1].trim());
            log("question-" + questionNumber + "-total-" + totalQuestions);

            if (questionNumber != previousQuestionNumber + 1 && questionNumber != previousQuestionNumber - 1) {
              throw "QUESTAO_FORA_ORDEM-ANTERIOR-" + previousQuestionNumber + "-OBTIDO-" + questionNumber;
            }
            previousQuestionNumber = questionNumber;

            //QUESTION CONTENTS
            log(sc + "-question-started=" + questionNumber + "-test=" + testeId);
            startTime = Date.now();
            await page.waitFor(3000);
            log("wait-loader-box");
            await page.waitForFunction(() => !document.querySelector(".loader-box"), { polling: 1000 });
            await utils.screenshot(page, screenshotBase, sc + "-questao" + questionNumber + "-1");
            log("wait-virologia_cnt1");
            await page.waitForSelector(".virologia_cnt");
            log("wait-questao-board1");
            await page.waitForSelector(".questao-board");
            const a = minQuestionTime / 10.0;
            const b = maxQuestionTime / 10.0;

            if (lastClickTime != 0) {
              log(sc + "-question-transition=" + questionNumber + "-test=" + testeId + "-time=" + (Date.now() - lastClickTime) + "ms");
            }

            if (process.env.PERFORM_SCROLL == "true") {
              await page.waitFor(getRandomInt(a, b));
              await utils.screenshot(page, screenshotBase, sc + "-scroll" + questionNumber + "-1");
              log(sc + "-questao" + questionNumber + "-scroll-1");
              await utils.scrollByTenth(page);
              await page.waitFor(getRandomInt(a, b));
              log(sc + "-questao" + questionNumber + "-scroll-2");
              await utils.scrollByTenth(page);
              await page.waitFor(getRandomInt(a, b));
              await utils.screenshot(page, screenshotBase, sc + "-scroll" + questionNumber + "-2");
              log(sc + "-questao" + questionNumber + "-scroll-3");
              await utils.scrollByTenth(page);
              await page.waitFor(getRandomInt(a, b));
              log(sc + "-questao" + questionNumber + "-scroll-4");
              await utils.scrollByTenth(page);
              await page.waitFor(getRandomInt(a, b));
              await utils.screenshot(page, screenshotBase, sc + "-scroll" + questionNumber + "-3");
              log(sc + "-questao" + questionNumber + "-scroll-5");
              await utils.scrollByTenth(page);
              await page.waitFor(getRandomInt(a, b));
              log(sc + "-questao" + questionNumber + "-scroll-6");
              await utils.scrollByTenth(page);
              await page.waitFor(getRandomInt(a, b));
              await utils.screenshot(page, screenshotBase, sc + "-scroll" + questionNumber + "-4");
              log(sc + "-questao" + questionNumber + "-scroll-7");
              await utils.scrollByTenth(page);
              await page.waitFor(getRandomInt(a, b));
              log(sc + "-questao" + questionNumber + "-scroll-8");
              await utils.scrollByTenth(page);
              await page.waitFor(getRandomInt(a, b));
              await utils.screenshot(page, screenshotBase, sc + "-scroll" + questionNumber + "-5");
              log(sc + "-questao" + questionNumber + "-scroll-9");
              await utils.scrollByTenth(page);
              await page.waitFor(getRandomInt(a, b));
              log(sc + "-questao" + questionNumber + "-scroll-10");
            } else {
              log(sc + "-questao" + questionNumber + "-noscroll-waiting-readtime");
              await page.waitFor(getRandomInt(minQuestionTime, maxQuestionTime));
            }

            //wait for the whole page to load
            log("wait-navigation-lane1 AND wait-questao-board1 AND wait-apprend");
            await page.waitForSelector(".navigation-lane");
            await page.waitForSelector(".questao-board");
            await page.waitForSelector(".apprend");

            await utils.scrollToEnd(page);
            await utils.screenshot(page, screenshotBase, sc + "-questao" + questionNumber + "-pagebottom");
            page.waitFor(3000);

            let userId = await page.evaluate(() => {
              const user = JSON.parse(window.localStorage["userData"]);
              return user.id;
            });

            //questao SUBJETIVA
            let elem = await page.$("#RespostaQuestaoDiscursiva");
            if (elem != null) {
              log(sc + "-resposta-prova-" + testeId + "-questaosubjetiva=" + questionNumber + "-wait-input");

              //generate random text as answer and type it
              start = new Date();
              textresp = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
              await page.evaluate((textresp) => {
                const textarea = document.querySelector("#RespostaQuestaoDiscursiva");
                var nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
                nativeTextAreaValueSetter.call(textarea, textresp);
                const event = new Event("input", { bubbles: true });
                textarea.dispatchEvent(event);

                return;
              }, textresp);

              await utils.screenshot(page, screenshotBase, sc + "-questao" + questionNumber + "-subjetiva");
              log(
                sc + "-resposta-prova-" + testeId + "-questaosubjetiva=" + questionNumber + "-textresp=" + textresp + "-userid=" + userId
              );
              log(
                sc +
                  "-resposta-prova-" +
                  testeId +
                  "-questaosubjetiva=" +
                  questionNumber +
                  "-textresp=" +
                  textresp +
                  "-userid=" +
                  userId +
                  "-click-salvar-resposta-subjetiva"
              );

              // click no botao salvar
              await page.waitForSelector(".blueCTA.small-button");
              await page.click(".blueCTA.small-button");

              log(
                sc +
                  "-resposta-prova-" +
                  testeId +
                  "-questaosubjetiva=" +
                  questionNumber +
                  "-textresp=" +
                  textresp +
                  "-userid=" +
                  userId +
                  "wait-loader-box-hide-from-texto-questao-subjetiva"
              );
              // wait for the loader-box to end
              await page.waitForFunction(() => !document.querySelector(".loader-box"), { polling: 500 });
              await page.waitFor(2000); //wait for the opacity of the animation to be 1.0 and then print fully get the modal
              log(
                sc +
                  "-resposta-prova-" +
                  testeId +
                  "-questaosubjetiva=" +
                  questionNumber +
                  "-textresp=" +
                  textresp +
                  "-userid=" +
                  userId +
                  "wait-swal-overlay--show-modal-confirm-save-resposta-questao-subjetiva"
              );
              await page.waitForSelector(".swal-overlay--show-modal");
              await utils.screenshot(page, screenshotBase, sc + "-questao" + questionNumber + "-questao-subjetiva-salva");

              await page.waitFor(2000); //wait for the opacity of the animation to be 1.0 and then print fully get the modal

              //the following modal click throws "Node is dettached" or "Node is not visible"
              //errors when under load (probably because the browser is slower)
              //so we will brute force it here a little bit ;)
              log(
                sc +
                  "-resposta-prova-" +
                  testeId +
                  "-questaosubjetiva=" +
                  questionNumber +
                  "-textresp=" +
                  textresp +
                  "-userid=" +
                  userId +
                  "wait-dialog-button-ok-click-questao-subjetiva"
              );

              // tentar garantir que o botão confirmar está presente e com click handler pronto (válido)
              await page.waitForSelector(".swal-button--confirm");
              await page.waitFor(5000);
              c = 0;
              clickOk = false;
              while (c < 30) {
                try {
                  await page.click(".swal-button--confirm");
                  clickOk = true;
                  break;
                } catch (err) {
                  log(sc + "error-clicking-ok-button-retrying-questao-subjetiva");
                  page.waitFor(1000);
                  c++;
                }
              }

              if (!clickOk) {
                throw "ERROR_CLICKING_QUESTION_ITEM_CONFIRMATION_QUESTAO_SUBJETIVA";
              }

              log(
                sc +
                  "-resposta-prova-" +
                  testeId +
                  "-click-confirmacao-time-since-resposta-texto-questao-subjetiva=" +
                  (new Date() - start) +
                  "ms"
              );

              selectedQuestionOptions.set("" + questionNumber, "TEXT-" + textresp);
            } else {
              //questao MULTIPLA ESCOLHA
              let elem = await page.$(".questaoMultiplaEscolhaItemLabel");
              if (elem != null) {
                // log(">>> QUESTAO MULTIPLA ESCOLHA q=" + c)

                //questao multipla escola
                start = new Date();
                let selectedOpt = await page.evaluate(() => {
                  el = document.querySelectorAll(".questaoMultiplaEscolhaItemLabel");
                  i2 = el.length - 1;
                  let random = Math.floor(Math.random() * (i2 + 1));
                  el[random].click();
                  return random;
                });
                //screnshot do item selecionado
                await utils.screenshot(page, screenshotBase, sc + "-questao" + questionNumber + "-itemselecionado1");

                //wait confirmation dialog
                log(
                  sc +
                    "-resposta-prova-" +
                    testeId +
                    "-questaomultiplaescolha=" +
                    questionNumber +
                    "-selectionopt=" +
                    selectedOpt +
                    "-userid=" +
                    userId
                );

                // wait for the loader-box to end
                log("wait-loader-box-hide-from-option-selected");
                await page.waitForFunction(() => !document.querySelector(".loader-box"), { polling: 500 });
                await page.waitFor(2000); //wait for the opacity of the animation to be 1.0 and then print fully get the modal
                log("wait-swal-overlay--show-modal-confirm-selected-option");
                await page.waitForSelector(".swal-overlay--show-modal");
                await utils.screenshot(page, screenshotBase, sc + "-questao" + questionNumber + "-itemselecionado2");

                //the following modal click throws "Node is dettached" or "Node is not visible"
                //errors when under load (probably because the browser is slower)
                //so we will brute force it here a little bit ;)
                log("wait-dialog-button-ok-click-selected-option");
                await page.waitForSelector(".swal-button--confirm");
                await page.waitFor(5000);
                c = 0;
                clickOk = false;
                while (c < 30) {
                  try {
                    await page.click(".swal-button--confirm");
                    clickOk = true;
                    break;
                  } catch (err) {
                    log(sc + "error-clicking-ok-button-retrying");
                    page.waitFor(1000);
                    c++;
                  }
                }

                if (!clickOk) {
                  throw "ERROR_CLICKING_QUESTION_ITEM_CONFIRMATION";
                }

                log(sc + "-resposta-prova-" + testeId + "-click-confirmacao-time-since-select-item=" + (new Date() - start) + "ms");
                selectedQuestionOptions.set("" + questionNumber, "" + selectedOpt);
              } else {
                log("tipo-questao-nao-suportada=" + questionNumber);
                throw "UNSUPPORTED_QUESTION_TYPE";
              }
            }

            log(sc + "-questao" + questionNumber + "-end");

            await page.waitFor(3000);
            //modal is hidden
            await page.waitForFunction(() => !document.querySelector(".swal-overlay--show-modal"), { polling: 500 });
            log(sc + "-questao" + questionNumber + "-modal-confirm-button-hidden");

            page.waitFor(3000);
            await utils.screenshot(page, screenshotBase, sc + "-questao" + questionNumber + "-answered");
            lastClickTime = Date.now();

            //click PROXIMA ou ANTERIOR
            anteriorChance = parseInt(process.env.CLICK_ANTERIOR_CHANCE);
            anteriorDice = getRandomInt(0, 100);
            buttonDice = "PRÓXIMA";
            if (anteriorChance > 0 && anteriorDice <= anteriorChance) {
              buttonDice = "ANTERIOR";
            }

            page.waitFor(1000);
            await utils.screenshot(page, screenshotBase, sc + "-questao" + questionNumber + "-8");

            log(sc + "-questao" + questionNumber + "-run-dice");
            let ret = await page.evaluate(async (buttonDice) => {
              const buttonsAvailable = Array.from(document.querySelectorAll(".navigation-lane>a")).every(
                (el) => el.className.indexOf("inactive") === -1
              );
              if (!buttonsAvailable) {
                return { err: "botoes-acao-proximo-anterior-.navigation-lane>a-INACTIVE-after-click-ok" };
              }
              antf = document.evaluate("//a[contains(., 'ANTERIOR')]", document, null, XPathResult.ANY_TYPE, null);
              ant = antf.iterateNext();
              nextLabel = "PRÓXIMA";
              if (ant != null) {
                nextLabel = buttonDice;
              }

              nbf = document.evaluate("//a[contains(., '" + nextLabel + "')]", document, null, XPathResult.ANY_TYPE, null);
              nb = nbf.iterateNext();
              if (nb == null && nextLabel == "PRÓXIMA") {
                //maybe it is the last question, so try "FINALIZAR"
                nextLabel = "FINALIZAR";
                nbf = document.evaluate("//a[contains(., '" + nextLabel + "')]", document, null, XPathResult.ANY_TYPE, null);
                nb = nbf.iterateNext();
              }

              if (nb != null) {
                nb.click();
                return { nextLabel: nextLabel };
              } else {
                return { err: "Could not find <a> with text " + nextLabel };
              }
            }, buttonDice);

            log(sc + "-questao" + questionNumber + "-click-next-action");
            if (ret.err != null) {
              throw "ERROR CLICKING ACTION BUTTON err=" + ret.err;
            } else {
              if (ret.nextLabel === "FINALIZAR") {
                //wait for the confirmation modal
                await page.waitForSelector(".swal-icon--warning");
              }
              log(sc + "-questao" + questionNumber + "-action-" + ret.nextLabel);
            }

            //wait for loading box
            await page.waitFor(2000);
            log("wait-loader-box-hide");
            await page.waitForFunction(() => !document.querySelector(".loader-box"), { polling: "mutation" });

            endTime = Date.now();
            log(
              sc + "-question-finished=" + questionNumber + "-browser=" + process.env.BROWSERID + "-time=" + (endTime - startTime) + "ms"
            );

            await utils.screenshot(page, screenshotBase, sc + "-questao" + questionNumber + "-waiting-next");
            log(sc + "-questao" + questionNumber + "-waiting-action-feedback");
            while (await checkLinkExists(page, "ENVIANDO")) {
              await page.waitFor(100);
            }
            log(sc + "-questao" + questionNumber + "-enviando-hidden");

            sc += 1;
          }
        } catch (error) {
          log("answertest-exception-detected-estudante=" + estudanteId + "-testeId=" + testeId + "-error=" + error + "-lastlog=" + lastlog);
          await utils.sendAuditScreenshot(
            page,
            screenshotBase,
            "audit",
            estudanteId,
            testeId,
            "0000-answertest-exit-error-try-catch-" + estudanteId + "-" + email + "-lastlog-" + lastlog
          );
          const errorDetailed = "EXCEPTION_INESPERADA-DETAILS: " + error;
          await utils.saveAuditLog({
            estudanteId,
            testeId,
            questaoId: "0000",
            resposta: "_BY_PASSED_",
            timestampAtualizacaoResposta: new Date().getTime(),
            info: errorDetailed,
            name: "answertest-exception-detected-" + estudanteId + "-" + email,
            lastlog: lastlog,
          });
          await utils.screenshot(page, screenshotBase, "answertest-exit-error-try-catch");
          throw error;
        }
      },
      100000 * 80
    );
  },
  timeout
);

async function checkLinkExists(page, label) {
  let ret = await page.evaluate((label) => {
    antf = document.evaluate("//a[contains(., '" + label + "')]", document, null, XPathResult.ANY_TYPE, null);
    ant = antf.iterateNext();
    return ant != null;
  }, label);
  return ret;
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

function log(message) {
  if (process.env.LOG_ENABLE == "true") {
    let l = new Date().toISOString() + " (" + process.env.BROWSERID + "): " + message;
    console.log(l);
    lastlog = l;
  }
}
