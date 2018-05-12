const puppeteer = require('puppeteer');
const io = require('socket.io-client');
require('events').EventEmitter.prototype._maxListeners = 30;
const socket = io.connect("http://localhost:3006/", {
  reconnection: true
});
var valid_count = 0;
var valid_count_temp;
var dataFromScraping;

socket.on('connect', function() {
  console.log('connected to localhost:3006');
  socket.on('clientEvent', function(data) {
    dataFromScraping = data;
    valid_count++;
    console.log("valid_count==>", valid_count);
  });
});

async function run() {
  const width = 1200;
  const height = 1200;
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 250, // slow down by 250ms
    devtools: false,
    args: [
      `--window-size=${ width },${ height }`
    ],
  });
  const page = await browser.newPage();
  // Adaptive?
  // await page.setUserAgent('Mozilla (Android) Mobile')
  await page.setViewport({ width, height });
  try {
    page.goto('https://www.youbet.dk/live-betting/#9964251', {
      timeout: 1000 * 60 * 10
    }); // async
    await page.waitForNavigation();
    await page.waitFor(10000);
    //==============================================
    console.log('loaded!');
    betting(page);

  } catch (err) {
    console.error(err);
  }
  //browser.close();
}

run();

async function betting(page) {
  console.log(valid_count, '--', valid_count_temp);
  if (1) { //valid_count_temp != valid_count
    valid_count_temp = valid_count;
    console.time('--betting query---');
    try {
      var btnArr = await page.evaluate((scrapingData) => {
        console.log("scrapingData==>", scrapingData);
        var submitBtnArr = [];
        var ulDom = document.querySelector('section#live-betting > div.responsive-block.game_block > div.event-view.clearfix > ul.event-view-column.event-view-column-left');
        if (ulDom) {
          var betIdDom = ulDom.querySelectorAll('li')[0];
          var ti = betIdDom.getAttribute('id').replace("event_container_", "").replace("_ML", "");
          var tt = "h4#event_" + ti + "_ML span.toggleableHeadline-text";
          var is1x2 = betIdDom.querySelector(tt).textContent.trim()
          if (is1x2 == '1X2') { // valid betting id
            var t1 = 'li#event_container_' + ti + '_Spread div#event_wrapper_' + ti + '_Spread div.bet-buttons-row  div.bet-button-wrap.counted';
            var t_dom = document.querySelector('section#live-betting > div.responsive-block.game_block > div.event-view.clearfix');
            var realBetDom = t_dom.querySelectorAll(t1);
            for (let i = 0; i < realBetDom.length; i++) {
              let teamName = realBetDom[i].querySelector('button > span.bet-description > span.bet-button-title.bet-title-team-name').textContent.trim();
              let teamAttr = realBetDom[i].querySelector('button > span.bet-description > span.bet-button-title.bet-title-hcap-points').textContent.trim();
              let teamOdd = realBetDom[i].querySelector('button > span.bet-odds span.bet-odds-number').textContent.trim();
              let button = realBetDom[i].querySelector('button');
              if (i === 0 || i === 1) {
                submitBtnArr.push(button.getAttribute('id'));
              }
            }
          }
        }
        return submitBtnArr;
      }, dataFromScraping);
      console.log('btnArr===>', btnArr);

      for (let i = 0; i < btnArr.length; i++) {
        let buttonSel = "button#" + btnArr[i];
        await page.click(buttonSel);
      }

      // control the betting values
      await page.waitForSelector('input#setStakeForAll');
      await page.focus('input#setStakeForAll');
      await page.evaluate(() => {
        document.querySelector('input#setStakeForAll').value = '3';
      });
      await page.click('div#single_options a.stakeboxActionsBtn.stakeboxActionsMinus');
      await page.click('div#single_options a.stakeboxActionsBtn.stakeboxActionsMinus');

      //submit
      console.timeEnd('--betting query---');
      await page.click('div#idBetSlipSummaryArea div#place button#PlaceBetButton');
      //
      await page.waitFor(3000);
      await page.click('a#ClearBetButton');
      await page.waitFor(1000);
    } catch (err) {
      console.log('Error_Betting: ', err)
    }
  } else {
    await page.waitFor(3000);
  }

  betting(page);

}