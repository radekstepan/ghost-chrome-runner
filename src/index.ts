import express from 'express';
import { BrowserController } from './browser';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const browser = new BrowserController();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', chrome: browser.isConnected() });
});

// Navigate command
app.post('/navigate', async (req, res) => {
  try {
    const { url } = req.body;
    await browser.navigate(url);
    res.json({ success: true, url });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Stealth Click command (uses Bezier curves)
app.post('/click', async (req, res) => {
  try {
    const { selector } = req.body;
    await browser.stealthClick(selector);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Stealth Type command (uses variable delay)
app.post('/type', async (req, res) => {
  try {
    const { selector, text } = req.body;
    await browser.stealthType(selector, text);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Snapshot (return page text/structure)
app.get('/snapshot', async (req, res) => {
  try {
    const snapshot = await browser.getSnapshot();
    res.json({ success: true, snapshot });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Initialize connection to local Chrome
browser.connect().then(() => {
  app.listen(PORT, () => {
    console.log(`👻 Ghost Controller listening on port ${PORT}`);
  });
});
