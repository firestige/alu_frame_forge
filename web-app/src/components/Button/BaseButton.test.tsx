import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import BaseButton from '@/components/Button/BaseButton';

describe('BaseButton', () => {
  describe('渲染', () => {
    it('应该渲染按钮文本', () => {
      render(<BaseButton>点击我</BaseButton>);
      expect(
        screen.getByRole('button', { name: '点击我' })
      ).toBeInTheDocument();
    });

    it('应该应用自定义类名', () => {
      render(<BaseButton className="custom-class">按钮</BaseButton>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });
  });

  describe('交互', () => {
    it('应该响应点击事件', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(<BaseButton onClick={handleClick}>点击</BaseButton>);
      const button = screen.getByRole('button');

      await user.click(button);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('禁用状态时不应响应点击', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(
        <BaseButton onClick={handleClick} disabled>
          禁用按钮
        </BaseButton>
      );
      const button = screen.getByRole('button');

      await user.click(button);

      expect(handleClick).not.toHaveBeenCalled();
      expect(button).toBeDisabled();
    });
  });
});
