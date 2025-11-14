import { describe, it, expect, beforeEach, vi } from 'vitest';
import mitt from 'mitt';

describe('eventBus (mitt library)', () => {
  let eventBus: ReturnType<typeof mitt>;

  beforeEach(() => {
    // 为每个测试创建新的事件总线实例
    eventBus = mitt();
  });

  describe('订阅和发布', () => {
    it('应该正确订阅和接收事件', () => {
      const handler = vi.fn();
      eventBus.on('test:event', handler);

      eventBus.emit('test:event', { data: 'test' });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ data: 'test' });
    });

    it('应该支持多个订阅者', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.on('test:event', handler1);
      eventBus.on('test:event', handler2);

      eventBus.emit('test:event', { data: 'test' });

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });
  });

  describe('取消订阅', () => {
    it('应该正确取消订阅', () => {
      const handler = vi.fn();
      eventBus.on('test:event', handler);

      eventBus.off('test:event', handler);
      eventBus.emit('test:event', { data: 'test' });

      expect(handler).not.toHaveBeenCalled();
    });

    it('取消不存在的订阅不应抛出错误', () => {
      const handler = vi.fn();
      expect(() => {
        eventBus.off('non:existent', handler);
      }).not.toThrow();
    });
  });

  describe('通配符订阅', () => {
    it('应该支持 * 订阅所有事件', () => {
      const handler = vi.fn();
      eventBus.on('*', handler);

      eventBus.emit('test:event1', { data: '1' });
      eventBus.emit('test:event2', { data: '2' });

      expect(handler).toHaveBeenCalledTimes(2);
    });
  });
});
