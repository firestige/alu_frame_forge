/**
 * Assembly Command Handler
 * 
 * Handles commands related to connector placement and constraint assembly:
 * - command:assembly:enter-constraint-mode - Toggle constraint mode
 * - command:assembly:add-constraint-draft - Create draft constraint from two objects/anchors
 * - command:assembly:set-active-constraint - Set active draft for placement
 * - command:assembly:place-connector-on-active-constraint - Place connector and solve
 */

import { onCommand } from '@/core/services/eventBus';
import type { ObjectManager } from '@/core/object/ObjectManager';
import type { AnchorService } from '@/core/anchor/AnchorService';
import type { ConstraintService } from '@/core/constraint/ConstraintService';
import type { AssetService } from '@/core/asset/AssetService';
import { useConstraintDraftStore } from '../stores/constraintDraftStore';

interface EnterConstraintModeCommand {
  enabled: boolean;
}

interface AddConstraintDraftCommand {
  objectAId: string;
  objectBId: string;
  anchorAId?: string;
  anchorBId?: string;
  constraintType?: 'point-to-point' | 'axis-align' | 'distance';
}

interface SetActiveConstraintCommand {
  constraintDraftId: string | null;
}

interface PlaceConnectorCommand {
  connectorAssetId?: string;
}

export class AssemblyCommandHandler {
  private objectManager: ObjectManager;
  private anchorService: AnchorService;
  private constraintService: ConstraintService;
  private assetService: AssetService;

  constructor(
    objectManager: ObjectManager,
    anchorService: AnchorService,
    constraintService: ConstraintService,
    assetService: AssetService
  ) {
    this.objectManager = objectManager;
    this.anchorService = anchorService;
    this.constraintService = constraintService;
    this.assetService = assetService;

    this.setupCommandListeners();
  }

  private setupCommandListeners(): void {
    onCommand('command:assembly:enter-constraint-mode', this.handleEnterConstraintMode);
    onCommand('command:assembly:add-constraint-draft', this.handleAddConstraintDraft);
    onCommand('command:assembly:set-active-constraint', this.handleSetActiveConstraint);
    onCommand('command:assembly:place-connector-on-active-constraint', this.handlePlaceConnector);
  }

  private handleEnterConstraintMode = (data: EnterConstraintModeCommand): void => {
    const { setConstraintMode } = useConstraintDraftStore.getState();
    setConstraintMode(data.enabled);
    
    console.log(`[AssemblyCommandHandler] Constraint mode ${data.enabled ? 'enabled' : 'disabled'}`);
  };

  private handleAddConstraintDraft = (data: AddConstraintDraftCommand): void => {
    const { addDraft } = useConstraintDraftStore.getState();
    
    // Resolve anchor IDs if not provided (use first anchor of each object)
    let anchorAId = data.anchorAId;
    let anchorBId = data.anchorBId;
    
    if (!anchorAId) {
      const objectA = this.objectManager.getObject(data.objectAId);
      if (!objectA) {
        console.error(`[AssemblyCommandHandler] Object A not found: ${data.objectAId}`);
        return;
      }
      
      const anchorsA = this.anchorService.getAnchors(objectA);
      if (anchorsA.length === 0) {
        console.error(`[AssemblyCommandHandler] Object A has no anchors: ${data.objectAId}`);
        return;
      }
      anchorAId = anchorsA[0].id;
    }
    
    if (!anchorBId) {
      const objectB = this.objectManager.getObject(data.objectBId);
      if (!objectB) {
        console.error(`[AssemblyCommandHandler] Object B not found: ${data.objectBId}`);
        return;
      }
      
      const anchorsB = this.anchorService.getAnchors(objectB);
      if (anchorsB.length === 0) {
        console.error(`[AssemblyCommandHandler] Object B has no anchors: ${data.objectBId}`);
        return;
      }
      anchorBId = anchorsB[0].id;
    }
    
    // Create draft constraint
    addDraft({
      objectAId: data.objectAId,
      objectBId: data.objectBId,
      anchorAId,
      anchorBId,
      constraintType: data.constraintType || 'point-to-point',
    });
    
    console.log(`[AssemblyCommandHandler] Draft constraint added: ${data.objectAId} <-> ${data.objectBId}`);
  };

