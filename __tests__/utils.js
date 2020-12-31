const fs = require("fs");
const fetch = require("node-fetch");

const escapeXpathString = (str) => {
  const splitedQuotes = str.replace(/'/g, `', "'", '`);
  return `concat('${splitedQuotes}', '')`;
};

const clickByText = async (page, text) => {
  const escapedText = escapeXpathString(text);
  const linkHandlers = await page.$x(`//a[contains(text(), ${escapedText})]`);

  if (linkHandlers.length > 0) {
    await linkHandlers[0].click();
  } else {
    throw new Error(`Link not found: ${text}`);
  }
};

const screenshot = async (page, basepath, name) => {
  if (process.env.TAKE_SCREENSHOTS == "true") {
    if (!fs.existsSync(basepath)) {
      fs.mkdirSync(basepath);
    }
    return page.screenshot({ path: basepath + new Date().toISOString() + "-" + name + ".jpg" });
  } else {
    return;
  }
};

const sendAuditScreenshot = async (page, basepath, name, estudanteId, testeId, questaoId, info) => {
  estudanteId = estudanteId ? estudanteId : "0000";
  testeId = testeId ? testeId : "0000";
  questaoId = questaoId ? questaoId : "0000";

  if (process.env.ENDPOINT_AUDIT_URL) {
    if (!fs.existsSync(basepath)) {
      fs.mkdirSync(basepath);
    }
    const screenshotFilePath = basepath + new Date().toISOString() + "-" + name + ".jpg";
    await page.screenshot({ path: screenshotFilePath });

    if (!info) {
      info = "";
    } else {
      info = "-" + info.replace(" ", "-");
    }

    var data = fs.readFileSync(screenshotFilePath, { encoding: "base64" });

    console.log(`Saving audit screenshot for estudanteId ${estudanteId} / testeId ${testeId} / questionId ${questaoId} - ${info}`);
    let url = `${process.env.ENDPOINT_AUDIT_URL}/testes/${testeId}/estudante/${estudanteId}/screenshot?name=question-frontend-save-${questaoId}${info}`;
    console.log("SCREENSHOT AUDIT", url);
    return page.evaluate(
      async (urlParam, dataParam) => {
        try {
          const fblb = await fetch("data:image/jpg;base64," + dataParam);
          const blob = await fblb.blob();
          const response = await fetch(urlParam, {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "image/jpeg",
            },
            body: blob,
          });

          if (response.ok && response.status < 299) {
            let teste = await response.json();
            return teste;
          } else {
            throw `Cannot save audit screenshot for teste. code=${response.status}`;
          }
        } catch (error) {
          throw error;
        }
      },
      url,
      data
    );
  } else {
    return;
  }
};

const saveAuditLog = async ({ estudanteId, testeId, questaoId, resposta, timestampAtualizacaoResposta, info, name }) => {
  estudanteId = estudanteId ? estudanteId : "0000";
  testeId = testeId ? testeId : "0000";
  questaoId = questaoId ? questaoId : "0000";

  var data = {
    "log.date": new Date(),
    "params.estudanteId": estudanteId,
    "params.testeId": testeId,
    "body.questaoId": questaoId,
    "body.resposta": resposta,
    "body.timestampAtualizacaoResposta": timestampAtualizacaoResposta,
    info,
  };

  if (!process.env.ENDPOINT_AUDIT_URL) {
    console.warn("Remote audit log is disabled");
    console.log("saveAuditLog() resposta: " + JSON.stringify(data));
    return;
  }
  try {
    console.debug(`Sending audit log to remote server for teste=${testeId} estudante=${estudanteId}`);

    let url = `${process.env.ENDPOINT_AUDIT_URL}/testes/${testeId}/estudante/${estudanteId}/log?name=${name}-${questaoId}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw `Error posting data to audit. status=${response.status}`;
    }
    return response.ok;
  } catch (error) {
    console.error("Couldn't send log to audit server. err=", error);
    console.log("saveAuditLog() resposta: " + JSON.stringify(data));
  }
};

const scrollToEnd = async (page) => {
  await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
      var totalHeight = 0;
      var distance = 100;
      var timer = setInterval(() => {
        var scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
};

const scrollByTenth = async (page) => {
  await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
      const bs = document.body.scrollHeight / 10;
      window.scrollBy(0, bs);
      resolve();
    });
  });
};

module.exports = { clickByText, screenshot, scrollToEnd, scrollByTenth, sendAuditScreenshot, saveAuditLog };
