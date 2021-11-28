const axios = require("axios");
const cheerio = require("cheerio");
const iconv = require("iconv-lite");
const axiosInstance = axios.create();

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) =>
    Promise.reject(
      (error.response && error.response.data) || "Something went wrong"
    )
);

const log = console.log;

const getHtml = async () => {
  try {
    const response = await axiosInstance.get(
      "http://m.infostock.co.kr/sector/sector.asp?mode=w",
      { responseEncoding: "binary", responseType: "arraybuffer" }
    );
    return response;
  } catch (error) {
    console.error(error);
  }
};

const getThemeByCode = async (code) => {
  try {
    const response = await axiosInstance.get(
      `http://m.infostock.co.kr/sector/sector_detail.asp?code=${code}`,
      { responseEncoding: "binary", responseType: "arraybuffer" }
    );
    return response;
  } catch (error) {
    console.error(error);
  }
};

const updateStockItem = async (item) => {
  try {
    return await axios.post(
      "http://localhost:8080/api/v1/platform/item/theme/category",
      {
        itemCode: item.itemCode,
        categoryCode: item.categoryCode,
        categoryName: item.category,
        theme: item.theme,
      }
    );
  } catch (error) {
    console.error(error);
  }
};

function getCategoryObj(codeObj) {
  const html = iconv.decode(codeObj.data, "EUC-KR");
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
}

function getThemeObj(themeObj, category, code) {
  const html = iconv.decode(themeObj.data, "EUC-KR");
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
      category: category.toString(),
      categoryCode: code.toString(),
      itemCode: arr[1] ? arr[1].replace(")", "").toString() : "",
      theme: arr2.toString(),
    });
  });

  return result;
}

async function main() {
  const codeObj = await getHtml();
  const categoryArr = getCategoryObj(codeObj);
  let result = [];
  for (let i = 0; i < categoryArr.length; i++) {
    // if (i === 1) break;
    const themeObj = await getThemeByCode(categoryArr[i].code);
    const item = getThemeObj(
      themeObj,
      categoryArr[i].category,
      categoryArr[i].code
    );
    result.push(item);
  }

  for (let i = 0; i < result.length; i++) {
    for (let j = 0; j < result[i].length; j++) {
      if (result[i][j].itemCode === "") continue;
      console.log(result[i][j]);
      await updateStockItem(result[i][j])
        .then((id) => log(id))
        .catch((error) => log(error));
      const wakeUpTime = Date.now() + 500;
      while (Date.now() < wakeUpTime) {}
    }
  }
}

main();
