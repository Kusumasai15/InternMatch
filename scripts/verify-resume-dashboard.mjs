import { chromium, expect } from '@playwright/test';

// Frontend contract tests; parser behavior is covered by backend/test_resumes.py.
// Run against npm run dev (or set RESUME_UI_URL to a production preview).
const base = process.env.RESUME_UI_URL || 'http://127.0.0.1:3000';
const browser = await chromium.launch();
const profile = {name:'Resume Student',branch:'Computer Science & Engineering',cgpa:8.5,location:'Pune',skills:['Python'],interests:['Research']};
const opening = {id:'resume-match',role:'React intern',company:'Example',sector:'Software',location:'Pune',duration:'3 months',summary:'Build interfaces',closing:'2027-01-01',branches:[profile.branch],requiredSkills:['React'],interests:['Design'],stipend:10000,minCgpa:7,openings:1,applicants:0,workMode:'Hybrid'};
const errors = [];
try {
  for (const scenario of ['student','incomplete','admin','guest']) {
    const context = await browser.newContext();
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    let account = scenario === 'guest' ? null : {id:scenario,email:'resume@example.test',name:profile.name,role:scenario === 'admin' ? 'admin' : 'student',profile:scenario === 'incomplete' ? null : {...profile}};
    let analysis = null;
    let reads = 0;
    let uploads = 0;
    let saves = 0;
    let failUpload = false;
    await context.route('**/api/**', async route => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      const method = request.method();
      const json = body => route.fulfill({json:body});
      if (path === '/api/auth/me') return account ? json({user:account,csrfToken:'test'}) : route.fulfill({status:401,json:{detail:'Sign in'}});
      if (path === '/api/internships') return json([opening]);
      if (path === '/api/resume/upload') {
        uploads++;
        if (failUpload) return route.fulfill({status:422,json:{detail:'No usable text found. Upload a text-based resume.'}});
        analysis = {skills:['React','SQL'],projectSkills:[],suggestedBranch:null,suggestedInterests:[],sectionsDetected:{skills:true}};
        if (account.profile) account.profile = {...account.profile,skills:analysis.skills};
        return json({analysis});
      }
      if (path === '/api/resume' && method === 'GET') {reads++;return json({analysis});}
      if (path === '/api/resume' && method === 'PUT') {
        saves++;analysis = {...analysis,skills:request.postDataJSON().skills};
        if(account.profile) account.profile = {...account.profile,skills:analysis.skills};
        return json({analysis});
      }
      if (path === '/api/resume' && method === 'DELETE') {analysis=null;return json({analysis});}
      return json({});
    });
    await page.goto(`${base}${scenario === 'student' || scenario === 'incomplete' ? '/' : '/recommendations'}`, {waitUntil:'domcontentloaded'});
    const heading = page.getByRole('heading',{name:'AI Resume Analyzer / Upload Resume',exact:true});
    if (scenario === 'guest' || scenario === 'admin') {
      await expect(page.getByRole('heading',{name:scenario === 'guest' ? 'Sign in' : 'Recommended internships',exact:true})).toBeVisible();
      await expect(heading).toHaveCount(0);
      await expect(page.locator('.side-nav a[href="/resume"]')).toHaveCount(0);
      expect(reads).toBe(0);
      await context.close();continue;
    }
    const analyzerLink = page.locator('.side-nav').getByRole('link',{name:'AI Resume Analyzer',exact:true});
    await expect(analyzerLink).toBeVisible();
    await expect(page.locator('.side-nav a[href="/profile"] + a')).toHaveAttribute('href','/resume');
    await expect(analyzerLink.locator('svg')).toHaveClass(/lucide-file-up/);
    await analyzerLink.click();
    await expect(page).toHaveURL(`${base}/resume`);
    await expect(analyzerLink).toHaveAttribute('aria-current','page');
    await expect(heading).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(`${base}/`);
    await page.goForward();
    await expect(page).toHaveURL(`${base}/resume`);
    await expect(heading).toBeVisible();
    const input = page.getByLabel('Upload Resume',{exact:true});
    await expect(input).toBeEnabled();
    expect(await heading.evaluate(el=>el.getBoundingClientRect().top)).toBeLessThan(600);
    expect(reads).toBe(1); // Also verifies StrictMode deduplication on the dev server.
    await input.setInputFiles({name:'invalid.txt',mimeType:'text/plain',buffer:Buffer.from('React')});
    await expect(page.getByRole('alert')).toContainText('Choose a PDF or DOCX');
    expect(uploads).toBe(0);
    for (const extension of ['pdf','docx']) {
      await input.setInputFiles({name:`resume.${extension}`,mimeType:extension === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer:Buffer.from('resume fixture')});
      await expect(page.getByRole('button',{name:'Remove resume skill React',exact:true})).toBeVisible();
      await expect(input).toBeEnabled();
    }
    expect(uploads).toBe(2);expect(reads).toBe(1);
    await page.getByRole('button',{name:'Remove resume skill SQL',exact:true}).click();
    await page.getByLabel('Add resume skill').fill('TypeScript');
    await page.getByRole('button',{name:'Add skill',exact:true}).click();
    if (scenario === 'incomplete') {
      await expect(page.getByRole('link',{name:'Complete student profile'})).toHaveAttribute('href','/profile');
      await page.getByRole('link',{name:'Complete student profile'}).click();
    } else await page.locator('.side-nav a[href="/profile"]').click();
    await expect(page.getByRole('heading',{name:'Student profile',exact:true})).toBeVisible();
    await expect(page.getByRole('button',{name:'Remove resume skill SQL',exact:true})).toHaveCount(0);
    await expect(page.getByRole('button',{name:'Remove resume skill TypeScript',exact:true})).toBeVisible();
    expect(reads).toBe(1);
    await page.getByRole('button',{name:'Save reviewed skills',exact:true}).click();
    await expect(page.locator('.resume-panel').getByRole('status').filter({hasText:'Reviewed skills saved'})).toBeVisible();
    expect(saves).toBe(1);
    if (scenario === 'incomplete') {
      await expect(page.getByRole('button',{name:'Remove React',exact:true})).toBeVisible();
      await expect(page.getByRole('button',{name:'Remove SQL',exact:true})).toHaveCount(0);
    }
    await page.locator('.side-nav a[href="/recommendations"]').click();
    await expect(heading).toBeVisible();
    if (scenario === 'student') await expect(page.getByRole('button',{name:'React intern',exact:true})).toBeVisible();
    expect(reads).toBe(1);
    for (const width of [1440,768,390,320]) {
      await page.setViewportSize({width,height:900});
      await expect(heading).toBeVisible();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
    }
    await page.getByRole('button',{name:'Open navigation',exact:true}).click();
    await expect(analyzerLink).toBeVisible();
    await analyzerLink.click();
    await expect(page).toHaveURL(`${base}/resume`);
    await expect(page.locator('.sidebar')).not.toHaveClass(/sidebar--open/);
    await expect(heading).toBeVisible();
    await expect(input).toBeEnabled();
    expect(reads).toBe(1);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(321);
    await page.emulateMedia({reducedMotion:'reduce'});
    expect(await page.locator('.resume-upload-button').evaluate(el=>getComputedStyle(el).transitionDuration)).toMatch(/0s|0.01ms|1e-05s/);
    failUpload=true;
    await input.setInputFiles({name:'scanned.pdf',mimeType:'application/pdf',buffer:Buffer.from('scan')});
    await expect(page.getByRole('alert')).toContainText('No usable text');
    await expect(page.getByRole('button',{name:'Remove resume skill TypeScript',exact:true})).toBeVisible();
    await expect(input).toBeEnabled();
    await page.getByRole('button',{name:'Delete resume-derived data',exact:true}).click();
    await expect(page.getByRole('button',{name:'Save reviewed skills',exact:true})).toHaveCount(0);
    await expect(input).toBeEnabled();
    expect(reads).toBe(1);
    await context.close();
  }
  expect(errors).toEqual([]);
  console.log('PASS: analyzer sidebar immediately after student login, ordering, file-upload icon, active route, back/forward navigation, mobile menu and student-only visibility; existing PDF/DOCX upload, skill review, deletion, Profile persistence and recommendation refresh; API deduplication; validation and server errors; four viewport widths; reduced motion.');
} finally {await browser.close();}
