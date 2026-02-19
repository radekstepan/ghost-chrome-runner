import puppeteer, { Browser, Page } from 'puppeteer-core';
import { applyStealthScripts } from './stealth';
import { moveMouseHumanLike } from './input';

export class BrowserController {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async connect() {
    try {
      // Connect to the locally running Chrome via CDP port 9222
      this.browser = await puppeteer.connect({
        browserURL: 'http://127.0.0.1:9222',
        defaultViewport: null // Let Chrome determine viewport (maximized)
      });

      // Get the first active page or create one
      const pages = await this.browser.pages();
      this.page = pages.length > 0 ? pages[0] : await this.browser.newPage();

      console.log('✅ Connected to Ghost Chrome');
      
      // Apply stealth overrides on new document creation
      await this.enableStealth(this.page);
      
      this.browser.on('disconnected', () => {
        console.log('❌ Chrome disconnected');
        this.browser = null;
      });
    } catch (error) {
      console.error('Failed to connect to Chrome:', error);
      // Retry logic could go here
      setTimeout(() => this.connect(), 2000);
    }
  }

  isConnected() {
    return this.browser !== null;
  }

  async enableStealth(page: Page) {
    // Apply scripts to every navigation
    await page.evaluateOnNewDocument(applyStealthScripts);
  }

  async navigate(url: string) {
    if (!this.page) throw new Error('Browser not connected');
    await this.page.goto(url, { waitUntil: 'networkidle2' });
  }

  async stealthClick(selector: string) {
    if (!this.page) throw new Error('Browser not connected');
    
    const element = await this.page.$(selector);
    if (!element) throw new Error(`Element not found: ${selector}`);

    // Get bounding box
    const box = await element.boundingBox();
    if (!box) throw new Error('Element is not visible');

    // Calculate center with random jitter
    const x = box.x + box.width / 2 + (Math.random() * 10 - 5);
    const y = box.y + box.height / 2 + (Math.random() * 10 - 5);

    // Move mouse in a human-like curve
    await moveMouseHumanLike(this.page, x, y);
    
    // Click with slight delay between down/up
    await this.page.mouse.down();
    await new Promise(r => setTimeout(r, Math.random() * 50 + 50));
    await this.page.mouse.up();
  }

  async stealthType(selector: string, text: string) {
    if (!this.page) throw new Error('Browser not connected');
    
    // Click first to focus (human behavior)
    await this.stealthClick(selector);

    // Type with variable delay
    for (const char of text) {
      await this.page.keyboard.type(char, { delay: Math.random() * 100 + 30 });
    }
  }

  async getSnapshot() {
    if (!this.page) throw new Error('Browser not connected');
    
    // Simple snapshot for LLMs - extract readable text
    // In a real implementation, this would return the @ref system from agent-browser
    return await this.page.evaluate(() => {
      return document.body.innerText;
    });
  }
}
