// 目标：在指针附近找到合适的吸附点并返回对齐位置与朝向。
// 职责：给定候选放置点与待放置模型的几何/吸附点集合，扫描邻近模型（用 ObjectManager 提供的空间索引或简单范围查询），计算最近吸附点/法线，按优先级（attachment points > face snap > edge/vertex > grid）返回 SnapResult。
// 参数/策略：吸附阈值（pixel/world）、优先级列表、是否自动对齐法线、偏移（gap）。
// 方法：findSnap(candidatePoint, candidateBBox, nearbyModels): SnapResult | null。
export class SnappingSerice {}
