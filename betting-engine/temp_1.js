/*const io = require('socket.io').listen(3006);
var count = 0;
io.on('connection', function (socket) {
    console.log('connected:', socket.client.id);
    socket.on('serverEvent', function (data) {
      count++;
      console.log(count,' --- from client:', data);
     //  setTimeout(function() {
      //  socket.emit('clientEvent', '-- Betting Processed! --');
      // }, 3000);
    });

});
*/

const puppeteer = require('puppeteer');

async function run() {
  const width = 1600;
  const height = 900;
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
    page.goto('https://www.youbet.dk/en/live-betting/#9948229', {
      timeout: 1000 * 60 * 10
    }); // async
    await page.waitForNavigation();
    await page.waitFor(8000);
    //==============================================
    console.log('loaded!');
    var btnArr = await page.evaluate(() => {
      var submitBtnArr = [];
      // define functions 
      function sleep(delay) {
        var start = new Date().getTime();
        while (new Date().getTime() < start + delay);
      }
      function delay(time) {
         return new Promise(function(resolve) { 
             setTimeout(resolve, time)
         });
      }
      var ulDom = document.querySelector('section#live-betting > div.responsive-block.game_block > div.event-view.clearfix > ul.event-view-column.event-view-column-left');    
      console.log("ulDom==>", ulDom);
      if(ulDom) {
        var betIdDom = ulDom.querySelectorAll('li')[0];
        var ti = betIdDom.getAttribute('id').replace("event_container_", "").replace("_ML", "");
        var tt = "h4#event_" + ti + "_ML span.toggleableHeadline-text";
        console.log("tt==>", tt);
        var is1x2 = betIdDom.querySelector(tt).textContent.trim()
        if(is1x2 == '1X2') { // valid betting id
          var t1 = 'li#event_container_' + ti + '_Spread div#event_wrapper_' + ti + '_Spread div.bet-buttons-row  div.bet-button-wrap.counted';
          var t_dom = document.querySelector('section#live-betting > div.responsive-block.game_block > div.event-view.clearfix');
          var realBetDom = t_dom.querySelectorAll(t1);
          for(let i = 0; i < realBetDom.length; i++) {
            let teamName = realBetDom[i].querySelector('button > span.bet-description > span.bet-button-title.bet-title-team-name').textContent.trim();
            let teamAttr = realBetDom[i].querySelector('button > span.bet-description > span.bet-button-title.bet-title-hcap-points').textContent.trim();
            let teamOdd = realBetDom[i].querySelector('button > span.bet-odds span.bet-odds-number').textContent.trim();
            console.log(teamName + ', ' + teamAttr + ', ' + teamOdd);
            let button =  realBetDom[i].querySelector('button');
            if(i === 0 || i === 1) {
              submitBtnArr.push(button.getAttribute('id'));
            }            
          }
          // submit bet
          //document.querySelector('div#idBetSlipSummaryArea div#place button#PlaceBetButton').click();
        }
      }
      return submitBtnArr;
    });
    console.log('btnArr===>', btnArr);
    
    for(let i = 0; i < btnArr.length; i++) {
      let buttonSel = "button#" + btnArr[i];
      await page.click(buttonSel);
    } 

    await page.focus('input#setStakeForAll');
    await page.evaluate(() => {
      document.querySelector('input#setStakeForAll').value = '3';
    });
    await page.click('div#single_options a.stakeboxActionsBtn.stakeboxActionsMinus');
    await page.click('div#single_options a.stakeboxActionsBtn.stakeboxActionsMinus');
    //submit
    await page.click('div#idBetSlipSummaryArea div#place button#PlaceBetButton');
  } catch (err) {
    console.error(err);
  }
  //browser.close();
}

run();