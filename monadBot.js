const { chromium } = require("playwright");

const WALLET_ADDRESS = "0xCdD33a53ceF03CDf76eD2eF8A311Bdd9e77Da67c"; 

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
const METAMASK_EXTENSION_PATH = "/Users/kunalb/Library/Application Support/Google/Chrome/Default/Extensions/nkbihfbeogaeaoehlefnkodbefgpgknn/12.13.1_0"

const MONAD_FAUCET_URL = "https://testnet.monad.xyz/";
const LIL_CHOG_STARS_URL = "https://testnet.lilchogstars.com/";
const KINTSU_STAKING_URL = "https://kintsu.xyz/staking";
const MORKIE_NFT_URL = "https://morkie.xyz/monad";
const AMBIENT_FINANCE_URL = "https://monad.ambient.finance";
const ENCIPHER_URL = "https://monad.encifher.io/";
const APRIORI_URL = "https://stake.apr.io";
const BEAN_SWAP_URL = "https://swap.bean.exchange/swap";
const BIMA_MONEY_VAULT = "https://bima.money/vaults";
const CADDY_FINANCE = "https://alpha.caddy.finance"

//const apiKey = '93b09a485c4d75a9e60286dc53bd1b67'; // 2Captcha API key
const site_key = '0x4AAAAAAA-3X4Nd7hf3mNGx'; // Captcha sitekey from the website
const api_key = "CAP-068E9287158786FEE02D4BB05B3885489DCDBB5660A23FA4A008A01ECB6966D2";  // CapSolver API key

