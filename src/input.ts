import { Page } from 'puppeteer-core';

/**
 * Basic implementation of Bezier curve mouse movement to simulate human behavior.
 */
export async function moveMouseHumanLike(page: Page, targetX: number, targetY: number) {
  // Get current mouse position (tracking internally in Puppeteer)
  // Note: Puppeteer doesn't expose current pos easily, so we assume last known
  // or start from a random edge if unknown.
  
  const steps = 25;
  const startX = Math.random() * 100; // Simulated start
  const startY = Math.random() * 100;

  // Simple Linear Interpolation with noise (Simplified for this example)
  // A full implementation would use cubic Bezier curves control points
  
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    
    // Add noise/arc
    const noiseX = Math.sin(t * Math.PI) * (Math.random() * 20 - 10);
    const noiseY = Math.cos(t * Math.PI) * (Math.random() * 20 - 10);

    const x = startX + (targetX - startX) * t + noiseX;
    const y = startY + (targetY - startY) * t + noiseY;

    await page.mouse.move(x, y);
    
    // Variable delay between steps
    await new Promise(r => setTimeout(r, Math.random() * 10 + 5));
  }
}
