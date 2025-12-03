import { test, expect } from '@playwright/test';

test.describe('相机控制功能', () => {
  test.beforeEach(async ({ page }) => {
    // 导航到设计器页面
    await page.goto('/designer');

    // 等待 3D 场景加载完成
    await page.waitForSelector('canvas', { timeout: 10000 });
  });

  test('应该显示相机控制面板', async ({ page }) => {
    // 检查控制面板是否存在
    const controlPanel = page.locator('text=视图控制');
    await expect(controlPanel).toBeVisible();

    // 检查视角按钮
    await expect(page.locator('button:has-text("前")')).toBeVisible();
    await expect(page.locator('button:has-text("上")')).toBeVisible();
    await expect(page.locator('button:has-text("右")')).toBeVisible();
    await expect(page.locator('button:has-text("后")')).toBeVisible();
    await expect(page.locator('button:has-text("下")')).toBeVisible();
    await expect(page.locator('button:has-text("左")')).toBeVisible();
    await expect(page.locator('button:has-text("等轴测")')).toBeVisible();
  });

  test('应该能通过点击切换视角', async ({ page }) => {
    // 点击"前"按钮
    await page.click('button:has-text("前")');

    // 等待动画完成
    await page.waitForTimeout(700);

    // 验证按钮激活状态（通过 CSS 类）
    const frontButton = page.locator('button:has-text("前")');
    await expect(frontButton).toHaveClass(/bg-blue-600/);
  });

  test('应该能通过键盘快捷键切换视角', async ({ page }) => {
    // 按数字键 1（正视图）
    await page.keyboard.press('1');
    await page.waitForTimeout(700);

    // 按数字键 2（俯视图）
    await page.keyboard.press('2');
    await page.waitForTimeout(700);

    // 按数字键 7（等轴测）
    await page.keyboard.press('7');
    await page.waitForTimeout(700);

    // 验证等轴测按钮激活
    const isoButton = page.locator('button:has-text("等轴测")');
    await expect(isoButton).toHaveClass(/bg-blue-600/);
  });

  test('应该能通过 H 键重置到等轴测视角', async ({ page }) => {
    // 先切换到其他视角
    await page.click('button:has-text("前")');
    await page.waitForTimeout(700);

    // 按 H 键重置
    await page.keyboard.press('h');
    await page.waitForTimeout(700);

    // 验证等轴测按钮激活
    const isoButton = page.locator('button:has-text("等轴测")');
    await expect(isoButton).toHaveClass(/bg-blue-600/);
  });
});

test.describe('对象选择与变换功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/designer');
    await page.waitForSelector('canvas', { timeout: 10000 });
  });

  test('应该能创建立方体', async ({ page }) => {
    // 点击创建立方体按钮
    await page.click('button:has-text("立方体")');

    // 等待对象创建
    await page.waitForTimeout(500);

    // 验证对象管理器中出现新对象
    const objectTree = page.locator('.object-tree, [class*="ObjectTree"]');
    await expect(objectTree).toBeVisible({ timeout: 5000 });
  });

  test('应该能通过侧边栏选中对象', async ({ page }) => {
    // 创建立方体
    await page.click('button:has-text("立方体")');
    await page.waitForTimeout(500);

    // 在对象管理器中点击对象
    const firstObject = page.locator('[class*="ObjectTree"] button').first();
    await firstObject.click();

    // 验证变换工具栏出现
    await expect(page.locator('text=移动')).toBeVisible({ timeout: 2000 });
    await expect(page.locator('text=旋转')).toBeVisible();
    await expect(page.locator('text=缩放')).toBeVisible();
  });

  test('应该能通过快捷键切换变换模式', async ({ page }) => {
    // 创建并选中对象
    await page.click('button:has-text("立方体")');
    await page.waitForTimeout(500);

    const firstObject = page.locator('[class*="ObjectTree"] button').first();
    await firstObject.click();
    await page.waitForTimeout(300);

    // 按 W 键切换到移动模式
    await page.keyboard.press('w');
    await page.waitForTimeout(200);

    // 验证移动按钮激活
    const moveButton = page.locator('button:has-text("移动")');
    await expect(moveButton).toHaveClass(/bg-blue-600/);

    // 按 E 键切换到旋转模式
    await page.keyboard.press('e');
    await page.waitForTimeout(200);

    const rotateButton = page.locator('button:has-text("旋转")');
    await expect(rotateButton).toHaveClass(/bg-blue-600/);

    // 按 R 键切换到缩放模式
    await page.keyboard.press('r');
    await page.waitForTimeout(200);

    const scaleButton = page.locator('button:has-text("缩放")');
    await expect(scaleButton).toHaveClass(/bg-blue-600/);
  });

  test('应该能通过 Q 键取消选择', async ({ page }) => {
    // 创建并选中对象
    await page.click('button:has-text("立方体")');
    await page.waitForTimeout(500);

    const firstObject = page.locator('[class*="ObjectTree"] button').first();
    await firstObject.click();
    await page.waitForTimeout(300);

    // 验证变换工具栏可见
    await expect(page.locator('text=移动')).toBeVisible();

    // 按 Q 键取消选择
    await page.keyboard.press('q');
    await page.waitForTimeout(300);

    // 验证变换工具栏消失
    await expect(page.locator('text=移动')).not.toBeVisible();
  });
});

test.describe('快捷键提示', () => {
  test('应该显示相机快捷键提示', async ({ page }) => {
    await page.goto('/designer');
    await page.waitForSelector('canvas');

    // 检查快捷键提示文本
    await expect(page.locator('text=/快捷键.*1-7.*H/')).toBeVisible();
  });

  test('应该在选中对象时显示变换快捷键提示', async ({ page }) => {
    await page.goto('/designer');
    await page.waitForSelector('canvas');

    // 创建并选中对象
    await page.click('button:has-text("立方体")');
    await page.waitForTimeout(500);

    const firstObject = page.locator('[class*="ObjectTree"] button').first();
    await firstObject.click();
    await page.waitForTimeout(300);

    // 检查变换快捷键提示
    await expect(page.locator('text=/快捷键.*W.*E.*R.*Q/')).toBeVisible();
  });
});
