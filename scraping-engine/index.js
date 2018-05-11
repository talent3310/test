const puppeteer = require('puppeteer');
const io = require('socket.io').listen(3006);

async function run() {
  const width = 1000;
  const height = 1600;
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 250, // slow down by 250ms
    devtools: false,
    args: [
      `--window-size=${ width },${ height }`
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width, height });
  page.goto('https://cancdqts.pinbet88.com/en/sports/soccer', {
    timeout: 0
  }); // async
  await page.waitForNavigation();
  await page.waitFor(12000);
  //==============================================
  console.log('loaded!');
  io.on('connection', function (socket) {
    console.log('connected:', socket.client.id);
    refreshData(page, socket);
  });
  //await page.click('a.btn-refresh');
  
  //==============================================
  // return;
  //browser.close();
}

run();

async function dataParser(page) {
  var data = await page.evaluate(() => {
    // validate current is live
    var isLiveString = document.querySelector('div#body div.body-right div#oddspage div.odds-container div.oddsTabLeft > span').getAttribute('class');
    var isLive = isLiveString.includes("live");
    if(!isLive) return {isLive: false, data: null};
    console.log("isLive====>", isLive);
    //
    var games = []; // {title: '', matchs: [] }
    var titles = [];

    function get_hdd_ou(parentDom, isHdd, isFull) {
      var sel;
      if (isFull) { // full_time
        if (isHdd) {
          sel = 'td.col-hdp:not(.ht)';
        } else {
          sel = 'td.col-ou:not(.ht)';
        }
      } else {
        if (isHdd) { // half_time
          sel = 'td.col-hdp.ht';
        } else {
          sel = 'td.col-ou.ht';
        }
      }
      //debugger;
      var obj = parentDom.querySelector(sel);
      var pos, val, odd_1, odd_2;
      var dom = obj.querySelectorAll('div.hdp > span');
      // console.log('dom_0:', dom[0].textContent.trim());
      // console.log('dom_1:', dom[1].textContent.trim())
      if (dom && dom[0] && dom[0].textContent) {
        if (isHdd) { // is Hdd
          if (dom[0].textContent.trim()) { //&nbsp;
            pos = 1;
            val = dom[0].textContent;
          } else {
            pos = 2;
            val = dom[1].textContent;
          }
        } else { // is Ou
          if (dom[0].textContent !== 'u') {
            pos = 1;
            val = dom[0].textContent;
          } else {
            pos = 2;
            val = dom[1].textContent;
          }
        }

        odd_1 = obj.querySelectorAll('div.odds a.odds span')[0].textContent;
        odd_2 = obj.querySelectorAll('div.odds a.odds span')[1].textContent;
        return { pos: pos, val: val, odd_1: odd_1, odd_2: odd_2 }
      }

      return null;
    }

    var double_line = document.querySelectorAll('div.double-line')[0];
    var dom_titles = double_line.querySelectorAll('div.league > span');
    for (var i = 0; i < dom_titles.length; i++) {
      titles.push(dom_titles[i].textContent);
    }
    var dom_games = double_line.querySelectorAll('table.events.no-select tbody');
    for (var i = 0; i < dom_games.length; i++) {
      var matchs_class_arr = [];
      var temps = dom_games[i].querySelectorAll('tr.mkline.status_I');
      for (var ii = 0; ii < temps.length; ii++) {
        var tt = temps[ii].getAttribute('class');
        tt = tt.split(" ");
        tt = tt[tt.length - 1];
        matchs_class_arr.push(tt);
      }
      var uniqueClasses = matchs_class_arr.filter(function(item, pos) {
        return matchs_class_arr.indexOf(item) == pos;
      });

      var matchs = [];

      for (var jj = 0; jj < uniqueClasses.length; jj++) { // match loop
        var match = {
          time: { time_s: null, time_live: null },
          event: { first: null, second: null },
          full_time: {
            m_1x2: { odd_1: null, odd_2: null, odd_3: null },
            hdd: [], // {hdp_s: '', hdp_s_position: 1, odd_1: 0, odd_2: 0},
            ou: [] // {ou_s_position: '', ou_s: '', odd_1: 0, odd_2: 0},
          },
          first_half: {
            m_1x2: { odd_1: null, odd_2: null, odd_3: null },
            hdd: [], // {hdp_s: '', hdp_s_position: 1, odd_1: 0, odd_2: 0},
            ou: [] // {ou_s: '', odd_1: 0, odd_2: 0},
          }
        };

        var t_1 = 'tr.' + uniqueClasses[jj];
        var matchArr = dom_games[i].querySelectorAll(t_1);
        // time
        var time_obj = matchArr[0].querySelector('td.col-time');
        match.time.time_s = time_obj.querySelectorAll('span')[0].textContent;
        match.time.time_live = time_obj.querySelectorAll('span')[1].textContent;
        // event
        var event_obj = matchArr[0].querySelector('td.col-name');
        match.event.first = event_obj.querySelectorAll('span')[0].textContent;
        // console.log("match.event.first===>", match.event.first);
        match.event.second = event_obj.querySelectorAll('span')[1].textContent;
        // full_time --m_1x2

        var m_1x2_obj = matchArr[0].querySelector('td.col-1x2:not(.ht)');
        var t_2 = m_1x2_obj.querySelectorAll('a.odds span');
        if (t_2 && t_2[0] && t_2[0].textContent) {
          match.full_time.m_1x2.odd_1 = t_2[0].textContent;
          match.full_time.m_1x2.odd_2 = t_2[1].textContent;
          match.full_time.m_1x2.odd_3 = t_2[2].textContent;
        }

        // fhalf_time --m_1x2
        var m_half_1x2_obj = matchArr[0].querySelector('td.col-1x2.ht');
        var t_3 = m_half_1x2_obj.querySelectorAll('a.odds span');
        if (t_3 && t_3[0] && t_3[0].textContent) {
          match.first_half.m_1x2.odd_1 = t_3[0].textContent;
          match.first_half.m_1x2.odd_2 = t_3[1].textContent;
          match.first_half.m_1x2.odd_3 = t_3[2].textContent;
        }

        for (var kk = 0; kk < matchArr.length; kk++) { // tr loop
          // full --hdd
          var f_hdd = get_hdd_ou(matchArr[kk], true, true);
          if (f_hdd) match.full_time.hdd.push(f_hdd);

          // half --hdd
          var h_hdd = get_hdd_ou(matchArr[kk], true, false);
          if (h_hdd) match.first_half.hdd.push(h_hdd);
          // --ou
          var f_ou = get_hdd_ou(matchArr[kk], false, true);
          if (f_ou) match.full_time.ou.push(f_ou);

          // half --ou
          var h_ou = get_hdd_ou(matchArr[kk], false, false);
          if (h_ou) match.first_half.ou.push(h_ou);
        } /*  */
        // match-end
        matchs.push(match);
      }
      games.push({ title: titles[i], matchs: matchs });
    }
    return {isLive: true, data: games};
  });
  return data;
}

function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
async function sleep(fn, ms, ...args) {
  await timeout(ms);
  return fn(...args);
}
async function refreshData(page, socket) {
  var className = await page.evaluate((sel) => {
    return document.querySelector(sel).getAttribute('class');
  }, 'a.btn-refresh > i');

  if (className !== 'fa icon refresh') { // still loading
    sleep(refreshData, 500, page, socket);
  } else { // info loaded
    console.time('--dataParser query--');
    var data = await dataParser(page);
    console.log("data=>", data);
    console.timeEnd('--dataParser query--');
    if(data.isLive) {
      socket.emit('clientEvent', data);
    }
    await page.click('a.btn-refresh');
    console.log('---- new -----');
    var intervalTime = 1000;
    if(!data.isLive) intervalTime = 30 * 60 * 1000// Not live -- 30 minutes interval
    sleep(refreshData, intervalTime, page, socket); // periods: 3s
  }

}