async function capsolver() {
  const payload = {
    clientKey: api_key,
    task: {
      type: 'AntiTurnstileTaskProxyLess', // 🔥 Official recommended type
      websiteKey: site_key,
      websiteURL: MONAD_FAUCET_URL,
      metadata: {
        action: ''  // Optional, depends on Turnstile setup
      }
    }
  };

  try {
    // Step 1: Send CAPTCHA request to CapSolver
    const res = await fetch("https://api.capsolver.com/createTask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    
    const resData = await res.json();
    const task_id = resData.taskId;

    if (!task_id) {
      console.log("❌ Failed to create task:", resData);
      return null;
    }

    console.log("✅ Got taskId:", task_id);

    // Step 2: Poll for the solution
    while (true) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 sec before retrying

      const getResultPayload = { clientKey: api_key, taskId: task_id };
      const resp = await fetch("https://api.capsolver.com/getTaskResult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(getResultPayload),
      });

      const resultData = await resp.json();
      const status = resultData.status;

      if (status === "ready") {
        console.log("🎉 CAPTCHA Solved:", resultData.solution.token);
        return resultData.solution.token;
      }
      
      if (status === "failed" || resultData.errorId) {
        console.log("❌ Solve failed! response:", resultData);
        return null;
      }
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

//Official faucet --not working becasue of captcha
async function claimMonadTokens() {
    console.log("🚀 Claiming testnet MON tokens...");
    const browser = await chromium.launchPersistentContext('./playwright_data', {
        headless: false,  // Extensions require a visible browser
        executablePath: CHROME_PATH, // Use Google Chrome
        args: [
            `--disable-extensions-except=${METAMASK_EXTENSION_PATH}`,
            `--load-extension=${METAMASK_EXTENSION_PATH}`
        ]
    });

    const page = await browser.newPage();
    
    await page.goto(MONAD_FAUCET_URL);
    await page.waitForTimeout(2000);
    
    // await page.getByRole('checkbox').click();
    // await page.waitForTimeout(1000);
    
    // await page.click('button:has-text("Continue")');
    // await page.waitForTimeout(1000);

    await page.click('button:has-text("Connect Wallet")');
    await page.waitForTimeout(1000);

    await page.reload()

    await page.click('button:has-text("Connect Wallet")');
    await page.waitForTimeout(1000);

    console.log("🔑 connecting wallet...");


    await page.click('text=Metamask')
    await page.waitForTimeout(1000);
    
    const [metamaskPopup] = await Promise.all([
        browser.waitForEvent('page'),
        page.waitForTimeout(3000)
    ]);

    console.log("🔑 metamask open...");


    await metamaskPopup.bringToFront();
    await metamaskPopup.waitForTimeout(2000);


    // await metamaskPopup.click('button:has-text("Next")');
    // await page.waitForTimeout(1000);
    console.log("🔑 Entering password...");
    // await metamaskPopup.fill('input[type="password"]', "Password1!");
    await metamaskPopup.fill('[data-testid="unlock-password"]', "Password1!");

    await metamaskPopup.click('button:has-text("Unlock")'); // Adjust if necessary

    await metamaskPopup.click('button:has-text("Connect")');


    await page.getByPlaceholder('0x8ce78...28161').fill(WALLET_ADDRESS);
    await page.waitForTimeout(5000);
    
    // const captchaToken = await solveTurnstileCaptcha(siteKey, MONAD_FAUCET_URL, apiKey);
    
    
    const captchaSolution = await capsolver();
    if (!captchaSolution) {
      console.log("❌ No CAPTCHA solution received, exiting.");
      return;
    }

    // Step 5: Inject CAPTCHA response into Turnstile input field
    await page.evaluate(({token, sitekey}) => {
      const turnstileElement = document.querySelector('.cf-turnstile');

        if (!turnstileElement) {
            console.error("❌ Turnstile CAPTCHA element not found!");
            return;
        }

        // Inject the token into the response field
        const input = document.querySelector('input[name="cf-turnstile-response"]');
        if (input) {
            input.value = token;
        }

        // Simulate user interaction
        turnstileElement.dispatchEvent(new Event('change', { bubbles: true }));

        // Reset and execute Turnstile verification
        if (window.turnstile) {
            window.turnstile.reset(turnstileElement);
            window.turnstile.execute(turnstileElement, {
                sitekey: sitekey,
                action: 'verify',
                callback: () => console.log("✅ Turnstile validated!")
            });
        } else {
            console.error("❌ Turnstile API not available!");
        }
  }, {token: captchaSolution, sitekey: "0x4AAAAAAA-3X4Nd7hf3mNGx"}); 
    
    console.log("🚀 Turnstile CAPTCHA validation triggered!");

    // // Step 6: Wait & Reload Page (Optional)
    // await page.waitForTimeout(3000);
    // await page.reload();
    // await page.waitForTimeout(3000);

    // // Step 7: Click the CAPTCHA box (if needed)
    // await page.evaluate(() => {
    //     const captchaWidget = document.querySelector('.cf-turnstile');
    //     if (captchaWidget) {
    //         captchaWidget.click();
    //     }
    // });








    await page.waitForTimeout(5000);
    
    // await page.locator('button:has-text("Get Testnet MON")').click();
    // await page.waitForTimeout(10000);
    await page.waitForSelector('button:has-text("Get Testnet MON")', { timeout: 10000 });

    let claimed = false;
    while (!claimed) {
        console.log("🔄 Clicking the button...");

        // Click the button
        await page.click('button:has-text("Get Testnet MON")');
        await page.waitForTimeout(10000); // Small delay to prevent spam clicking

        // Check if "Claimed" appears on the page
        claimed = await page.locator('text=Claimed').isVisible();

        if (claimed) {
            console.log("✅ 'Claimed' detected! Stopping clicks.");
        }
    }
}

//nft mint
async function mintLilChogStarsNFT(browser, page) {
    console.log("Executing LIL_CHONG_STARS");
    
    await page.goto(LIL_CHOG_STARS_URL);

    // Step 1: Click 'Connect Wallet' button
    console.log("🔑 Clicking 'Connect Wallet'...");
    await page.click('text=Connect Wallet'); // Adjust if needed

    // Step 2: Select 'Metamask' from wallet list
    console.log("🦊 Selecting Metamask...");
    await page.click('text=Metamask'); // Adjust selector if needed

    await page.reload();

    console.log("🔑 Clicking 'Connect Wallet'...");
    await page.click('text=Connect Wallet'); // Adjust if needed

    // Step 2: Select 'Metamask' from wallet list
    console.log("🦊 Selecting Metamask...");
    await page.click('text=Metamask'); // Adjust selector if needed

    // Step 3: Handle Metamask popup (Connect approval)
    console.log("🔓 Handling Metamask popup...");
    const [metamaskPopup] = await Promise.all([
        browser.waitForEvent('page'),
        page.waitForTimeout(3000)
    ]);

    await metamaskPopup.bringToFront();
    console.log("🔑 Entering password...");
    await metamaskPopup.fill('#password', "Password1!");
    await metamaskPopup.waitForTimeout(10000);
    
    await metamaskPopup.click('button:has-text("Unlock")'); // Adjust if necessary
    await metamaskPopup.waitForTimeout(10000);
    console.log("🔑 Cliked unlcock...");
    
    console.log("🔑 Cliked conenct...");
    await metamaskPopup.click('button:has-text("Connect")'); // Adjust if necessary
    // await metamaskPopup.waitForTimeout(3000);

    console.log("🔄 Waiting for Metamask to close...");
    // await metamaskPopup.waitForClose();

    console.log("🔙 Switching back to main dApp...");
    // const pages = browser.pages();
    // const mainPage = pages.find(p => p.url().includes('testnet.lilchogstars.com'));

    // await mainPage.bringToFront();
    // await metamaskPopup.waitForTimeout(3000);

    await page.click('button:has-text("Mint")'); // Adjust if necessary

    await page.waitForTimeout(10000);
}

//nft mint
async function stakeKintsu(browser, page) {
  console.log("Executing KINTSU_STAKE");
  
  await page.goto(KINTSU_STAKING_URL);
    // await page.waitForTimeout(5000);

    // Step 1: Click 'Connect Wallet' button
    console.log("🔑 Clicking 'Connect Wallet'...");
    await page.click('text=Connect Wallet'); // Adjust if needed
    // await page.waitForTimeout(2000);

    // Step 2: Select 'Metamask' from wallet list
    console.log("🦊 Selecting Metamask...");
    await page.click('text=Metamask'); // Adjust selector if needed
    // await page.waitForTimeout(5000);

    await page.reload();

    console.log("🔑 Clicking 'Connect Wallet'...");
    await page.click('text=Connect Wallet'); // Adjust if needed
    // await page.waitForTimeout(2000);

    // Step 2: Select 'Metamask' from wallet list
    console.log("🦊 Selecting Metamask...");
    await page.click('text=Metamask'); // Adjust selector if needed
    // await page.waitForTimeout(5000);

    // Step 3: Handle Metamask popup (Connect approval)
    console.log("🔓 Handling Metamask popup...");
    const [metamaskPopup] = await Promise.all([
        browser.waitForEvent('page'),
        page.waitForTimeout(3000)
    ]);

    await metamaskPopup.bringToFront();

    console.log("🌐 Current Page URL:", metamaskPopup.url());
    // await metamaskPopup.waitForTimeout(3000);
    // Step 4: Enter Password and Unlock
    console.log("🔑 Entering password...");
    // await metamaskPopup.fill('input[type="password"]', "Password1!");
    await metamaskPopup.fill('#password', "Password1!");

    await metamaskPopup.click('button:has-text("Unlock")'); // Adjust if necessary
    // console.log("clicked unlock");
    // await metamaskPopup.waitForTimeout(3000);
    
    // // await metamaskPopup.waitForTimeout(5000);
    // await metamaskPopup.click('button:has-text("Connect")'); // Adjust if necessary
    // console.log("clicked connect");

    // await metamaskPopup.waitForTimeout(3000);

    // console.log("🔄 Waiting for Metamask to close...");
    await metamaskPopup.close();
    console.log("🌐 Current Page URL:", page.url());
    await page.waitForTimeout(2000);
    await page.fill('input[name="stake"]', '100');

    await page.waitForTimeout(2000);

    await page.click('//button[contains(@class, "bg-primary") and contains(text(), "Stake")]');

    await page.waitForTimeout(20000);
}

//nft mint
async function mintMorkieNFT(browser, page) {
  console.log("Executing MORKIE_MINT");

    await page.goto(MORKIE_NFT_URL);

    // Step 1: Click 'Connect Wallet' button
    console.log("🔑 Clicking 'Connect Wallet'...");
    await page.click('text=Connect'); // Adjust if needed

    // Step 2: Select 'Metamask' from wallet list
    console.log("🦊 Selecting Metamask...");
    await page.click('text=Metamask'); // Adjust selector if needed

    await page.reload();

    console.log("🔑 Clicking 'Connect Wallet'...");
    await page.click('text=Connect'); // Adjust if needed
    // await page.waitForTimeout(2000);

    // Step 2: Select 'Metamask' from wallet list
    console.log("🦊 Selecting Metamask...");
    await page.click('text=Metamask'); // Adjust selector if needed

    console.log("🔓 Handling Metamask popup...");
    const [metamaskPopup] = await Promise.all([
        browser.waitForEvent('page'),
        page.waitForTimeout(3000)
    ]);
    // await page.waitForTimeout(5000);
    await metamaskPopup.bringToFront();
    // await metamaskPopup.waitForTimeout(3000);
    // Step 4: Enter Password and Unlock
    console.log("🔑 Entering password...");
    // await metamaskPopup.fill('input[type="password"]', "Password1!");
    await metamaskPopup.fill('#password', "Password1!");
    
    await metamaskPopup.click('button:has-text("Unlock")'); // Adjust if necessary
    console.log("🔑 Clicked unlcock");

    // await metamaskPopup.click('button:has-text("Connect")'); // Adjust if necessary
    // await metamaskPopup.waitForTimeout(3000);
    
    // await metamaskPopup.click('button:has-text("Approve")'); // Adjust if necessary
    // await metamaskPopup.waitForTimeout(3000);

    // console.log("🔄 Waiting for Metamask to close...");
    // await metamaskPopup.waitForClose();

    page.setDefaultNavigationTimeout(0);

    // Intercept and prevent new page opening
    page.on('popup', async popup => {
        console.log("❌ Blocking popup:", popup.url());
        await popup.close();
    });

    await page.click('a:has-text("Follow Morkie")');
    await page.waitForTimeout(1000)
    await page.click('a:has-text("Mint Morkie ID")');
    await page.waitForTimeout(1000)
    await page.click('a:has-text("Like Morkie Post On X")');
    await page.waitForTimeout(1000)
    await page.click('a:has-text("Retweet Morkie Post on X")');

    await page.waitForTimeout(16000)


    await page.click('button:has-text("Mint NFT")');
    await page.waitForTimeout(30000)

}

//dex interaction
async function encipherSwap(browser, page) {
  console.log("Executing ENCIPHER_SWAP");

  
  await page.goto(ENCIPHER_URL);

  await page.click('button:has-text("✕")');
  await page.click('a:has-text("Faucet")');
  await page.click('button:has-text("Connect Wallet")');
  await page.click('text=MetaMask');
  await page.reload()
  await page.click('button:has-text("Connect Wallet")');
  await page.click('text=MetaMask');
  console.log("🔓 Handling Metamask popup...");
  const [metamaskPopup] = await Promise.all([
      browser.waitForEvent('page'),
      page.waitForTimeout(3000)
  ]);
  // await page.waitForTimeout(5000);
  await metamaskPopup.bringToFront();
  // await metamaskPopup.waitForTimeout(3000);
  // Step 4: Enter Password and Unlock
  console.log("🔑 Entering password...");
  // await metamaskPopup.fill('input[type="password"]', "Password1!");
  await metamaskPopup.fill('#password', "Password1!");
  
  await metamaskPopup.click('button:has-text("Unlock")'); // Adjust if necessary
  console.log("🔑 Clicked unlcock");
  await metamaskPopup.click('button:has-text("Connect")'); // Adjust if necessary
  await page.click('button:has-text("Sign in with Twitter")'); // Adjust if necessary
  await page.waitForTimeout(3000);
  await page.click('button:has-text("Sign in with Google")'); // Adjust if necessary

}

//dex interaction
async function ambientFinance(browser, page) {
  console.log("Executing AMBIENT_FINANCE");

  
  await page.goto(AMBIENT_FINANCE_URL);

  await page.click('button:has-text("Connect Wallet")');
  // const agreeThere = await page.waitForSelector('button:has-text("Agree")');
  // if (agreeThere){
  //   await page.click('button:has-text("Agree")');
  // }
  await page.click('text=Metamask');

  await page.reload();

  await page.click('button:has-text("Connect Wallet")');
  // if (agreeThere){
  //   await page.click('button:has-text("Agree")');
  // }
  await page.click('text=Metamask');

  console.log("🔓 Handling Metamask popup...");
  const [metamaskPopup] = await Promise.all([
      browser.waitForEvent('page'),
      page.waitForTimeout(3000)
  ]);
  // await page.waitForTimeout(5000);
  await metamaskPopup.bringToFront();
  // await metamaskPopup.waitForTimeout(3000);
  // Step 4: Enter Password and Unlock
  console.log("🔑 Entering password...");
  // await metamaskPopup.fill('input[type="password"]', "Password1!");
  await metamaskPopup.fill('#password', "Password1!");
  
  await metamaskPopup.click('button:has-text("Unlock")'); // Adjust if necessary
  console.log("🔑 Clicked unlcock");
  await metamaskPopup.click('button:has-text("Connect")'); // Adjust if necessary
  
  await page.click('a:has-text("Swap")');
  await page.fill('#swap_sell_qty', '0.0001')
  await page.click('button:has-tet("Confirm")');
  await page.click('button:has-tet("Submit Swap")');
  await metamaskPopup.click('button:has-text("Confirm")'); // Adjust if necessary
  
  await page.click('#close_modal_button');
  
  await page.click('a:has-text("Pool")');
  await page.click('button:has-tet("Ambient")');
  await page.fill('#swap_sell_qty', '0.0001')
  await page.click('button:has-tet("Approve USDC")');
  await metamaskPopup.click('button:has-text("Next")'); // Adjust if necessary
  await metamaskPopup.click('button:has-text("Approve")'); // Adjust if necessary
  
  
  await page.click('a:has-text("Trade")');
  await page.click('button:has-tet("Confirm")');
  await page.click('button:has-tet("Submit Swap")');
  await metamaskPopup.click('button:has-text("Confirm")'); // Adjust if necessary

  await page.click('#close_modal_button');

}

//dex interaction
async function aprioriStake(browser, page) {
  console.log("Executing APRIORI_STAKE");
  

  await page.goto(APRIORI_URL);


  await page.click('button:has-text("Connect Wallet")');
  // const agreeThere = await page.waitForSelector('button:has-text("Agree")');
  // if (agreeThere){
  //   await page.click('button:has-text("Agree")');
  // }

  page.reload();

  await page.click('button:has-text("Connect Wallet")');
  // if (agreeThere){
  //   await page.click('button:has-text("Agree")');
  // }
  await page.click('text=Metamask');

  console.log("🔓 Handling Metamask popup...");
  const [metamaskPopup] = await Promise.all([
      browser.waitForEvent('page'),
      page.waitForTimeout(3000)
  ]);
  // await page.waitForTimeout(5000);
  await metamaskPopup.bringToFront();
  // await metamaskPopup.waitForTimeout(3000);
  // Step 4: Enter Password and Unlock
  console.log("🔑 Entering password...");
  // await metamaskPopup.fill('input[type="password"]', "Password1!");
  await metamaskPopup.fill('#password', "Password1!");
  
  await metamaskPopup.click('button:has-text("Unlock")'); // Adjust if necessary
  console.log("🔑 Clicked unlcock");
  await metamaskPopup.click('button:has-text("Connect")'); // Adjust if necessary
  
  // await page.fill('#mantine-ey5moxtil', '0.005')
  await page.fill('input[placeholder="0.0"]', '0.005');

  await page.click('//span[contains(text(), "Stake")]');
  await metamaskPopup.click('button:has-text("Confirm")');
}

//dex interaction
async function beanSwap(browser, page) {
  console.log("Executing BEAN_SWAP");
  
  await page.goto(BEAN_SWAP_URL);


  await page.click('button:has-text("Connect Wallet")');
  await page.click('text=Metamask');

  page.reload();

  await page.click('button:has-text("Connect Wallet")');
  await page.click('text=Metamask');

  console.log("🔓 Handling Metamask popup...");
  const [metamaskPopup] = await Promise.all([
      browser.waitForEvent('page'),
      page.waitForTimeout(3000)
  ]);
  // await page.waitForTimeout(5000);
  await metamaskPopup.bringToFront();
  // await metamaskPopup.waitForTimeout(3000);
  // Step 4: Enter Password and Unlock
  console.log("🔑 Entering password...");
  // await metamaskPopup.fill('input[type="password"]', "Password1!");
  await metamaskPopup.fill('#password', "Password1!");
  
  await metamaskPopup.click('button:has-text("Unlock")'); // Adjust if necessary
  console.log("🔑 Clicked unlcock");

  // await metamaskPopup.click('button:has-text("Connect")'); // Adjust if necessary
  
  await page.fill('.token-amount-input', '0.00001');
  await page.click('button:has-text("Swap")');
  await page.click('button:has-text("Confirm Swap")');
  await metamaskPopup.click('button:has-text("Confirm")');
  await page.click('button:has-text("Close")');
  
  
  await page.click('a:has-text("Liquidity")');
  await page.click('a:has-text("Find other LP tokens")');
  await page.click('button:has-text("Select a Token")');
  await page.click('text=USDC');
  await page.click('a:has-text("Add Liquidity")');
  await page.click('button:has-text("Add Liquidity")');

}

//dex interaction (INCOMPLETE)
async function bimaVault(browser, page) {
  console.log("Executing BIMA_VAULT");

  await page.goto(BIMA_MONEY_VAULT);


  await page.click('button:has-text("Connect Wallet")');
  await page.click('img[alt="metamask"]');
  
  page.reload()
  
  await page.click('button:has-text("Connect Wallet")');
  await page.click('img[alt="metamask"]');

  console.log("🔓 Handling Metamask popup...");
  const [metamaskPopup] = await Promise.all([
      browser.waitForEvent('page'),
      page.waitForTimeout(3000)
  ]);

  await metamaskPopup.bringToFront();

  // Step 4: Enter Password and Unlock
  console.log("🔑 Entering password...");
  await metamaskPopup.fill('#password', "Password1!");
  
  await metamaskPopup.click('button:has-text("Unlock")'); // Adjust if necessary
  console.log("🔑 Clicked unlcock");
  await metamaskPopup.click('button:has-text("Connect")'); // Adjust if necessary

  const [newMetamaskPopup] = await Promise.all([
      browser.waitForEvent('page'),
      page.waitForTimeout(3000)
  ]);
  await newMetamaskPopup.click('button:has-text("Confirm")'); // Adjust if necessary
}

//dex interaction (INCOMPLETE)
async function caddyFinance(browser, page) {
  console.log("Executing CADDY_FINANCE");

  
  await page.goto(CADDY_FINANCE);

  await page.click('appkit-button[label="Connect Wallet"]');
  await page.click('button:has-text("MetaMask")');

  page.reload()

  await page.click('appkit-button[label="Connect Wallet"]');
  await page.click('button:has-text("MetaMask")');


  console.log("🔓 Handling Metamask popup...");
  const [metamaskPopup] = await Promise.all([
      browser.waitForEvent('page'),
      page.waitForTimeout(3000)
  ]);

  await metamaskPopup.bringToFront();

  // Step 4: Enter Password and Unlock
  console.log("🔑 Entering password...");
  await metamaskPopup.fill('#password', "Password1!");
  
  await metamaskPopup.click('button:has-text("Unlock")'); // Adjust if necessary
  await metamaskPopup.click('button:has-text("Connect")'); // Adjust if necessary

  await page.click('w3m-modal >> text="Sign"');

  const [newMetamaskPopup] = await Promise.all([
      browser.waitForEvent('page'),
      page.waitForTimeout(3000)
  ]);

  await newMetamaskPopup.bringToFront();
  await newMetamaskPopup.click('button:has-text("Confirm")');

  await page.click('[data-testid="w3m-header-close"]');
}

async function getSepoliaEth(browser, page){
  await page.goto("https://www.alchemy.com/faucets/ethereum-sepolia");
  await page.fill("input[placeholder='Enter Your Wallet Address (0x...) or ETH Mainnet ENS Domain']", WALLET_ADDRESS);

  const sK = "6LcoGwYfAAAAACjwEkpB-PeW6X-GkCgETtEm32s1"


  const createTaskResponse = await fetch('https://api.capsolver.com/createTask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientKey: api_key,
      task: {
        type: 'ReCaptchaV2TaskProxyless',
        websiteURL: "https://www.alchemy.com/faucets/ethereum-sepolia",
        websiteKey: sK,
        minScore: 0.3,
        pageAction: 'homepage',
      },
    }),
  });
  const createTaskData = await createTaskResponse.json();

  if (!createTaskData.taskId) {
    console.error('Failed to create CapSolver task:', createTaskData);
    return await browser.close();
  }

  const taskId = createTaskData.taskId;
  console.log('Created CapSolver task, ID:', taskId);

  // 5. Poll for the solution token
  let solutionToken = null;
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 3000)); // wait 3s between polls

    const resultResponse = await fetch('https://api.capsolver.com/getTaskResult', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientKey: api_key,
        taskId,
      }),
    });
    const resultData = await resultResponse.json();

    if (resultData.status === 'ready') {
      solutionToken = resultData.solution.gRecaptchaResponse;
      console.log('Got reCAPTCHA v3 token:', solutionToken);
      break;
    } else if (resultData.status === 'processing') {
      console.log('CapSolver is still processing...');
    } else {
      console.error('Error from CapSolver:', resultData);
    }
  }

  if (!solutionToken) {
    console.error('No solution token received (timeout or error).');
    return await browser.close();
  }

  // 6. Inject the token into the page
  //    You may need to adapt this to the site’s specific flow.
  //    The most common approach is to set a hidden field named "g-recaptcha-response".
  await page.evaluate((token) => {
    let recaptchaField = document.querySelector('textarea[name="g-recaptcha-response"]');
    if (!recaptchaField) {
      // create a hidden textarea if the site doesn’t already have one
      recaptchaField = document.createElement('textarea');
      recaptchaField.name = 'g-recaptcha-response';
      recaptchaField.style.display = 'none';
      document.body.appendChild(recaptchaField);
    }
    recaptchaField.value = token;
  }, solutionToken);
    
  await page.click('button:has-text("Send Me ")');

}

