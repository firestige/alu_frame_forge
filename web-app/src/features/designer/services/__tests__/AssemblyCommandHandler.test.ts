/**
 * Assembly Command Handler Integration Tests
 * 
 * Tests the end-to-end flow of constraint draft creation and connector placement:
 * - Draft constraint creation from two objects
 * - Connector placement with constraint solving
 * - State management (constraint mode, active draft, selected connector)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ObjectManager } from '@/core/object/ObjectManager';
import { AnchorService } from '@/core/anchor/AnchorService';
import { ConstraintService } from '@/core/constraint/ConstraintService';
import { AssetService } from '@/core/asset/AssetService';
import { AssemblyCommandHandler } from '../AssemblyCommandHandler';
import { useConstraintDraftStore } from '../../stores/constraintDraftStore';
import type { ConnectorAssetV2 } from '@/core/asset/types/connector-v2';

describe('AssemblyCommandHandler', () => {
  let objectManager: ObjectManager;
  let anchorService: AnchorService;
  let constraintService: ConstraintService;
  let assetService: AssetService;
  let assemblyHandler: AssemblyCommandHandler;

  beforeEach(() => {
    // Initialize services
    assetService = new AssetService();
    anchorService = new AnchorService();
    constraintService = new ConstraintService(anchorService);
    
    // ObjectManager requires assetService in constructor
    objectManager = new ObjectManager(undefined, assetService);

    // Register L-Bracket 2020 STUB asset for testing
    const lBracketAsset: ConnectorAssetV2 = {
      id: 'connector:l-bracket:2020-stub',
      type: 'connector',
      name: 'L-Bracket 2020 STUB',
      category: 'L-Bracket',
      visual: {
        primitives: [], // Empty for testing
      },
      functional: {
        holes: [],
        contactFaces: [],
        slides: [],
      },
      anchorTemplate: {
        strategy: 'connector-v2',
        anchorPoints: [
          {
            id: 'a1',
            position: { x: 0, y: 0, z: 0 },
            direction: { x: 1, y: 0, z: 0 },
            threadSpec: { standard: 'M5', length: 16 },
            holeDiameter: 5.5,
            holeDepth: 20,
          },
          {
            id: 'a2',
            position: { x: 0, y: 0, z: 40 },
            direction: { x: 0, y: 0, z: 1 },
            threadSpec: { standard: 'M5', length: 16 },
            holeDiameter: 5.5,
            holeDepth: 20,
          },
        ],
      },
      metadata: {
        tags: ['fastener', 'connector', 'stub'],
      },
    };
    assetService.registerAsset(lBracketAsset);

    // Set anchor service to object manager (anchorService is separate, not passed to constructor)
    // Note: ObjectManager will use its internal anchorService reference

    // Initialize assembly command handler
    assemblyHandler = new AssemblyCommandHandler(
      objectManager,
      anchorService,
      constraintService,
      assetService
    );

    // Reset constraint draft store
    const store = useConstraintDraftStore.getState();
    store.clearDrafts();
    store.setConstraintMode(false);
    store.setSelectedConnector(null);
  });

  describe('Constraint Mode', () => {
    it('should enable constraint mode', () => {
      const store = useConstraintDraftStore.getState();

      // Initially disabled
      expect(store.constraintModeEnabled).toBe(false);

      // Send command to enable
      assemblyHandler['handleEnterConstraintMode']({ enabled: true });

      // Verify enabled
      expect(useConstraintDraftStore.getState().constraintModeEnabled).toBe(true);
    });

    it('should clear drafts when disabling constraint mode', () => {
      const store = useConstraintDraftStore.getState();

      // Enable mode and add draft
      store.setConstraintMode(true);
      store.addDraft({
        objectAId: 'obj-a',
        objectBId: 'obj-b',
        constraintType: 'point-to-point',
      });

      expect(useConstraintDraftStore.getState().drafts.length).toBe(1);

      // Disable mode
      assemblyHandler['handleEnterConstraintMode']({ enabled: false });

      // Verify drafts cleared
      const finalState = useConstraintDraftStore.getState();
      expect(finalState.constraintModeEnabled).toBe(false);
      expect(finalState.drafts.length).toBe(0);
      expect(finalState.activeDraftId).toBe(null);
    });
  });

  describe('Draft Constraint Creation', () => {
    it('should create draft constraint from two objects', async () => {
      // Create two connector objects
      const connectorAsset = assetService.getAssetById('connector:l-bracket:2020-stub')!;
      
      const connectorA = objectManager['modelFactory'].createFromAsset(connectorAsset.id, {
        name: 'Connector A',
        transform: {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0, order: 'XYZ' },
          scale: { x: 1, y: 1, z: 1 },
        },
        userParams: {},
      });
      objectManager.addObject(connectorA);

      const connectorB = objectManager['modelFactory'].createFromAsset(connectorAsset.id, {
        name: 'Connector B',
        transform: {
          position: { x: 100, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0, order: 'XYZ' },
          scale: { x: 1, y: 1, z: 1 },
        },
        userParams: {},
      });
      objectManager.addObject(connectorB);

      // Add draft constraint
      assemblyHandler['handleAddConstraintDraft']({
        objectAId: connectorA.id,
        objectBId: connectorB.id,
        constraintType: 'point-to-point',
      });

      // Verify draft created
      const store = useConstraintDraftStore.getState();
      expect(store.drafts.length).toBe(1);
      expect(store.drafts[0].objectAId).toBe(connectorA.id);
      expect(store.drafts[0].objectBId).toBe(connectorB.id);
      expect(store.drafts[0].constraintType).toBe('point-to-point');
      expect(store.drafts[0].anchorAId).toBeDefined(); // Auto-resolved to first anchor
      expect(store.drafts[0].anchorBId).toBeDefined();

      // Verify auto-selected as active
      expect(store.activeDraftId).toBe(store.drafts[0].id);
    });

    it('should use specified anchor IDs when provided', async () => {
      const connectorAsset = assetService.getAssetById('connector:l-bracket:2020-stub')!;
      
      const connectorA = objectManager['modelFactory'].createFromAsset(connectorAsset.id, {
        name: 'Connector A',
        transform: {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0, order: 'XYZ' },
          scale: { x: 1, y: 1, z: 1 },
        },
        userParams: {},
      });
      objectManager.addObject(connectorA);

      const connectorB = objectManager['modelFactory'].createFromAsset(connectorAsset.id, {
        name: 'Connector B',
        transform: {
          position: { x: 100, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0, order: 'XYZ' },
          scale: { x: 1, y: 1, z: 1 },
        },
        userParams: {},
      });
      objectManager.addObject(connectorB);

      const anchorsA = anchorService.getAnchors(connectorA);
      const anchorsB = anchorService.getAnchors(connectorB);

      // Add draft with specific anchors (use second anchor of each)
      assemblyHandler['handleAddConstraintDraft']({
        objectAId: connectorA.id,
        objectBId: connectorB.id,
        anchorAId: anchorsA[1].id,
        anchorBId: anchorsB[1].id,
        constraintType: 'point-to-point',
      });

      const store = useConstraintDraftStore.getState();
      expect(store.drafts[0].anchorAId).toBe(anchorsA[1].id);
      expect(store.drafts[0].anchorBId).toBe(anchorsB[1].id);
    });
  });

  describe('Connector Placement with Constraint Solving', () => {
    it('should place connector and solve constraints', async () => {
      // Create anchor object
      const connectorAsset = assetService.getAssetById('connector:l-bracket:2020-stub')!;
      
      const anchorObject = objectManager['modelFactory'].createFromAsset(connectorAsset.id, {
        name: 'Anchor Object',
        transform: {
          position: { x: 100, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0, order: 'XYZ' },
          scale: { x: 1, y: 1, z: 1 },
        },
        userParams: {},
      });
      objectManager.addObject(anchorObject);

      const anchors = anchorService.getAnchors(anchorObject);

      // Create a second object to establish the draft
      const objectB = objectManager['modelFactory'].createFromAsset(connectorAsset.id, {
        name: 'Object B',
        transform: {
          position: { x: 200, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0, order: 'XYZ' },
          scale: { x: 1, y: 1, z: 1 },
        },
        userParams: {},
      });
      objectManager.addObject(objectB);

      // Add draft constraint
      assemblyHandler['handleAddConstraintDraft']({
        objectAId: anchorObject.id,
        objectBId: objectB.id,
        anchorAId: anchors[0].id,
        constraintType: 'point-to-point',
      });

      const store = useConstraintDraftStore.getState();
      const draftId = store.drafts[0].id;

      // Set selected connector
      store.setSelectedConnector('connector:l-bracket:2020-stub');

      // Initial object count
      const initialCount = objectManager.getAllObjects().length;

      // Place connector
      await assemblyHandler['handlePlaceConnector']({
        connectorAssetId: 'connector:l-bracket:2020-stub',
      });

      // Verify connector created
      const finalCount = objectManager.getAllObjects().length;
      expect(finalCount).toBe(initialCount + 1);

      // Verify constraint created
      const constraints = constraintService.getAllConstraints();
      expect(constraints.length).toBe(1);
      expect(constraints[0].type).toBe('point-to-point');
    });

    it('should not place connector without active draft', async () => {
      const store = useConstraintDraftStore.getState();
      store.setSelectedConnector('connector:l-bracket:2020-stub');

      const initialCount = objectManager.getAllObjects().length;

      // Try to place without active draft
      await assemblyHandler['handlePlaceConnector']({});

      // Verify no connector created
      expect(objectManager.getAllObjects().length).toBe(initialCount);
    });

    it('should not place connector without selected asset', async () => {
      // Create draft
      const connectorAsset = assetService.getAssetById('connector:l-bracket:2020-stub')!;
      
      const objA = objectManager['modelFactory'].createFromAsset(connectorAsset.id, {
        name: 'Object A',
        transform: {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0, order: 'XYZ' },
          scale: { x: 1, y: 1, z: 1 },
        },
        userParams: {},
      });
      objectManager.addObject(objA);

      const objB = objectManager['modelFactory'].createFromAsset(connectorAsset.id, {
        name: 'Object B',
        transform: {
          position: { x: 100, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0, order: 'XYZ' },
          scale: { x: 1, y: 1, z: 1 },
        },
        userParams: {},
      });
      objectManager.addObject(objB);

      assemblyHandler['handleAddConstraintDraft']({
        objectAId: objA.id,
        objectBId: objB.id,
        constraintType: 'point-to-point',
      });

      const initialCount = objectManager.getAllObjects().length;

      // Try to place without selected connector
      await assemblyHandler['handlePlaceConnector']({});

      // Verify no connector created
      expect(objectManager.getAllObjects().length).toBe(initialCount);
    });
  });
});
