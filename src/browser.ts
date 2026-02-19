import puppeteer, { Browser, Page } from 'puppeteer-core';
import { applyStealthScripts } from './stealth';
import { moveMouseHumanLike } from './input';

export class BrowserController {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async connect() {
    let retries = 10;
    while (retries > 0) {
      try {
        console.log(`🔌 Connecting to Chrome... (${retries} attempts left)`);
        this.browser = await puppeteer.connect({
          browserURL: 'http://127.0.0.1:9222',
          defaultViewport: null
        });

        const pages = await this.browser.pages();
        this.page = pages.length > 0 ? pages[0] : await this.browser.newPage();

        console.log('✅ Connected to Ghost Chrome');
        await this.enableStealth(this.page);
        
        this.browser.on('disconnected', () => {
          console.log('❌ Chrome disconnected');
          this.browser = null;
        });
        return;
      } catch (error) {
        retries--;
        await new Promise(r => setTimeout(r, 1000));
      }
    }
    console.error('❌ Failed to connect to Chrome after multiple attempts');
  }

  isConnected() {
    return this.browser !== null;
  }

  async enableStealth(page: Page) {
    await page.evaluateOnNewDocument(applyStealthScripts);
  }

  async navigate(url: string) {
    if (!this.page) throw new Error('Browser not connected');
    await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  }

  async stealthClick(selector: string) {
    if (!this.page) throw new Error('Browser not connected');
    
    const element = await this.page.$(selector);
    if (!element) throw new Error(`Element not found: ${selector}`);

    const box = await element.boundingBox();
    if (!box) throw new Error('Element is not visible');

    const x = box.x + box.width / 2 + (Math.random() * 10 - 5);
    const y = box.y + box.height / 2 + (Math.random() * 10 - 5);

    await moveMouseHumanLike(this.page, x, y);
    
    await this.page.mouse.down();
    await new Promise(r => setTimeout(r, Math.random() * 50 + 50));
    await this.page.mouse.up();
  }

  async stealthType(selector: string, text: string) {
    if (!this.page) throw new Error('Browser not connected');
    
    await this.stealthClick(selector);

    for (const char of text) {
      await this.page.keyboard.type(char, { delay: Math.random() * 100 + 30 });
    }
  }

  async getSnapshot() {
    if (!this.page) throw new Error('Browser not connected');
    
    return await this.page.evaluate(() => {
      return document.body.innerText;
    });
  }

  async takeScreenshot() {
    if (!this.page) throw new Error('Browser not connected');
    // Returns binary buffer instead of base64 string for better performance
    return await this.page.screenshot({ type: 'png' });
  }
}