async function sepToMonEth(browser, page) {
  await page.goto("https://testnet.orbiter.finance/en?src_chain=11155111&tgt_chain=421614&src_token=ETH");
  await page.click('button:has-text("Connect Wallet")');
  await page.locator('div:has-text("EVM") button:has-text("Connect")').click();
  
  await page.click('text=Metamask');

  page.reload();

  await page.locator('div:has-text("EVM") button:has-text("Connect")').click();

  await page.click('text=Metamask');

  console.log("🔓 Handling Metamask popup...");
  const [metamaskPopup] = await Promise.all([
      browser.waitForEvent('page'),
      page.waitForTimeout(3000)
  ]);
  // await page.waitForTimeout(5000);
  await metamaskPopup.bringToFront();
  // await metamaskPopup.waitForTimeout(3000);
  // Step 4: Enter Password and Unlock
  console.log("🔑 Entering password...");
  // await metamaskPopup.fill('input[type="password"]', "Password1!");
  await metamaskPopup.fill('#password', "Password1!");
  
  await metamaskPopup.click('button:has-text("Unlock")'); // Adjust if necessary
  console.log("🔑 Clicked unlcock");


  await page.fill('input[placeholder="0.01 ~ 10"]', '5')
  await page.click('label:has-text("Arbitrum Sepolia")');
  await page.fill('input[placeholder="Search Network"]', 'Monad')
  await page.click('text="Monad Testnet"');
  
  await page.click('text="Bridge"');
}


