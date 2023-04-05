import '@logseq/libs';
import axios from 'axios';
import * as cheerio from 'cheerio';

// Retrieve content (ticker info) and block uuid from the current block.
async function getTickerFromBlock() {
    const {content, uuid} = await logseq.Editor.getCurrentBlock();
    const ticker = content.trim();
    if (ticker === "") {
        throw new Error("Please specify the ticker name.");
    } else if (ticker.split(" ", 2).length > 1) {
        throw new Error(`Ticker ${ticker} is not valid.`);
    }
    return {ticker: ticker, blockUUID: uuid};
}

// webscrape roic.ai and get the stock price of the ticker
async function getMarketPrice(ticker) {
    const response = await axios.request({method: "GET", url: `https://roic.ai/classic/${ticker}`});
    const $ = cheerio.load(response.data);
    // Hardcoded. Will stop working if the website layout changes!
    return $(`p:contains("RECENT ")p:contains("PRICE")`).next().text();
}

function main () {
    logseq.Editor.registerSlashCommand(
        "GetPrice",
        async () => {
            let tickerInfo = {};
            try {
                tickerInfo = await getTickerFromBlock();
            } catch (err) {
                await logseq.UI.showMsg(`${err.name} ${err.message}`, "error");
                throw err;
            }

            try {
                const price = await getMarketPrice(tickerInfo.ticker);
                if (price === "") {
                    await logseq.UI.showMsg("Can't find the price info.", "error");
                } else {
                    await logseq.Editor.updateBlock(tickerInfo.blockUUID, `Current market price: *${price}*`);
                }
            }
            catch (err) {
                await logseq.UI.showMsg(`${err.name} ${err.message}`, "error");
                throw err;  // throw otherwise the message will pop up multiple times.
            }
        }
    )
}

logseq.ready(main).catch(console.error)