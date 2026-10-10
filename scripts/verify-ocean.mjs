import { chromium, expect } from '@playwright/test';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';

// Exercise the real UI and real backend with a disposable database. The normal
// localhost servers remain running; only this browser's API requests are routed
// to the isolated backend. No production accounts or catalog entries are changed.
const root = process.cwd();
const temporary = await mkdtemp(join(tmpdir(), 'internmatch-ui-'));
const screenshots = resolve('.local-logs/ui');
await mkdir(screenshots, { recursive: true });
const password = randomBytes(24).toString('base64url');
const env = { ...process.env, APP_DATABASE_PATH: join(temporary, 'ui.sqlite3'), DATABASE_URL: '', VERCEL: '', APP_ENV: 'development', COOKIE_SECURE: 'false', UI_TEST_PASSWORD: password };
const python = resolve('.venv/Scripts/python.exe');
const setup = `from backend.app.database import initialize, connection
from backend.app.accounts import password_hash
import os,uuid,time
initialize()
with connection() as db:
 db.execute('INSERT INTO users(id,email,name,password_hash,role,created_at) VALUES (?,?,?,?,?,?)',(uuid.uuid4().hex,'admin@example.test','UI Admin',password_hash(os.environ['UI_TEST_PASSWORD']),'admin',int(time.time())))`;