async function monEthtoMon(browser, page) {
  await page.goto("https://monad.ambient.finance/explore/pools");
  await page.click('text="Connect Wallet"');

  
  await page.click('text=Metamask');

  page.reload();

  await page.click('text="Connect Wallet"');

  await page.click('text=Metamask');

  console.log("🔓 Handling Metamask popup...");
  const [metamaskPopup] = await Promise.all([
      browser.waitForEvent('page'),
      page.waitForTimeout(3000)
  ]);
  // await page.waitForTimeout(5000);
  await metamaskPopup.bringToFront();
  // await metamaskPopup.waitForTimeout(3000);
  // Step 4: Enter Password and Unlock
  console.log("🔑 Entering password...");
  // await metamaskPopup.fill('input[type="password"]', "Password1!");
  await metamaskPopup.fill('#password', "Password1!");
  
  await metamaskPopup.click('button:has-text("Unlock")'); // Adjust if necessary
  console.log("🔑 Clicked unlcock");

  const button = page.locator('button:has-text("Monad Testnet")');

  if (await button.count() > 0) {
    // 4. Click it
    await button.click();
    console.log('Clicked the "Monad Testnet" button.');
  } else {
    console.log('Button not found.');
  }

  await metamaskPopup.click('button:has-text("Switch")');

  await page.click('text="ETH/MON"');

  await page.click('button:has-text("MON")');
  await page.click('#token_select_button_0x836047a99e11F376522B447bffb6e3495Dd0637c');
  await page.click('button:has-text("Approve ETH")');
  await page.click('button:has-text("Confirm")');
  await page.click('button:has-text("Submit Swap")');

  await metamaskPopup.click('button:has-text("Confirm")')

}

