/**
 * Scripts injected into the browser to hide automation traces.
 * This runs inside the browser context.
 */
export function applyStealthScripts() {
  // 1. Overwrite the `navigator.webdriver` property
  Object.defineProperty(navigator, 'webdriver', {
    get: () => undefined,
  });

  // 2. Mock plugins (Headless chrome usually has 0)
  // We overwrite the getter to return a fake array
  Object.defineProperty(navigator, 'plugins', {
    get: () => {
      return [
        {
          0: {
            type: "application/x-google-chrome-pdf",
            suffixes: "pdf",
            description: "Portable Document Format",
            enabledPlugin: Plugin,
          },
          description: "Portable Document Format",
          filename: "internal-pdf-viewer",
          length: 1,
          name: "Chrome PDF Plugin",
        },
      ];
    },
  });

  // 3. Mock languages
  Object.defineProperty(navigator, 'languages', {
    get: () => ['en-US', 'en'],
  });

  // 4. Fix window.chrome
  if (!(window as any).chrome) {
    (window as any).chrome = {
      runtime: {},
      app: {},
      csi: () => {},
      loadTimes: () => {},
    };
  }

  // 5. Mask permission prompts (Notification permission query often reveals headless)
  const originalQuery = window.navigator.permissions.query;
  window.navigator.permissions.query = (parameters: any) => (
    parameters.name === 'notifications' ?
      Promise.resolve({ state: Notification.permission } as PermissionStatus) :
      originalQuery(parameters)
  );
}
