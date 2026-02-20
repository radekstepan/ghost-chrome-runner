import express from 'express';
import { BrowserController } from './browser';
import * as fs from 'fs';

const app = express();
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT || 3000;
// Default idle timeout: 5 minutes (300 seconds). Set to 0 to disable.
const IDLE_TIMEOUT_SEC = parseInt(process.env.IDLE_TIMEOUT || '300', 10);

const browser = new BrowserController();

// --- Idle Timer Logic ---
let lastActivity = Date.now();

// Middleware to update activity on every request
app.use((req, res, next) => {
  lastActivity = Date.now();
  next();
});

if (IDLE_TIMEOUT_SEC > 0) {
  console.log(`⏱️  Auto-shutdown enabled after ${IDLE_TIMEOUT_SEC}s of inactivity`);
  
  setInterval(() => {
    const elapsed = (Date.now() - lastActivity) / 1000;
    if (elapsed > IDLE_TIMEOUT_SEC) {
      console.log(`💤 Idle for ${elapsed.toFixed(0)}s. Shutting down to save resources...`);
      process.exit(0); // Exit cleanly. Docker 'on-failure' policy will NOT restart this.
    }
  }, 10000); // Check every 10s
}
// ------------------------

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
    const { selector, double } = req.body;
    if (double) {
      await browser.stealthDoubleClick(selector);
    } else {
      await browser.stealthClick(selector);
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/drag', async (req, res) => {
  try {
    const { source, target } = req.body;
    await browser.stealthDragAndDrop(source, target);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/upload', async (req, res) => {
  try {
    const { selector, filePath } = req.body;
    await browser.uploadFile(selector, filePath);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/frame', async (req, res) => {
  try {
    const { selector } = req.body;
    if (!selector || selector === 'main' || selector === 'default') {
      await browser.switchToMainFrame();
    } else {
      await browser.switchToFrame(selector);
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/highlight', async (req, res) => {
  try {
    const { selector } = req.body;
    await browser.highlightElement(selector);
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

app.post('/fill', async (req, res) => {
  try {
    const { selector, text } = req.body;
    await browser.stealthFill(selector, text);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/hover', async (req, res) => {
  try {
    const { selector } = req.body;
    await browser.stealthHover(selector);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/scroll', async (req, res) => {
  try {
    const { y } = req.body;
    await browser.stealthScroll(y);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/press', async (req, res) => {
  try {
    const { key } = req.body;
    await browser.keyboardPress(key);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/wait', async (req, res) => {
  try {
    const { selector, timeout } = req.body;
    await browser.waitForSelector(selector, timeout);
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

app.get('/snapshot/interactive', async (req, res) => {
  try {
    const elements = await browser.getInteractiveElements();
    res.json({ success: true, elements });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/screenshot', async (req, res) => {
  try {
    const buffer = await browser.takeScreenshot();
    res.set('Content-Type', 'image/png');
    res.send(buffer);
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/tabs', async (req, res) => {
  try {
    const tabs = await browser.getTabs();
    res.json({ success: true, tabs });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/switch', async (req, res) => {
  try {
    const { index } = req.body;
    await browser.switchTab(index);
    res.json({ success: true, index });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/cookies', async (req, res) => {
  try {
    const cookies = await browser.getCookies();
    res.json({ success: true, cookies });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/cookies', async (req, res) => {
  try {
    const { name, value, url } = req.body;
    await browser.setCookie(name, value, url);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/logs', (req, res) => {
  try {
    const logPath = '/var/log/chrome.log';
    if (fs.existsSync(logPath)) {
      const stats = fs.statSync(logPath);
      const size = stats.size;
      const start = Math.max(0, size - 2000);
      const stream = fs.createReadStream(logPath, { start });
      res.set('Content-Type', 'text/plain');
      stream.pipe(res);
    } else {
      res.send('No logs found');
    }
  } catch (e: any) {
    res.status(500).send(e.message);
  }
});

app.get('/view', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Ghost Chrome Live</title>
        <style>
          body { 
            background: #111; 
            color: #eee; 
            font-family: sans-serif; 
            text-align: center; 
            margin: 0;
            padding: 20px;
          }
          .viewer-container {
            position: relative;
            display: inline-block;
            max-width: 95vw;
            height: 80vh;
            width: 100%;
          }
          img { 
            position: absolute;
            top: 0;
            left: 50%;
            transform: translateX(-50%);
            border: 2px solid #333; 
            max-width: 100%; 
            max-height: 100%;
            box-shadow: 0 0 20px rgba(0,0,0,0.5); 
            opacity: 0;
            transition: opacity 0.5s ease-in-out;
          }
          img.active {
            opacity: 1;
          }
          h1 { margin-bottom: 20px; }
          .status { margin-top: 10px; color: #888; font-size: 0.9em; }
        </style>
      </head>
      <body>
        <h1>👻 Ghost Chrome Live</h1>
        <div class="viewer-container">
          <img id="img1" class="active" src="/screenshot?t=${Date.now()}" />
          <img id="img2" src="" />
        </div>
        <div class="status">Live Feed • <span id="timer">Updating...</span></div>

        <script>
          let activeId = 1;
          const img1 = document.getElementById('img1');
          const img2 = document.getElementById('img2');
          const timerEl = document.getElementById('timer');

          async function updateImage() {
            const nextId = activeId === 1 ? 2 : 1;
            const activeImg = activeId === 1 ? img1 : img2;
            const nextImg = activeId === 1 ? img2 : img1;

            // Pre-load next image
            const newSrc = "/screenshot?t=" + Date.now();
            
            // Create a temporary image object to detect when the byte data is fully loaded
            const tempImg = new Image();
            tempImg.onload = () => {
              nextImg.src = newSrc;
              nextImg.classList.add('active');
              activeImg.classList.remove('active');
              activeId = nextId;
              
              timerEl.textContent = "Last sync: " + new Date().toLocaleTimeString();
              setTimeout(updateImage, 1000); // 1s delay AFTER load
            };
            tempImg.onerror = () => {
              console.error("Failed to load screenshot");
              setTimeout(updateImage, 2000);
            };
            tempImg.src = newSrc;
          }

          // Initial start
          setTimeout(updateImage, 1000);
        </script>
      </body>
    </html>
  `);
});

browser.connect().then(() => {
  app.listen(PORT, () => {
    console.log(`👻 Ghost Controller listening on port ${PORT}`);
  });
});
