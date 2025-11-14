import { test, expect } from '@playwright/test';

test.describe('基础导航', () => {
  test('应该能访问设计器页面', async ({ page }) => {
    await page.goto('/');

    // 验证页面标题
    await expect(page).toHaveTitle(/铝型材框架设计器/);

    // 验证页面加载
    await expect(page.locator('text=设计器')).toBeVisible();
  });

  test('应该能在页面间切换', async ({ page }) => {
    await page.goto('/');

    // 点击库页面链接
    await page.click('text=资产库');

    // 验证 URL 变化
    await expect(page).toHaveURL(/\/library/);

    // 返回设计器
    await page.click('text=设计器');
    await expect(page).toHaveURL(/\//);
  });
});

test.describe('3D 场景加载', () => {
  test('应该加载 3D 渲染画布', async ({ page }) => {
    await page.goto('/');

    // 等待 canvas 元素出现
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // 验证 canvas 有合理的尺寸
    const box = await canvas.boundingBox();
    expect(box?.width).toBeGreaterThan(0);
    expect(box?.height).toBeGreaterThan(0);
  });
});
