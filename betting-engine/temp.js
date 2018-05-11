const puppeteer = require('puppeteer');

function delay(time) {
  return new Promise(function(resolve) {
    setTimeout(resolve, time)
  });
}

async function run() {
  const browser = await puppeteer.launch({
    headless: false
  });

  const page = await browser.newPage();

  //await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36');
  //await page.goto('http://awti.3rdeyecam.com/tem/wastepro/main');


  page.goto('https://www.youbet.dk/en/sport/', {
    timeout: 60000
  }); // async
  await page.waitForNavigation();
  console.log('yes!');
  await page.setViewport({ width: 1368, height: 768 });
  await page.waitFor(15000);
  // const linkHandler = (await page.$x("a[contains(text(), 'Some text')]"))[0];
  // if (linkHandler) {
  //   await linkHandler.click();
  // }
  await page.waitFor(5000);
  await page.focus('#stake_0');
  await page.evaluate(() => {
    document.querySelector('#stake_0').value = '4000';
  });
  await page.waitFor(5000);
  page.click('a.stakeboxActionsBtn.stakeboxActionsMinus');
  page.click('a.stakeboxActionsBtn.stakeboxActionsMinus');

   
  
  
  
  await page.waitFor(5000);
  await page.evaluate(() => {
    // document.querySelector('a#stakeboxActionsBtn.stakeboxActionsPlus').click();
    // document.querySelector('a#stakeboxActionsBtn.stakeboxActionsPlus').click();
    //document.querySelector('a#stakeboxActionsBtn.stakeboxActionsMinus').click();
    document.querySelector('button#PlaceBetButton').click();
  });
  await page.waitFor(10000);
  //browser.close();
}

run();s