import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';

const fresh = async (page: Page, lang = 'en') => {
  await page.goto(`/?lang=${lang}#/home`);
  await page.evaluate(() => localStorage.clear());
  await page.goto(`/?lang=${lang}#/home`);
};

const next = (page: Page) => page.getByTestId('wizard-next').click();

test('full wizard: 3 × 320 m² medium turnkey with 8% / 7% / 5,000 on base → 170,600 KWD', async ({ page }) => {
  await fresh(page);
  await page.getByTestId('start-estimate').click();
  await page.getByTestId('project-name').fill('E2E villa');
  await page.getByRole('radio', { name: '400' }).click();
  await page.getByTestId('location').fill('Hawalli — حولي');
  await next(page);

  // floors: use the experimental suggestion, then enable second floor and override manually
  await page.getByTestId('floor-second-toggle').check();
  await page.getByTestId('apply-suggestion').click();
  await expect(page.getByTestId('total-above')).toContainText('960');
  await page.getByTestId('floor-first-area').fill('320');
  await next(page);

  await next(page); // no basement
  await page.getByTestId('grade-medium').click();
  await expect(page.getByTestId('rate-card')).toContainText('150');
  await expect(page.getByTestId('approval-badge').first()).toContainText('Published competitor benchmark');
  await next(page);

  await page.getByTestId('design-pct').fill('8');
  await page.getByTestId('contingency-pct').fill('7');
  await page.getByTestId('fixed-fees').fill('5000');
  await page.getByLabel('Percentages are applied to').selectOption('above_ground_base');
  await next(page);

  await expect(page.getByTestId('est-mid')).toContainText('144,000');
  await expect(page.getByTestId('owner-total-mid')).toContainText('170,600');
  await expect(page.getByTestId('rate-used')).toContainText('Published competitor benchmark');
  await expect(page.getByTestId('rate-used')).not.toContainText('Urban-approved rate');

  await page.getByTestId('view-breakdown').click();
  await expect(page.getByTestId('line-design')).toContainText('11,520');
  await expect(page.getByTestId('line-contingency')).toContainText('10,080');
  await expect(page.getByTestId('breakdown-total')).toContainText('170,600');
});

test('wizard blocks Next on negative / invalid areas', async ({ page }) => {
  await fresh(page);
  await page.getByTestId('start-estimate').click();
  await next(page);
  await page.getByTestId('floor-ground-area').fill('-50');
  await expect(page.getByText('Negative values are not allowed')).toBeVisible();
  await page.getByTestId('floor-ground-area').fill('abc');
  await expect(page.getByText('Invalid number')).toBeVisible();
  await next(page);
  await expect(page.getByTestId('step-errors')).toBeVisible();
  await expect(page).toHaveURL(/wizard\/1/);
});

test('basement without a rate → partial estimate, never priced at the above-ground rate', async ({ page }) => {
  await fresh(page);
  await page.getByTestId('example-varnda').click();
  await page.goto('/#/wizard/2');
  await page.getByTestId('choice-yes').click();
  await page.getByTestId('basement-area').fill('300');
  await expect(page.getByTestId('basement-unpriced')).toBeVisible();
  await page.goto('/#/results');
  await expect(page.getByTestId('partial-banner')).toBeVisible();
  await expect(page.getByTestId('unpriced-panel')).toContainText('Basement (300 m²)');
  await expect(page.getByTestId('est-mid')).toContainText('144,000');
  await expect(page.getByTestId('owner-total')).toContainText('partial');
});

test('structure-only scope has no rate → blocked, manual rate unblocks', async ({ page }) => {
  await fresh(page);
  await page.getByTestId('example-varnda').click();
  await page.goto('/#/wizard/3');
  await page.getByTestId('choice-structure').click();
  await expect(page.getByTestId('no-rate')).toBeVisible();
  await page.goto('/#/results');
  await expect(page.getByTestId('result-blocked')).toContainText('No rate is available');
  await page.goto('/#/wizard/3');
  await page.getByTestId('choice-manual').click();
  await page.getByTestId('manual-mid').fill('70');
  await page.goto('/#/results');
  await expect(page.getByTestId('est-mid')).toContainText('67,200');
  await expect(page.getByTestId('rate-used')).toContainText('User-entered provisional rate');
});

test('upgrade nets the included allowance', async ({ page }) => {
  await fresh(page);
  await page.getByTestId('example-mfatah').click();
  await page.goto('/#/wizard/4');
  await page.getByTestId('add-kitchen').click();
  await page.getByTestId('rate-kitchen').fill('15000');
  await page.getByLabel('Standard allowance already included (KWD)').fill('6000');
  await expect(page.getByTestId('addition-kitchen')).toContainText('9,000');
  await next(page);
  await expect(page.getByTestId('est-mid')).toContainText('153,000');
});

