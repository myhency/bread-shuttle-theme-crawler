const axios = require("axios");
const cheerio = require("cheerio");
const iconv = require("iconv-lite");
// const Iconv = require("iconv").Iconv;
// const iconv = new Iconv("EUC-KR", "UTF-8");

const log = console.log;

const getHtml = async () => {
  try {
    return await axios.get(
      "http://m.infostock.co.kr/sector/sector.asp?mode=w",
      { responseEncoding: "binary", responseType: "arraybuffer" }
    );
  } catch (error) {
    console.error(error);
  }
};

const getThemeByCode = async (code) => {
  try {
    return await axios.get(
      `http://m.infostock.co.kr/sector/sector_detail.asp?code=${code}`,
      { responseEncoding: "binary", responseType: "arraybuffer" }
    );
  } catch (error) {
    console.error(error);
  }
};

function getCodeObj() {
  return getHtml().then((htmlDoc) => {
    const html = iconv.decode(htmlDoc.data, "EUC-KR");
    const $ = cheerio.load(html);
    const $bodyList = $("td.alL").children("a");

    const arr = [];

    $bodyList.each((index, item) => {
      arr.push({
        category: $(item)
          .attr("href")
          .toString()
          .replace("javascript:DetailOpen(", "")
          .replace(");", "")
          .split("','")[0]
          .replace("'", ""),
        code: $(item)
          .attr("href")
          .toString()
          .replace("javascript:DetailOpen(", "")
          .replace(");", "")
          .split("','")[1]
          .replace("'", ""),
      });
    });

    return arr;
  });
}

const getTheme = async () => {
  const code = await getCodeObj();
  code.forEach((value) => {
    getThemeByCode(value.code).then((htmlDoc) => {
      const html = iconv.decode(htmlDoc.data, "EUC-KR");
      const $ = cheerio.load(html);

      const result = [];

      $("table tr").each((index, item) => {
        const arr = $(item)
          .find("td:nth-child(1)")
          .text()
          .replace(/\s+/g, "")
          .replace("-", "")
          .split("(");
        const arr2 = $(item).find("td:nth-child(2)").text();

        result.push({
          itemName: arr[0],
          itemCode: arr[1] ? arr[1].replace(")", "") : "",
          theme: arr2,
        });
      });

      console.log(result);
    });
  });
};

function main() {
  const codeObj = getTheme();
  log(codeObj);
}

main();
