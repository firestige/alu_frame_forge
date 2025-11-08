// 目标：管理一次放置会话的生命周期（开始、预览更新、确认放置、取消）。
// 职责：接收 Toolbar 请求；注册/注销指针监听；协调 Raycaster、Preview、Snapping、ObjectManager；最终在确认时调用 ObjectManager.createModelFromAsset。
// 关键方法：start(assetId, options), updatePointer(ndc), confirmPlacement(), cancel().
// 接口/事件：向 PreviewService 传入 HitResult；向 SnappingService 请求 SnapResult；向 ObjectManager 发出 create/add。
// 返回值：会话状态（active/idle）、可能的 promise（例如等待放置完成）。
export class PlacementController {}