  private handleSetActiveConstraint = (data: SetActiveConstraintCommand): void => {
    const { setActiveDraft } = useConstraintDraftStore.getState();
    setActiveDraft(data.constraintDraftId);
    
    console.log(`[AssemblyCommandHandler] Active constraint set: ${data.constraintDraftId}`);
  };

  private handlePlaceConnector = async (data: PlaceConnectorCommand): Promise<void> => {
    const { activeDraftId, drafts, selectedConnectorAssetId } = useConstraintDraftStore.getState();
    
    // Validation: Must have active draft
    if (!activeDraftId) {
      console.error('[AssemblyCommandHandler] No active draft constraint selected');
      return;
    }
    
    const draft = drafts.find((d) => d.id === activeDraftId);
    if (!draft) {
      console.error('[AssemblyCommandHandler] Active draft not found');
      return;
    }
    
    // Validation: Must have connector asset selected
    const connectorAssetId = data.connectorAssetId || selectedConnectorAssetId;
    if (!connectorAssetId) {
      console.error('[AssemblyCommandHandler] No connector asset selected');
      return;
    }
    
    try {
      // 1. Load connector asset
      const connectorAsset = this.assetService.getAssetById(connectorAssetId);
      if (!connectorAsset) {
        console.error('[AssemblyCommandHandler] Failed to load connector asset');
        return;
      }
      
      // 2. Create connector object at origin (will be positioned by constraint solver)
      // Note: ObjectManager doesn't have createObject method, use createObjectFromAsset instead
      const connectorObject = this.objectManager.createObjectFromAsset(connectorAssetId, {
        name: `Connector-${Date.now()}`,
        transform: {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0, order: 'XYZ' },
          scale: { x: 1, y: 1, z: 1 },
        },
        userParams: {},
      });
      
      console.log(`[AssemblyCommandHandler] Connector object created: ${connectorObject.id}`);
      
      // 3. Create constraint between draft anchors
      const constraint = this.constraintService.createConstraint({
        id: `constraint-${Date.now()}`,
        type: draft.constraintType,
        objectAId: draft.objectAId,
        objectBId: connectorObject.id,
        anchorAId: draft.anchorAId!,
        anchorBId: draft.anchorBId!, // Use second anchor from draft, but apply to connector
        enabled: true,
      });
      
      console.log(`[AssemblyCommandHandler] Constraint created: ${constraint.id}`);
      
      // 4. Solve constraints to position connector
      const solveResult = this.constraintService.solveConstraints([constraint]);
      
      if (solveResult.success) {
        console.log('[AssemblyCommandHandler] ✅ Connector placed successfully');
        console.log(`  Iterations: ${solveResult.iterations}`);
        console.log(`  Max error: ${solveResult.maxError}mm`);
        
        // Apply solved position to connector
        if (solveResult.solutions.length > 0) {
          const solution = solveResult.solutions[0];
          connectorObject.position = solution.position;
          connectorObject.rotation = solution.rotation;
          
          console.log(`  Position: (${solution.position.x.toFixed(3)}, ${solution.position.y.toFixed(3)}, ${solution.position.z.toFixed(3)})`);
          console.log(`  Rotation: (${solution.rotation.x.toFixed(3)}, ${solution.rotation.y.toFixed(3)}, ${solution.rotation.z.toFixed(3)})`);
        }
      } else {
        console.error('[AssemblyCommandHandler] ❌ Constraint solving failed');
        console.log(`  Conflicts: ${solveResult.conflicts.length}`);
        if (solveResult.conflicts.length > 0) {
          solveResult.conflicts.forEach((conflict, i) => {
            console.log(`  Conflict ${i + 1}: ${conflict.constraintId} - ${conflict.reason}`);
          });
        }
      }
      
    } catch (error) {
      console.error('[AssemblyCommandHandler] Error placing connector:', error);
    }
  };
}
