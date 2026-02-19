import express from 'express';
import { BrowserController } from './browser';

const app = express();
// Increase limit for screenshots
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT || 3000;
const browser = new BrowserController();

app.get('/health', (req, res) => {
  res.json({ status: 'ok', chrome: browser.isConnected() });
});

app.post('/navigate', async (req, res) => {
  try {
    const { url } = req.body;
    await browser.navigate(url);
    res.json({ success: true, url });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/click', async (req, res) => {
  try {
    const { selector } = req.body;
    await browser.stealthClick(selector);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/type', async (req, res) => {
  try {
    const { selector, text } = req.body;
    await browser.stealthType(selector, text);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/snapshot', async (req, res) => {
  try {
    const snapshot = await browser.getSnapshot();
    res.json({ success: true, snapshot });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Added screenshot endpoint
app.get('/screenshot', async (req, res) => {
  try {
    const base64 = await browser.takeScreenshot();
    res.json({ success: true, screenshot: base64 });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

browser.connect().then(() => {
  app.listen(PORT, () => {
    console.log(`👻 Ghost Controller listening on port ${PORT}`);
  });
});
