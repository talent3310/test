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
  const height = 1000;
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 250, // slow down by 250ms
    devtools: true,
    args: [
      `--window-size=${ width },${ height }`
    ],
  });
  const page = await browser.newPage();
  // Adaptive?
  // await page.setUserAgent('Mozilla (Android) Mobile')
  await page.setViewport({ width, height });
  try {
    page.goto('https://www.youbet.dk/live-betting/#9963970', {
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
          if(!betIdDom) return null;
          var ti = betIdDom.getAttribute('id').replace("event_container_", "").replace("_ML", "");
          var tt = "h4#event_" + ti + "_ML span.toggleableHeadline-text";
          var is1x2 = betIdDom.querySelector(tt).textContent.trim()
          if (is1x2 == '1X2') { // valid betting id
            var t1 = 'li#event_container_' + ti + '_Spread div#event_wrapper_' + ti + '_Spread div.bet-buttons-row  div.bet-button-wrap.counted';
            var t_dom = document.querySelector('section#live-betting > div.responsive-block.game_block > div.event-view.clearfix');
            var realBetDom = t_dom.querySelectorAll(t1);

            // match to the scrapped data
            let teamName_1 = realBetDom[0].querySelector('button > span.bet-description > span.bet-button-title.bet-title-team-name').textContent.trim();
            let teamName_2 = realBetDom[1].querySelector('button > span.bet-description > span.bet-button-title.bet-title-team-name').textContent.trim();
            var correctMatch;
            
            if(scrapingData && scrapingData.data && scrapingData.data.length) {
              console.log('-------here!------');
              console.log("teamName_1==>", teamName_1);
              console.log("teamName_2==>", teamName_2);
              for(var a1 = 0 ; a1 < scrapingData.data.length; a1++) {
                var matchs = scrapingData.data[a1].matchs;
                for(var a2 = 0; a2 < matchs.length; a2++) {
                  // first_event match
                  var eventName_1Arr = matchs[a2].event.first.split(" ");
                  var event_1CorrectNum = 0;
                  for(var b1 = 0; b1 < eventName_1Arr.length; b1++) {
                    var f = teamName_1.includes(eventName_1Arr[b1]);
                    if(f) event_1CorrectNum++;
                  }
                  var eventName_2Arr = matchs[a2].event.second.split(" ");
                  var event_2CorrectNum = 0;
                  for(var b2 = 0; b2 < eventName_2Arr.length; b2++) {
                    var f = teamName_2.includes(eventName_2Arr[b2]);
                    if(f) event_2CorrectNum++;
                  }
                  if(eventName_1Arr.length != 1 && eventName_2Arr.length != 1 && event_1CorrectNum > eventName_1Arr.length - 2 &&  event_2CorrectNum > eventName_2Arr.length - 2) { //matched
                    correctMatch = matchs[a2];
                    break;
                  }
                  if(event_1CorrectNum == eventName_1Arr.length && event_2CorrectNum > 0) {
                    correctMatch = matchs[a2];
                    break;
                  }
                  if(event_2CorrectNum == eventName_2Arr.length && event_1CorrectNum > 0) {
                    correctMatch = matchs[a2];
                    break;
                  }
                }
              }
            }
            console.log("correctMatch==>", correctMatch);
            function calcProb(index, correctMatch, teamOdd, teamAttr) {
              var isFirst = index % 2 == 0 ? true : false;
              var tt; var attPos;
              var f = teamAttr.includes("+");
              if(isFirst) {
                if(f) attPos = 2;
                else attPos = 1;
              } else {
                if(f) attPos = 1;
                else attPos = 2;
              }
              var attr_temp = teamAttr.replace("+", "-");
              switch(attr_temp) {
                case '0':
                  tt = '0.0';
                  break;
                case '-0.25':
                  tt = '0-0.5';
                  break;
                case '-0.5':
                  tt = '0.5';
                  break;
                case '-0.75':
                  tt = '0.5-1';
                  break;
                case '-1':
                  tt = '1.0';
                  break;
                case '-1.25':
                  tt = '1-1.5';
                  break;
                case '-1.5':
                  tt = '1.5';
                  break;
                case '-1.75':
                  tt = '1.5-2';
                  break;
                case '-2':
                  tt = '2.0';
                  break;
              }

              var hdds = correctMatch.full_time.hdd;
              for(var i = 0; i < hdds.length; i++) {
                if(attPos == hdds[i].pos && tt == hdds[i].val) { // matched!
                  var odd_1 = hdds[i].odd_1; var odd_2 = hdds[i].odd_2; 
                  var PB = 100 - ((1/odd_1 + 1/odd_2) * 100 - 100);
                  if(isFirst) {
                    console.log('value============>', (1/odd_1) * PB * teamOdd)
                    if((1/odd_1) * PB * teamOdd > 92) { //Good, so can bet
                      return true;
                    } else {
                      return false;
                    } 
                  } else {
                    console.log('value============>', (1/odd_2) * PB * teamOdd)
                    if((1/odd_2) * PB * teamOdd > 92) {                  
                      return true;
                    } else {
                      return false;
                    }
                    
                  }
                }
              }
              return false;
            }
            if(correctMatch) {
              //debugger;
              for (let i = 0; i < realBetDom.length; i++) {
                // let teamName = realBetDom[i].querySelector('button > span.bet-description > span.bet-button-title.bet-title-team-name').textContent.trim();
                let teamAttr = realBetDom[i].querySelector('button > span.bet-description > span.bet-button-title.bet-title-hcap-points').textContent.trim();
                let teamOdd = realBetDom[i].querySelector('button > span.bet-odds span.bet-odds-number').textContent.trim();
                let button = realBetDom[i].querySelector('button');
                if(calcProb(i, correctMatch, teamOdd, teamAttr)) {
                  submitBtnArr.push(button.getAttribute('id'));
                }
              }
            }
          }
        }
        return submitBtnArr;
      }, dataFromScraping);
      console.log('btnArr===>', btnArr);
      if(btnArr && btnArr.length) {
        for (let i = 0; i < btnArr.length; i++) {
          let buttonSel = "button#" + btnArr[i];
          await page.click(buttonSel);
        }

        // control the betting values
        await page.waitForSelector('input#setStakeForAll');
        await page.focus('input#setStakeForAll');
        await page.evaluate(() => {
          document.querySelector('input#setStakeForAll').value = '2';
        });
        await page.click('div#single_options a.stakeboxActionsBtn.stakeboxActionsMinus');

        //submit
        console.timeEnd('--betting query---');
        await page.click('div#idBetSlipSummaryArea div#place button#PlaceBetButton');
        //
        await page.waitFor(3000);
        await page.click('a#ClearBetButton');
        await page.waitFor(1000);
      } else {
        await page.waitFor(5000);
      }
      
    } catch (err) {
      console.log('Error_Betting: ', err)
    }
  } else {
    await page.waitFor(3000);
  }

  betting(page);

}