async function getTestMon(browser, page) {
  const tasks = [
    () => getSepoliaEth(browser, page),
    () => sepToMonEth(browser, page),
    () => monEthtoMon(browser, page),
];

for (const task of tasks) {
    try {
        await task();
        console.log(`✅ Completed ${task.name}`);
    } catch (error) {
        console.error(`❌ Error in ${task.name}:`, error.message);
    }
    await page.waitForTimeout(2000); // Optional: Add a small delay between tasks
}
  
}

async function main() {
  let browser;
  try {
    console.log("Launching browser...");

    // browser = await chromium.launch({ 
    //   headless: true,
    //   slowMo: 100, // Slow down operations by 100ms
    // });

    browser = await chromium.launchPersistentContext('./playwright_data', {
        headless: false,  // Extensions require a visible browser
        slowMo: 100,
        executablePath: CHROME_PATH, // Use Google Chrome
        args: [
            `--disable-extensions-except=${METAMASK_EXTENSION_PATH}`,
            `--load-extension=${METAMASK_EXTENSION_PATH}`
        ]
    });

    const page = await browser.newPage();
    
    // ////FAUCET
    // await claimMonadTokens();

    // ////NFTS
    // await mintLilChogStarsNFT(browser, page);
    // await stakeKintsu(browser, page);
    // await mintMorkieNFT(browser, page);

    // ////DEX
    // await encipherSwap(browser, page);
    // await ambientFinance(browser, page);
    // await aprioriStake(browser, page);
    // await beanSwap(browser, page);
    // await bimaVault(browser, page);
    // await caddyFinance(browser, page);
    

    // Run tasks one by one, ensuring each completes before moving to the next
    const tasks = [
        () => getTestMon(browser, page),
        () => claimMonadTokens(browser, page),
        () => mintLilChogStarsNFT(browser, page),
        () => stakeKintsu(browser, page),
        () => mintMorkieNFT(browser, page),
        () => encipherSwap(browser, page),
        () => ambientFinance(browser, page),
        () => aprioriStake(browser, page),
        () => beanSwap(browser, page),
        () => bimaVault(browser, page),
        () => caddyFinance(browser, page)
    ];

    for (const task of tasks) {
        try {
            await task();
            console.log(`✅ Completed ${task.name}`);
        } catch (error) {
            console.error(`❌ Error in ${task.name}:`, error.message);
        }
        await page.waitForTimeout(2000); // Optional: Add a small delay between tasks
    }

    console.log("All operations completed!");
  } catch (error) {
    console.error("Error in main function:", error.message);
  } finally {
    if (browser) {
      await browser.close();
      console.log("Browser closed.");
    }
  }
}

main();
