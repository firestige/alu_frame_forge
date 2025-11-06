// 目标：把屏幕指针坐标转换为三维交点（优先返回场景物体的交点，否则返回与地面/放置平面的交点）。
// 职责：封装 THREE.Raycaster、NDC 转换、可配置忽略层/对象过滤。支持节流/频率限制。
// 方法：getHit(ndc: Vector2): HitResult | null。
export class RaycasterService {}