test('Arabic RTL layout and translations', async ({ page }) => {
  await fresh(page, 'ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('حاسبة تكلفة بناء القسيمة');
  await page.getByTestId('example-varnda').click();
  await expect(page.getByTestId('owner-total-mid')).toContainText('170,600');
  await expect(page.getByTestId('owner-total')).toContainText('إجمالي ميزانية المالك');
  await page.getByTestId('lang-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.getByTestId('owner-total')).toContainText('Total owner budget');
});

test('no horizontal page scroll on key screens', async ({ page }) => {
  await fresh(page);
  await page.getByTestId('example-varnda').click();
  for (const h of ['#/home', '#/wizard/0', '#/wizard/1', '#/wizard/3', '#/wizard/4', '#/results', '#/breakdown', '#/report', '#/research', '#/admin']) {
    for (const lang of ['en', 'ar']) {
      await page.goto(`/?lang=${lang}${h}`);
      await page.waitForTimeout(100);
      // compare with the visual viewport: on mobile, overflowing content also enlarges innerWidth
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - (window.visualViewport?.width ?? window.innerWidth));
      expect(overflow, `${lang} ${h}`).toBeLessThanOrEqual(1);
    }
  }
});

test('save, reopen, export and re-import an estimate', async ({ page }) => {
  await fresh(page);
  await page.getByTestId('example-varnda').click();
  await page.getByTestId('save-estimate').click();
  const download = page.waitForEvent('download');
  await page.getByTestId('export-json').click();
  const file = await (await download).path();
  const json = JSON.parse(fs.readFileSync(file!, 'utf8'));
  expect(json.kind).toBe('urban-villa-estimate');
  expect(json.result.ownerTotal.mid).toBe(170600);
  expect(json.ratebookVersion).toBe(1);
  expect(json.ratesUsed[0].rate_id).toBe('VR-02');
  expect(json.input.fees.designPct).toBe('8');

  // change inputs, then reopen the saved one
  await page.goto('/#/wizard/4');
  await page.getByTestId('design-pct').fill('0');
  await page.goto('/#/saved');
  await expect(page.getByTestId('saved-item')).toHaveCount(1);
  await page.getByTestId('reopen').click();
  await expect(page.getByTestId('owner-total-mid')).toContainText('170,600');

  // import the exported file into a clean browser
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.goto('/#/saved');
  await page.getByTestId('import-estimate').setInputFiles(file!);
  await expect(page.getByTestId('saved-item')).toHaveCount(1);
  await page.getByTestId('reopen').click();
  await expect(page.getByTestId('owner-total-mid')).toContainText('170,600');
});

test('admin: new Urban-approved rate is used automatically and shown as approved', async ({ page }) => {
  await fresh(page);
  await page.goto('/#/admin');
  await page.getByTestId('add-rate').click();
  await page.getByTestId('rate-id').fill('URB-TK-MED-2026');
  await page.getByTestId('rate-label').fill('Urban turnkey Medium 2026');
  await page.getByTestId('rate-mid').fill('158');
  await page.getByTestId('rate-source').fill('Urban QS approval 2026-10');
  await page.getByTestId('rate-approval').selectOption('urban_approved');
  await page.getByTestId('save-rate').click();
  await expect(page.getByTestId('rb-version')).toContainText('v2');
  await page.goto('/#/home');
  await page.getByTestId('start-estimate').click();
  await page.goto('/#/wizard/1');
  await page.getByTestId('floor-ground-area').fill('300');
  await page.getByTestId('floor-first-area').fill('300');
  await page.goto('/#/results');
  await expect(page.getByTestId('rate-used')).toContainText('Urban-approved rate');
  await expect(page.getByTestId('est-mid')).toContainText('94,800');

  // editing the approved price downgrades it to provisional
  await page.goto('/#/admin');
  await page.getByTestId('edit-URB-TK-MED-2026').click();
  await page.getByTestId('rate-mid').fill('160');
  await page.getByTestId('save-rate').click();
  await expect(page.getByTestId('rates-table')).toContainText('User-entered provisional rate');
});

test('research screen keeps observations separate and labelled', async ({ page }) => {
  await fresh(page);
  await page.goto('/#/research');
  await expect(page.getByTestId('alhisba-runs')).toContainText('190.625');
  await expect(page.getByTestId('alhisba-runs')).toContainText('3,000');
  await expect(page.getByTestId('coverage-result')).toContainText('640');
  await page.getByTestId('rtab-examples').click();
  await expect(page.getByTestId('ex-varnda')).toContainText('170,600');
  await expect(page.getByTestId('ex-mfatah')).toContainText('144,000');
  await expect(page.getByTestId('ex-alhisba')).toContainText('122,000');
  await expect(page.getByTestId('ex-alhisba')).toContainText('not a reproduced formula');
  await page.getByTestId('rtab-taqeem').click();
  await expect(page.getByTestId('taqeem-table')).toContainText('109,000');
});

for (const lang of ['en', 'ar'] as const) {
  test(`PDF report renders (${lang})`, async ({ page, browserName }, info) => {
    test.skip(info.project.name !== 'desktop' || browserName !== 'chromium', 'PDF generation runs once on desktop Chromium');
    await fresh(page, lang);
    await page.getByTestId('example-varnda').click();
    await page.getByTestId('open-report').click();
    await expect(page.getByTestId('report')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await page.emulateMedia({ media: 'print' });
    fs.mkdirSync('docs/sample-reports', { recursive: true });
    const pdf = await page.pdf({ path: `docs/sample-reports/urban-estimate-${lang}.pdf`, format: 'A4', printBackground: true, preferCSSPageSize: true });
    expect(pdf.byteLength).toBeGreaterThan(20_000);
  });
}
