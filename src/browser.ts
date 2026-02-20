import puppeteer, { Browser, Page } from 'puppeteer-core';
import { applyStealthScripts } from './stealth';
import { moveMouseHumanLike } from './input';

export class BrowserController {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private refMap: Map<string, string> = new Map();

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

  private resolveSelector(selector: string): string {
    if (selector.startsWith('@')) {
      const id = selector.slice(1);
      return `[data-ghost-id="${id}"]`;
    }
    return selector;
  }

  async navigate(url: string) {
    if (!this.page) throw new Error('Browser not connected');
    this.refMap.clear();
    await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  }

  async stealthClick(selector: string) {
    if (!this.page) throw new Error('Browser not connected');
    
    const resolvedSelector = this.resolveSelector(selector);
    const element = await this.page.$(resolvedSelector);
    if (!element) throw new Error(`Element not found: ${selector}`);

    // Ensure it's in view
    await element.evaluate((el) => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    await new Promise(r => setTimeout(r, 500)); // Wait for scroll to settle

    const box = await element.boundingBox();
    if (!box) throw new Error('Element is not visible after scroll');

    const x = box.x + box.width / 2 + (Math.random() * 10 - 5);
    const y = box.y + box.height / 2 + (Math.random() * 10 - 5);

    await moveMouseHumanLike(this.page, x, y);
    
    await this.page.mouse.down();
    await new Promise(r => setTimeout(r, Math.random() * 50 + 50));
    await this.page.mouse.up();
  }

  async stealthHover(selector: string) {
    if (!this.page) throw new Error('Browser not connected');
    
    const resolvedSelector = this.resolveSelector(selector);
    const element = await this.page.$(resolvedSelector);
    if (!element) throw new Error(`Element not found: ${selector}`);

    await element.evaluate((el) => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    await new Promise(r => setTimeout(r, 500));

    const box = await element.boundingBox();
    if (!box) throw new Error('Element is not visible');

    const x = box.x + box.width / 2 + (Math.random() * 10 - 5);
    const y = box.y + box.height / 2 + (Math.random() * 10 - 5);

    await moveMouseHumanLike(this.page, x, y);
  }

  async stealthType(selector: string, text: string) {
    if (!this.page) throw new Error('Browser not connected');
    
    await this.stealthClick(selector);

    for (const char of text) {
      await this.page.keyboard.type(char, { delay: Math.random() * 100 + 30 });
    }
  }

  async stealthFill(selector: string, text: string) {
    if (!this.page) throw new Error('Browser not connected');

    await this.stealthClick(selector);
    
    // Select all and delete (alternative to clear)
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await this.page.keyboard.down(modifier);
    await this.page.keyboard.press('a');
    await this.page.keyboard.up(modifier);
    await this.page.keyboard.press('Backspace');

    for (const char of text) {
      await this.page.keyboard.type(char, { delay: Math.random() * 100 + 30 });
    }
  }

  async stealthScroll(deltaY: number = 500) {
    if (!this.page) throw new Error('Browser not connected');
    
    // Instead of teleporting, we use mouse wheel steps
    const steps = 10;
    const stepY = deltaY / steps;
    
    for (let i = 0; i < steps; i++) {
        await this.page.mouse.wheel({ deltaY: stepY });
        await new Promise(r => setTimeout(r, Math.random() * 50 + 50));
    }
  }

  async keyboardPress(key: string) {
    if (!this.page) throw new Error('Browser not connected');
    await this.page.keyboard.press(key as any, { delay: Math.random() * 50 + 50 });
  }

  async waitForSelector(selector: string, timeout: number = 30000) {
    if (!this.page) throw new Error('Browser not connected');
    const resolvedSelector = this.resolveSelector(selector);
    await this.page.waitForSelector(resolvedSelector, { timeout });
  }

  async getInteractiveElements() {
    if (!this.page) throw new Error('Browser not connected');

    return await this.page.evaluate(() => {
      const interactives = Array.from(document.querySelectorAll('a, button, input, select, textarea, [onclick], [role="button"]'));
      return interactives.map((el, index) => {
        const id = `e${index + 1}`;
        el.setAttribute('data-ghost-id', id);
        
        return {
          id: `@${id}`,
          tagName: el.tagName.toLowerCase(),
          text: (el as HTMLElement).innerText?.trim().slice(0, 50) || (el as HTMLInputElement).placeholder || (el as HTMLInputElement).value || '',
          type: (el as HTMLInputElement).type || undefined,
          role: el.getAttribute('role') || undefined
        };
      });
    });
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

  async getTabs() {
    if (!this.browser) throw new Error('Browser not connected');
    const pages = await this.browser.pages();
    return pages.map((p, i) => ({
      index: i,
      url: p.url(),
      title: 'Page ' + i // Titles might be slow to fetch sometimes
    }));
  }

  async switchTab(index: number) {
    if (!this.browser) throw new Error('Browser not connected');
    const pages = await this.browser.pages();
    if (index >= 0 && index < pages.length) {
      this.page = pages[index];
      await this.page.bringToFront();
    } else {
      throw new Error(`Invalid tab index: ${index}`);
    }
  }

  async getCookies() {
    if (!this.page) throw new Error('Browser not connected');
    return await this.page.cookies();
  }

  async setCookie(name: string, value: string, url?: string) {
    if (!this.page) throw new Error('Browser not connected');
    await this.page.setCookie({ name, value, url: url || this.page.url() });
  }

  async clearCookies() {
    if (!this.browser) throw new Error('Browser not connected');
    const pages = await this.browser.pages();
    for (const page of pages) {
      const cookies = await page.cookies();
      await page.deleteCookie(...cookies);
    }
  }
}