const created = spawnSync(python, ['-c', setup], { cwd: root, env, encoding: 'utf8' });
if (created.status !== 0) throw new Error(created.stderr);
const server = spawn(python, ['-m', 'uvicorn', 'backend.app.main:app', '--host', '127.0.0.1', '--port', '8001'], { cwd: root, env, stdio: 'pipe', windowsHide: true });
let browser;
const errors = [];
let checks = 0;
try {
  for (let attempt = 0; attempt < 60; attempt++) {
    try { if ((await fetch('http://127.0.0.1:8001/api/health')).ok) break; } catch {}
    if (attempt === 59) throw new Error('Isolated backend did not start');
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  console.log('Browser launched; verifying authentication and theme persistence.');
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && !message.text().includes('401 (Unauthorized)')) errors.push(message.text()); });
  await context.route('**/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const response = await route.fetch({ url: `http://127.0.0.1:8001${url.pathname}${url.search}`, headers: request.headers() });
    await route.fulfill({ response });
  });
  await page.goto('http://localhost:3000');
  await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('button', { name: 'Switch to Ocean Light' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Switch to Ocean Light' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Switch to Midnight Ocean' }).click();
  await page.screenshot({ path: join(screenshots, 'auth-dark.png'), fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Student registration' }).click();
  await page.getByLabel('Name', { exact: true }).fill('UI Student');
  await page.getByLabel('Email address').fill('student@example.test');
  await page.getByLabel(/^Password/).fill(password);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Student profile', exact: true })).toBeVisible();
  await page.getByLabel('Engineering branch').selectOption('Computer Science & Engineering');
  await page.getByLabel('Current CGPA').fill('8.5');
  await page.getByLabel('Preferred location').selectOption('Pune');
  await page.getByLabel('Skills', { exact: true }).fill('Python, SQL, React, TypeScript');
  await page.getByLabel('Skills', { exact: true }).press('Enter');
  await page.getByLabel('Interests & direction', { exact: true }).count().then(async count => {
    // The tag editor uses the actual "Interests" label.
    if (count === 0) {
      await page.getByLabel('Interests', { exact: true }).fill('Research, Developer tools');
      await page.getByLabel('Interests', { exact: true }).press('Enter');
    }
  });
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Profile saved' })).toBeVisible();
  console.log('Registration and profile saved; checking both themes at five widths.');
  const routes = ['/profile', '/internships', '/recommendations', '/graph', '/applications', '/internships/razorpay-swe'];
  for (const theme of ['dark', 'light']) {
    if ((await page.locator('html').getAttribute('data-theme')) !== theme) await page.getByRole('button', { name: `Switch to ${theme === 'dark' ? 'Midnight Ocean' : 'Ocean Light'}` }).click();
    const contrasts = await page.evaluate(() => {
      const styles = getComputedStyle(document.documentElement);
      const luminance = token => {
        const hex = styles.getPropertyValue(token).trim();
        const rgb = hex.slice(1).match(/.{2}/g).map(value => parseInt(value, 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
        return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
      };
      return [['--text', '--paper'], ['--muted', '--paper'], ['--primary-text', '--primary']].map(([foreground, background]) => {
        const a = luminance(foreground), b = luminance(background);
        return {pair:`${foreground}/${background}`,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
      });
    });
    for (const contrast of contrasts) expect(contrast.ratio, `${theme} ${contrast.pair} contrast`).toBeGreaterThanOrEqual(4.5);
    for (const width of [1440, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const route of routes) {
        await page.goto(`http://localhost:3000${route}`);
        await expect(page.locator('#main-content')).toBeVisible();
        await expect(page.locator('.loading-skeleton')).toHaveCount(0);
        if (route === '/graph') await expect(page.getByText('Analytics connected', { exact: true })).toBeVisible();
        const overflow = await page.evaluate(() => ({ width: window.innerWidth, content: document.documentElement.scrollWidth }));
        if (overflow.content > overflow.width + 1) {
          console.log(await page.evaluate(() => [...document.querySelectorAll('body *')].map(element => ({tag:element.tagName,class:element.className,right:element.getBoundingClientRect().right,width:element.getBoundingClientRect().width})).filter(item=>item.right>innerWidth+1).slice(0,20)));
          await page.screenshot({path:join(screenshots,'overflow.png'),fullPage:true,animations:'disabled'});
        }
        expect(overflow.content, `${theme} ${width}px ${route} horizontal overflow`).toBeLessThanOrEqual(overflow.width + 1);
        if (width === 1440 && route === '/recommendations' || width === 390 && route === '/internships') await page.screenshot({ path: join(screenshots, `${route.slice(1)}-${theme}-${width}.png`), animations: 'disabled' });
        checks++;
      }
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('http://localhost:3000/internships');
  await expect(page.locator('.opportunity-card').first()).toBeVisible();
  await page.locator('.list-search input').fill('Python');
  const cards = await page.locator('.opportunity-card').count();
  expect(cards).toBeGreaterThan(0);
  expect(cards).toBeLessThan(40);
  await page.getByRole('button', { name: /^Filters/ }).click();
  await expect(page.locator('.filter-panel')).toBeVisible();
  await page.locator('.opportunity-card').first().getByRole('button', { name: 'Save internship', exact: true }).click();
  await page.locator('.side-nav').getByRole('link', { name: 'Applications', exact: true }).click();
  await expect(page.locator('.tracker-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Mark applied', exact: true }).click();
  await expect(page.getByLabel('Applied applications').locator('.tracker-card')).toHaveCount(1);
  await page.reload();
  await expect(page.getByLabel('Applied applications').locator('.tracker-card')).toHaveCount(1);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.locator('.sidebar')).toHaveClass(/sidebar--open/);
  await page.locator('.side-nav').getByRole('link', { name: 'My profile', exact: true }).click();
  await expect(page.locator('.sidebar')).not.toHaveClass(/sidebar--open/);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.getByLabel('Email address').fill('admin@example.test');
  await page.getByLabel(/^Password/).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).last().click();
  await page.goto('http://localhost:3000/admin');
  await expect(page.getByRole('heading', { name: 'Manage internships', exact: true })).toBeVisible();
  for (const theme of ['light', 'dark']) {
    if ((await page.locator('html').getAttribute('data-theme')) !== theme) await page.getByRole('button', { name: `Switch to ${theme === 'dark' ? 'Midnight Ocean' : 'Ocean Light'}` }).click();
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      const size = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
      expect(size[0], `Admin ${theme} ${width} overflow`).toBeLessThanOrEqual(size[1] + 1);
      checks++;
    }
  }
  await page.screenshot({ path: join(screenshots, 'admin-dark-mobile.png'), fullPage: true, animations: 'disabled' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await page.locator('.page-stack').evaluate(element => getComputedStyle(element).animationName)).toBe('none');
  expect(errors, 'Browser runtime and console errors').toEqual([]);
  console.log(`PASS: ${checks} page/theme/viewport checks; keyboard theme toggle and persistence; student registration, profile, search/filter, saved roles, tracker persistence, mobile navigation, admin login, reduced motion; no unexpected console/runtime errors. Screenshots: ${screenshots}`);
} finally {
  await browser?.close();
  server.kill();
  await new Promise(resolve => server.exitCode !== null ? resolve() : server.once('exit', resolve));
  await rm(temporary, { recursive: true, force: true });
}
