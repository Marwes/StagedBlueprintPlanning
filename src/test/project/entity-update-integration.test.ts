/*
 * Copyright (c) 2022-2023 GlassBricks
 * This file is part of Staged Blueprint Planning.
 *
 * Staged Blueprint Planning is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * Staged Blueprint Planning is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License along with Staged Blueprint Planning. If not, see <https://www.gnu.org/licenses/>.
 */

import { BlueprintEntity, LuaEntity, LuaPlayer, LuaSurface, PlayerIndex, SurfaceCreateEntity } from "factorio:runtime"
import expect from "tstl-expect"
import { oppositedirection } from "util"
import { Prototypes, Settings } from "../../constants"
import {
  circuitConnectionEquals,
  CircuitOrPowerSwitchConnection,
  ProjectCircuitConnection,
} from "../../entity/circuit-connection"
import { emptyBeltControlBehavior, emptyInserterControlBehavior } from "../../entity/empty-control-behavior"
import { UndergroundBeltEntity } from "../../entity/Entity"
import { isPreviewEntity } from "../../entity/entity-prototype-info"
import {
  ProjectEntity,
  RollingStockProjectEntity,
  StageNumber,
  UndergroundBeltProjectEntity,
} from "../../entity/ProjectEntity"
import { checkUndergroundPairFlippable, saveEntity } from "../../entity/save-load"
import { findUndergroundPair } from "../../entity/underground-belt"
import { addPowerSwitchConnections, findPolePowerSwitchNeighbors } from "../../entity/wires"
import { assert, Events } from "../../lib"
import { BBox, Pos } from "../../lib/geometry"
import { runEntireCurrentTask } from "../../lib/task"
import { updateAllHighlights } from "../../project/entity-highlights"
import {
  addNewEntity,
  deleteEntityOrCreateSettingsRemnant,
  forceDeleteEntity,
  moveAllPropsDown,
  movePropDown,
  resetAllProps,
  resetProp,
  StageMoveResult,
  tryApplyUpgradeTarget,
  tryReviveSettingsRemnant,
  tryRotateEntityToMatchWorld,
  trySetFirstStage,
  trySetLastStage,
  tryUpdateEntityFromWorld,
  updateWiresFromWorld,
} from "../../project/project-updates"
import { UserProject } from "../../project/ProjectDef"
import { _simulateUndo } from "../../project/undo"
import { onWiresPossiblyUpdated, userSetLastStageWithUndo } from "../../project/user-actions"
import { _deleteAllProjects, createUserProject } from "../../project/UserProject"
import {
  clearWorldEntityAtStage,
  rebuildAllStages,
  rebuildStage,
  rebuildWorldEntityAtStage,
  refreshAllWorldEntities,
  refreshWorldEntityAtStage,
  tryDollyEntities,
  updateWorldEntities,
} from "../../project/world-entity-updates"
import { createRollingStock } from "../entity/createRollingStock"
import {
  assertConfigChangedHighlightsCorrect,
  assertErrorHighlightsCorrect,
  assertLastStageHighlightCorrect,
  assertNoHighlightsAfterLastStage,
} from "./entity-highlight-test-util"
import direction = defines.direction

let project: UserProject
let surfaces: LuaSurface[]
let player: LuaPlayer
before_each(() => {
  project = createUserProject("test", 6)
  surfaces = project.getAllStages().map((stage) => stage.surface)
  player = game.players[1]
})
after_each(() => {
  _deleteAllProjects()
})

const pos = Pos(10.5, 10.5)

function createEntity(stage: StageNumber, args?: Partial<SurfaceCreateEntity>) {
  const params = {
    name: "filter-inserter",
    position: pos,
    force: "player",
    direction: defines.direction.east,
    ...args,
  }
  const entity = surfaces[stage - 1].create_entity(params)
  assert(entity, "created entity")
  const proto = game.entity_prototypes[params.name]
  if (proto.type == "inserter") {
    entity.inserter_stack_size_override = 1
    entity.inserter_filter_mode = "whitelist"
  }
  return entity
}

function assertEntityCorrect(entity: ProjectEntity, expectedHasError: number | false) {
  expect(entity.isSettingsRemnant).to.be.falsy()
  const found = project.content.findCompatibleByProps(entity.firstValue.name, entity.position, entity.direction, 1)
  expect(found).to.be(entity)

  let hasError: number | false = false
  for (const stage of $range(1, project.lastStageFor(entity))) {
    const worldEntity = entity.getWorldOrPreviewEntity(stage)!
    assert(worldEntity, `entity exists at stage ${stage}`)
    const isPreview = isPreviewEntity(worldEntity)
    const value = entity.getValueAtStage(stage)
    if (value == nil) {
      assert(isPreview, `entity must be preview at stage ${stage}`)
    } else if (isPreview) {
      assert(entity.hasErrorAt(stage), `entity must have error at stage ${stage} to be preview`)
      hasError ||= stage
    } else if (entity.hasErrorAt(stage)) {
      assert(
        worldEntity.type == "underground-belt",
        "Only underground belt currently can have error with existing entity",
      )
      assert(entity.isUndergroundBelt())
      hasError ||= stage
      const type = worldEntity.belt_to_ground_type
      const oppositeType = type == "input" ? "output" : "input"
      expect(entity.direction).to.be(oppositedirection(worldEntity.direction))
      expect(entity.firstValue.type).to.be(oppositeType)
    } else {
      const savedValue = saveEntity(worldEntity)
      expect(savedValue).to.equal(value)
      expect(worldEntity.direction).to.be(entity.direction)
    }
    if (isPreview) {
      expect(worldEntity.name).to.be(Prototypes.PreviewEntityPrefix + (value ?? entity.firstValue).name)
    }
    expect(worldEntity.position).to.equal(entity.position)
    if (isPreview) {
      expect(worldEntity.direction).to.equal(entity.getPreviewDirection())
    } else if (entity.isUndergroundBelt() && entity.hasErrorAt(stage)) {
      expect(worldEntity.direction).to.equal(oppositedirection(entity.direction))
    } else {
      expect(worldEntity.direction).to.equal(entity.direction)
    }

    expect(entity.getExtraEntity("settingsRemnantHighlight", stage)).to.be.nil()
  }

  expect(hasError).to.be(expectedHasError)

  // nothing after the last stage
  for (const stage of $range(project.lastStageFor(entity) + 1, project.numStages())) {
    expect(entity.getWorldOrPreviewEntity(stage)).to.be.nil()
  }

  assertErrorHighlightsCorrect(entity, project.lastStageFor(entity))
  assertConfigChangedHighlightsCorrect(entity, project.lastStageFor(entity))
  assertLastStageHighlightCorrect(entity)
  assertNoHighlightsAfterLastStage(entity, project.numStages())

  // cables
  const cableConnections = project.content.getCableConnections(entity)
  const isElectricPole = game.entity_prototypes[entity.firstValue.name].type == "electric-pole"
  if (!cableConnections) {
    if (isElectricPole) {
      for (const stage of $range(entity.firstStage, project.lastStageFor(entity))) {
        const pole = entity.getWorldEntity(stage)
        if (!pole) continue
        const cableNeighbors = (pole.neighbours as Record<"copper", LuaEntity[]>).copper.filter(
          (x) => x.type != "power-switch",
        )
        expect(cableNeighbors).to.equal([])
      }
    }
    // else, ok
  } else {
    expect(isElectricPole).to.be(true)
    const otherNeighbors = Object.keys(cableConnections)
    for (const stage of $range(entity.firstStage, project.lastStageFor(entity))) {
      const expectedNeighbors = otherNeighbors
        .map((o) => o.getWorldEntity(stage))
        .filter((o) => o)
        .map((o) => o?.unit_number)
        .sort()
      const actualNeighbors = (entity.getWorldEntity(stage)?.neighbours as Record<"copper", LuaEntity[]>).copper
        .filter((x) => x.type != "power-switch")
        .map((o) => o.unit_number)
        .sort()
      expect(actualNeighbors).to.equal(expectedNeighbors)
    }
  }

  // circuit wires
  const wireConnections = project.content.getCircuitConnections(entity)
  if (!wireConnections) {
    for (const stage of $range(entity.firstStage, project.lastStageFor(entity))) {
      const worldEntity = entity.getWorldEntity(stage)
      if (!worldEntity) continue
      const wireNeighbors: CircuitOrPowerSwitchConnection[] | nil = worldEntity.circuit_connection_definitions
      if (!wireNeighbors) continue
      addPowerSwitchConnections(worldEntity, wireNeighbors, findPolePowerSwitchNeighbors(worldEntity))
      expect(wireNeighbors).to.equal([])
    }
  } else {
    for (const stage of $range(entity.firstStage, project.lastStageFor(entity))) {
      const thisWorldEntity = entity.getWorldEntity(stage)
      if (!thisWorldEntity) continue
      const expectedNeighbors = Object.entries(wireConnections).flatMap(([entity, connections]) => {
        const otherWorldEntity = entity.getWorldEntity(stage)
        if (!otherWorldEntity) return []
        return Object.keys(connections).map((connection) => ({
          wire: connection.wire,
          entities: newLuaSet(thisWorldEntity.unit_number!, otherWorldEntity.unit_number!),
        }))
      })
      const actualNeighbors: CircuitOrPowerSwitchConnection[] = thisWorldEntity.circuit_connection_definitions ?? []
      addPowerSwitchConnections(thisWorldEntity, actualNeighbors, findPolePowerSwitchNeighbors(thisWorldEntity))

      const actualNeighborsSet = actualNeighbors.map((x) => ({
        wire: x.wire,
        entities: newLuaSet(x.target_entity.unit_number!, thisWorldEntity.unit_number!),
      }))
      expect(actualNeighborsSet).to.equal(expectedNeighbors)
    }
  }
}

function assertEntityNotPresent(entity: ProjectEntity) {
  const found = project.content.findCompatibleByProps(entity.firstValue.name, entity.position, entity.direction, 1)
  expect(found).to.be.nil()

  for (const stage of $range(1, project.lastStageFor(entity))) {
    expect(entity.getWorldOrPreviewEntity(stage)).to.be.nil()
  }
  expect(entity.hasAnyExtraEntities("errorOutline")).to.be(false)
  expect(entity.hasAnyExtraEntities("errorElsewhereIndicator")).to.be(false)
}

function assertIsSettingsRemnant(entity: ProjectEntity) {
  expect(entity.isSettingsRemnant).to.be(true)
  for (const stage of $range(1, project.lastStageFor(entity))) {
    const preview = entity.getWorldOrPreviewEntity(stage)!
    expect(preview).to.be.any()
    expect(isPreviewEntity(preview)).to.be(true)
    expect(entity.getExtraEntity("settingsRemnantHighlight", stage)).to.be.any()
  }
  expect(entity.hasAnyExtraEntities("errorOutline")).to.be(false)
  expect(entity.hasAnyExtraEntities("errorElsewhereIndicator")).to.be(false)
}

function buildEntity(stage: StageNumber, args?: Partial<SurfaceCreateEntity>): ProjectEntity<BlueprintEntity> {
  const luaEntity = createEntity(stage, args)
  const entity = addNewEntity(project, luaEntity, stage) as ProjectEntity<BlueprintEntity>
  assert(entity)
  expect(entity.firstStage).to.be(stage)
  expect(entity.getWorldEntity(stage)).toEqual(luaEntity)
  return entity
}

test("creating an entity", () => {
  const entity = buildEntity(3)
  assertEntityCorrect(entity, false)
})

test("clear entity at stage", () => {
  const entity = buildEntity(3)
  clearWorldEntityAtStage(project, entity, 4)
  assertEntityCorrect(entity, 4)
})

test("entity can not be placed at stage", () => {
  createEntity(4, { name: "stone-wall" }) // blocker
  const entity = buildEntity(3)
  expect(isPreviewEntity(entity.getWorldOrPreviewEntity(4)!)).to.be(true)
  assertEntityCorrect(entity, 4)
})

test("refresh missing entity", () => {
  const blocker = createEntity(4, { name: "stone-wall" })
  const entity = buildEntity(3)
  clearWorldEntityAtStage(project, entity, 4)
  blocker.destroy()
  refreshWorldEntityAtStage(project, entity, 4)
  assertEntityCorrect(entity, false)
})

test("replacing missing entity matches", () => {
  const entity = buildEntity(3)
  const newEntity = createEntity(4, { name: "inserter", direction: defines.direction.south })
  entity.replaceWorldEntity(4, newEntity)

  refreshWorldEntityAtStage(project, entity, 4)
  assertEntityCorrect(entity, false)
})

test("move via preview replace", () => {
  const entity = buildEntity(3)
  const placedEntity = createEntity(2, { name: "inserter", direction: defines.direction.south })
  entity.replaceWorldEntity(2, placedEntity)
  trySetFirstStage(project, entity, 2)
  expect(entity.firstStage).to.be(2)
  assertEntityCorrect(entity, false)
})

test("disallowing entity deletion", () => {
  const entity = buildEntity(3)
  const worldEntity = entity.getWorldEntity(4)!
  rebuildWorldEntityAtStage(project, entity, 4)
  expect(worldEntity.valid).to.be(false) // replaced
  assertEntityCorrect(entity, false)
})

test("delete entity", () => {
  const entity = buildEntity(3)
  deleteEntityOrCreateSettingsRemnant(project, entity)
  assertEntityNotPresent(entity)
})

test("delete to create settings remnant", () => {
  const entity = buildEntity(3)
  entity._applyDiffAtStage(4, {
    override_stack_size: 2,
  })
  deleteEntityOrCreateSettingsRemnant(project, entity)
  assertIsSettingsRemnant(entity)
})
describe("revive integration test", () => {
  test.each([1, 2, 3, 4, 5, 6])("settings remnant 1->3->5, revive at stage %d", (reviveStage) => {
    const entity = buildEntity(1)
    entity._applyDiffAtStage(3, { override_stack_size: 2 })
    entity._applyDiffAtStage(5, { override_stack_size: 3 })
    deleteEntityOrCreateSettingsRemnant(project, entity)
    assertIsSettingsRemnant(entity)

    assert(tryReviveSettingsRemnant(project, entity, reviveStage))
    expect(entity.isSettingsRemnant).to.be.falsy()
    expect(reviveStage).to.be(entity.firstStage)

    if (reviveStage >= 5) {
      expect(entity.firstValue.override_stack_size).to.be(3)
      expect(entity.hasStageDiff()).to.be(false)
    } else if (reviveStage >= 3) {
      expect(entity.firstValue.override_stack_size).to.be(2)
      expect(entity.getStageDiffs()).to.equal({ 5: { override_stack_size: 3 } })
    } else {
      expect(entity.firstValue.override_stack_size).to.be(1)
      expect(entity.getStageDiffs()).to.equal({ 3: { override_stack_size: 2 }, 5: { override_stack_size: 3 } })
    }

    assertEntityCorrect(entity, false)
  })

  test("settings remnant 2->3, revive at stage 1", () => {
    const entity = buildEntity(2)
    entity._applyDiffAtStage(3, { override_stack_size: 3 })
    deleteEntityOrCreateSettingsRemnant(project, entity)
    assertIsSettingsRemnant(entity)

    tryReviveSettingsRemnant(project, entity, 1)
    expect(entity.isSettingsRemnant).to.be.falsy()
    expect(1).to.be(entity.firstStage)

    expect(entity.firstValue.override_stack_size).to.be(1)
    expect(entity.getStageDiffs()).to.equal({ 3: { override_stack_size: 3 } })

    assertEntityCorrect(entity, false)
  })
})

test("force deleting entity", () => {
  const entity = buildEntity(3)
  entity._applyDiffAtStage(4, {
    override_stack_size: 2,
  })
  forceDeleteEntity(project, entity)
  assertEntityNotPresent(entity)
})

test("updating first value from world", () => {
  const entity = buildEntity(3)
  const worldEntity = entity.getWorldEntity(3)!
  worldEntity.inserter_stack_size_override = 2
  const ret = tryUpdateEntityFromWorld(project, entity, 3)
  expect(ret).to.be("updated")
  expect(entity.firstValue.override_stack_size).to.be(2)
  assertEntityCorrect(entity, false)
})

test("updating higher value from world", () => {
  const entity = buildEntity(3)
  const worldEntity = entity.getWorldEntity(4)!
  worldEntity.inserter_stack_size_override = 2
  const ret = tryUpdateEntityFromWorld(project, entity, 4)
  expect(ret).to.be("updated")
  expect(entity.firstValue.override_stack_size).to.be(1)
  expect(entity.hasStageDiff(4)).to.be(true)
  expect(entity.getStageDiff(4)).to.equal({ override_stack_size: 2 })

  assertEntityCorrect(entity, false)
})

test("rotating first value from world via update", () => {
  const entity = buildEntity(3)
  const worldEntity = entity.getWorldEntity(3)!
  worldEntity.direction = defines.direction.south
  const ret = tryUpdateEntityFromWorld(project, entity, 3)
  expect(ret).to.be("updated")
  expect(entity.direction).to.be(defines.direction.south)
  assertEntityCorrect(entity, false)
})

test("rotating first value from world via rotate", () => {
  const entity = buildEntity(3)
  const worldEntity = entity.getWorldEntity(3)!
  worldEntity.direction = defines.direction.south
  tryRotateEntityToMatchWorld(project, entity, 3)
  expect(entity.direction).to.be(defines.direction.south)
  assertEntityCorrect(entity, false)
})

describe.each([true, false])("underground snapping, with flipped %s", (flipped) => {
  const expectedDirection = !flipped ? defines.direction.east : defines.direction.west
  const westType = !flipped ? "input" : "output"
  const eastType = !flipped ? "output" : "input"
  let westUnderground: ProjectEntity<BlueprintEntity>
  before_each(() => {
    westUnderground = buildEntity(4, {
      name: "underground-belt",
      direction: expectedDirection,
      type: westType,
      position: pos.minus(Pos(1, 0)),
    })
    assertEntityCorrect(westUnderground, false)
  })

  test("placing underground", () => {
    // place underground belt facing west (input), should snap to east output
    const placedUnderground = buildEntity(3, {
      name: "underground-belt",
      direction: defines.direction.west,
      type: "input",
    })
    expect(placedUnderground.direction).to.be(expectedDirection)
    expect(placedUnderground.firstValue.type).to.be(eastType)
    assertEntityCorrect(placedUnderground, false)
    // type defaults to input
    expect(westUnderground.direction).to.be(expectedDirection)
    expect(westUnderground.firstValue.type).to.be(westType)

    expect(westUnderground.getWorldEntity(4)!.neighbours).toEqual(placedUnderground.getWorldEntity(4)!)
  })
  test("pasting underground", () => {
    const stack = player.cursor_stack!
    stack.set_stack("blueprint")
    stack.set_blueprint_entities([
      {
        name: "underground-belt",
        direction: defines.direction.west,
        type: "input",
        entity_number: 1,
        position: Pos(0.5, 0.5),
      },
    ])
    player.teleport(pos, surfaces[3 - 1])

    player.build_from_cursor({ position: pos, alt: true })
    const ghost = surfaces[3 - 1].find_entity("entity-ghost", pos)
    expect(ghost).toBeNil()

    const builtEntity = surfaces[3 - 1].find_entity("underground-belt", pos)!
    expect(builtEntity).to.be.any()
    expect(builtEntity.direction).to.be(expectedDirection)
    expect(builtEntity.belt_to_ground_type).to.be(eastType)

    const entity = project.content.findCompatibleWithLuaEntity(builtEntity, nil, 3) as UndergroundBeltProjectEntity
    expect(entity).to.be.any()
    expect(entity.isUndergroundBelt()).toBe(true)
    expect(entity.direction).to.be(expectedDirection)
    expect(entity.firstValue.type).to.be(eastType)
  })
})

describe("underground belt inconsistencies", () => {
  describe("left, high middle, right", () => {
    let leftUnderground: ProjectEntity<UndergroundBeltEntity>
    let rightUnderground: ProjectEntity<BlueprintEntity>
    let middleUnderground: ProjectEntity<BlueprintEntity>
    before_each(() => {
      leftUnderground = buildEntity(1, {
        name: "underground-belt",
        type: "input",
        direction: defines.direction.east,
        position: pos.add(-1, 0),
      }) as UndergroundBeltProjectEntity
      rightUnderground = buildEntity(1, {
        name: "underground-belt",
        type: "output",
        direction: defines.direction.east,
        position: pos.add(1, 0),
      })
      middleUnderground = buildEntity(2, {
        name: "underground-belt",
        type: "output",
        direction: defines.direction.east,
        position: pos,
      })
      const leftStage1 = leftUnderground.getWorldEntity(1)
      assert(leftStage1)
      expect(leftStage1.neighbours).not.toBeNil().and.toEqual(rightUnderground.getWorldEntity(1))
      expect(leftUnderground.getWorldEntity(2)?.neighbours)
        .not.toBeNil()
        .and.toEqual(middleUnderground.getWorldEntity(2))

      const leftStage2 = leftUnderground.getWorldEntity(2)
      assert(leftStage2)
      const middleStage2 = middleUnderground.getWorldEntity(2)
      assert(middleStage2)

      expect(leftStage2.neighbours).toEqual(middleStage2)
      expect(checkUndergroundPairFlippable(middleStage2)).toMatchTable([middleUnderground, false])

      expect(findUndergroundPair(project.content, leftUnderground, 1)).toBe(rightUnderground)
    })
    test("When flipping an left paired with multiple undergrounds, error is shown in stage where left flip failed", () => {
      // stage 1: < >
      // stage 2: <i>
      // flipping in stage 1 will flip both < and >, but in stage 2 because of "i", it fails to flip
      // error should be shown in 2 for <
      const leftStage1 = leftUnderground.getWorldEntity(1)!
      const rightStage1 = rightUnderground.getWorldEntity(1)!
      const leftStage2 = leftUnderground.getWorldEntity(2)!

      leftStage1.rotate({ by_player: player })

      expect(leftUnderground).toMatchTable({
        firstValue: { type: "output" },
        direction: defines.direction.west,
      })
      expect(rightUnderground).toMatchTable({
        firstValue: { type: "input" },
        direction: defines.direction.west,
      })
      // middle unchanged
      expect(middleUnderground).toMatchTable({
        firstValue: { type: "output" },
        direction: defines.direction.east,
      })

      expect(leftStage1).toMatchTable({
        direction: defines.direction.west,
        belt_to_ground_type: "output",
      })
      expect(rightStage1).toMatchTable({
        direction: defines.direction.west,
        belt_to_ground_type: "input",
      })
      // stage 2 should not have changed
      expect(leftStage2).toMatchTable({
        direction: defines.direction.east,
        belt_to_ground_type: "input",
      })
      expect(leftUnderground.hasErrorAt(2)).toBe(true)

      assertEntityCorrect(leftUnderground, 2)
      assertEntityCorrect(rightUnderground, false)
      assertEntityCorrect(middleUnderground, false)
    })
    test("when flipping middle, middle succeeds, but error is shown in left where the flip failed", () => {
      const middle = middleUnderground.getWorldEntity(2)!
      const leftStage1 = leftUnderground.getWorldEntity(1)!
      const leftStage2 = leftUnderground.getWorldEntity(2)!

      middle.rotate({ by_player: player })

      // left and middle should have flipped
      expect(leftUnderground).toMatchTable({
        firstValue: { type: "output" },
        direction: defines.direction.west,
      })
      expect(middleUnderground).toMatchTable({
        firstValue: { type: "input" },
        direction: defines.direction.west,
      })
      // right unchanged
      expect(rightUnderground).toMatchTable({
        firstValue: { type: "output" },
        direction: defines.direction.east,
      })

      // error in left stage 1
      expect(leftStage1).toMatchTable({
        direction: defines.direction.east,
        belt_to_ground_type: "input",
      })
      expect(leftUnderground.hasErrorAt(1)).toBe(true)

      // fine in stage 2
      expect(leftStage2).toMatchTable({
        direction: defines.direction.west,
        belt_to_ground_type: "output",
      })

      assertEntityCorrect(leftUnderground, 1)
      assertEntityCorrect(rightUnderground, false)
      assertEntityCorrect(middleUnderground, false)
    })
    test("when flipping an underground to correct error, also flips its pair", () => {
      const leftStage1 = leftUnderground.getWorldEntity(1)!
      leftStage1.rotate({ by_player: player })
      // see first test for current state

      // now rotate the broken case (left in stage 2)
      const leftStage2 = leftUnderground.getWorldEntity(2)!
      expect(leftStage2).toMatchTable({
        direction: defines.direction.east,
        belt_to_ground_type: "input",
      })
      leftStage2.rotate({ by_player: player })

      // now all 3 should be rotated
      expect(leftUnderground).toMatchTable({
        firstValue: { type: "output" },
        direction: defines.direction.west,
      })
      expect(rightUnderground).toMatchTable({
        firstValue: { type: "input" },
        direction: defines.direction.west,
      })
      expect(middleUnderground).toMatchTable({
        firstValue: { type: "input" },
        direction: defines.direction.west,
      })

      const middle = middleUnderground.getWorldEntity(2)!

      expect(leftStage1).toMatchTable({
        direction: defines.direction.west,
        belt_to_ground_type: "output",
      })
      expect(leftStage2).toMatchTable({
        direction: defines.direction.west,
        belt_to_ground_type: "output",
      })
      expect(middle).toMatchTable({
        direction: defines.direction.west,
        belt_to_ground_type: "input",
      })

      assertEntityCorrect(leftUnderground, false)
      assertEntityCorrect(rightUnderground, false)
      assertEntityCorrect(middleUnderground, false)
    })
    test("when deleting an underground causing old pair to flip, updates highlights on old pair", () => {
      middleUnderground.setFirstStageUnchecked(1)
      updateWorldEntities(project, middleUnderground, 1)

      middleUnderground.getWorldEntity(1)!.rotate({ by_player: player })
      expect(middleUnderground).toMatchTable({
        firstValue: { type: "input" },
        direction: defines.direction.west,
      })
      expect(leftUnderground).toMatchTable({
        firstValue: { type: "output" },
        direction: defines.direction.west,
      })
      assertEntityCorrect(middleUnderground, false)
      assertEntityCorrect(leftUnderground, false)

      player.mine_entity(middleUnderground.getWorldEntity(1)!, true)

      expect(project.content.has(middleUnderground)).toBe(false)

      expect(leftUnderground.hasErrorAt(1)).toBe(true)

      assertEntityCorrect(leftUnderground, 1)
      assertEntityCorrect(rightUnderground, false)
    })
  })
  describe.each([false, true])("left, middle %s, broken right", (hasMiddle) => {
    let leftUnderground: ProjectEntity<BlueprintEntity>
    let rightUnderground: ProjectEntity<UndergroundBeltEntity>
    let leftWorldEntity: LuaEntity
    before_each(() => {
      leftUnderground = buildEntity(1, {
        name: "underground-belt",
        type: "input",
        direction: defines.direction.east,
      })

      if (hasMiddle) {
        // make an error entity in the middle
        const middle = buildEntity(1, {
          name: "underground-belt",
          type: "output",
          direction: defines.direction.east,
          position: pos.add(1, 0),
        })
        middle.destroyAllWorldOrPreviewEntities()
      }
      rightUnderground = buildEntity(1, {
        name: "underground-belt",
        type: "output",
        direction: defines.direction.east,
        position: pos.add(2, 0),
      }) as UndergroundBeltProjectEntity
      leftWorldEntity = leftUnderground.getWorldEntity(1)!
      expect(leftWorldEntity).toMatchTable({
        belt_to_ground_type: "input",
        direction: defines.direction.east,
        neighbours: rightUnderground.getWorldEntity(1)!,
      })
      // manually break right underground
      rightUnderground.setTypeProperty("input")
      rightUnderground.direction = defines.direction.west

      expect(rightUnderground.hasErrorAt(1)).toBe(true)
      expect(rightUnderground.hasErrorAt(2)).toBe(true)
      updateAllHighlights(project, rightUnderground)
      assertEntityCorrect(rightUnderground, 1)
    })
    test("flipping an underground with a pair with error updates highlight on pair", () => {
      // rotate left
      leftWorldEntity.rotate({ by_player: player })
      expect(leftUnderground).toMatchTable({
        firstValue: { type: "output" },
        direction: defines.direction.west,
      })
      expect(rightUnderground).toMatchTable({
        firstValue: { type: "input" },
        direction: defines.direction.west,
      })

      assertEntityCorrect(leftUnderground, false)
      assertEntityCorrect(rightUnderground, false)
    })
    test("flipping pair with broken underground at higher stage still disallows rotation", () => {
      const leftWorldEntity2 = leftUnderground.getWorldEntity(2)!
      leftWorldEntity2.rotate({ by_player: player })
      expect(leftUnderground).toMatchTable({
        firstValue: { type: "input" },
        direction: defines.direction.east,
      })
      expect(rightUnderground).toMatchTable({
        firstValue: { type: "input" },
        direction: defines.direction.west,
      })
      expect(leftWorldEntity).toMatchTable({
        belt_to_ground_type: "input",
        direction: defines.direction.east,
      })
      // not changed
      expect(leftUnderground.getWorldEntity(2)).toMatchTable({
        belt_to_ground_type: "input",
        direction: defines.direction.east,
      })
      // still broken
      expect(rightUnderground.getWorldEntity(2)).toMatchTable({
        belt_to_ground_type: "output",
        direction: defines.direction.east,
      })
      expect(rightUnderground.hasErrorAt(1)).toBe(true)
      expect(rightUnderground.hasErrorAt(2)).toBe(true)

      assertEntityCorrect(leftUnderground, false)
      assertEntityCorrect(rightUnderground, 1)
    })
  })
  test("calling refresh entity on an broken underground fixes it", () => {
    const underground = buildEntity(1, {
      name: "underground-belt",
      type: "input",
      direction: defines.direction.east,
    })
    assert(underground.getWorldEntity(1)!.rotate())
    refreshWorldEntityAtStage(project, underground, 1)
    expect(underground).toMatchTable({
      firstValue: { type: "input" },
      direction: defines.direction.east,
    })
    assertEntityCorrect(underground, false)
  })
  test("using cleanup tool on an broken underground fixes it", () => {
    const underground = buildEntity(1, {
      name: "underground-belt",
      type: "input",
      direction: defines.direction.east,
    })
    assert(underground.getWorldEntity(1)!.rotate())
    Events.raiseFakeEventNamed("on_player_selected_area", {
      player_index: 1 as PlayerIndex,
      item: Prototypes.CleanupTool,
      surface: surfaces[0],
      area: BBox.around(pos, 10),
      entities: [underground.getWorldEntity(1)!],
      tiles: [],
    })
    expect(underground).toMatchTable({
      firstValue: { type: "input" },
      direction: defines.direction.east,
    })
    assertEntityCorrect(underground, false)
  })
  test("using cleanup tool on broken pair fixes it", () => {
    const left = buildEntity(1, {
      name: "underground-belt",
      type: "input",
      direction: defines.direction.east,
    })
    const right = buildEntity(1, {
      name: "underground-belt",
      type: "output",
      direction: defines.direction.east,
      position: pos.add(1, 0),
    })
    assert(left.getWorldEntity(1)!.rotate())
    expect(right.hasErrorAt(1)).toBe(true)

    Events.raiseFakeEventNamed("on_player_selected_area", {
      player_index: 1 as PlayerIndex,
      item: Prototypes.CleanupTool,
      surface: surfaces[0],
      area: BBox.around(pos, 10),
      entities: [left.getWorldEntity(1)!],
      tiles: [],
    })

    assertEntityCorrect(left, false)
    assertEntityCorrect(right, false)
  })

  describe("pasting an underground", () => {
    before_each(() => {
      const stack = player.cursor_stack!
      stack.set_stack("blueprint")
      stack.set_blueprint_entities([
        {
          name: "underground-belt",
          type: "input",
          direction: defines.direction.west,
          entity_number: 1,
          position: Pos(0.5, 0.5),
        },
      ])
      player.teleport(pos, surfaces[0])
    })
    test("pasting an underground belt works", () => {
      player.build_from_cursor({
        position: pos.add(2, 0),
      })

      const builtEntity = surfaces[0].find_entity("underground-belt", pos.add(2, 0))!
      expect(builtEntity).toBeAny()

      const projEntity = project.content.findCompatibleWithLuaEntity(
        builtEntity,
        nil,
        1,
      ) as UndergroundBeltProjectEntity
      expect(projEntity).toBeAny()
      expect(projEntity).toMatchTable({
        firstValue: { type: "input" },
        direction: defines.direction.west,
      })
    })

    test.each([false, true])("pasting an underground belt that gets flipped works, with middle %s", (hasMiddle) => {
      buildEntity(1, {
        name: "underground-belt",
        type: "input",
        direction: defines.direction.east,
      })
      if (hasMiddle) {
        const entity = buildEntity(1, {
          name: "underground-belt",
          type: "output",
          direction: defines.direction.east,
          position: pos.add(1, 0),
        })
        entity.destroyAllWorldOrPreviewEntities()
      }
      player.build_from_cursor({
        position: pos.add(2, 0),
      })

      const builtEntity = surfaces[0].find_entity("underground-belt", pos.add(2, 0))!
      expect(builtEntity).toBeAny()

      // should be flipped
      const projEntity = project.content.findCompatibleWithLuaEntity(
        builtEntity,
        nil,
        1,
      ) as UndergroundBeltProjectEntity
      expect(projEntity).toBeAny()
      expect(projEntity).toMatchTable({
        firstValue: { type: "output" },
        direction: defines.direction.east,
      })
    })
  })

  describe("upgrading underground via blueprint paste", () => {
    let underground: UndergroundBeltProjectEntity
    before_each(() => {
      player.mod_settings[Settings.UpgradeOnPaste] = { value: true }
      underground = buildEntity(1, {
        name: "underground-belt",
        type: "input",
        direction: defines.direction.east,
      }) as UndergroundBeltProjectEntity
      const stack = player.cursor_stack!
      stack.set_stack("blueprint")
      stack.set_blueprint_entities([
        {
          name: "fast-underground-belt",
          type: "input",
          direction: defines.direction.east,
          entity_number: 1,
          position: Pos(0.5, 0.5),
        },
        {
          name: "small-electric-pole",
          entity_number: 2,
          position: Pos(1.5, 1.5),
        },
      ])
      stack.blueprint_snap_to_grid = [1, 1]
      stack.blueprint_absolute_snapping = true
      player.teleport(pos, surfaces[0])
    })
    after_each(() => {
      player.mod_settings[Settings.UpgradeOnPaste] = { value: false }
    })
    test("can upgrade underground belt via paste", () => {
      player.build_from_cursor({ position: pos, alt: true })
      expect(underground).toMatchTable({
        firstValue: { name: "fast-underground-belt", type: "input" },
        direction: defines.direction.east,
      })
      expect(underground.getWorldEntity(1)).toMatchTable({
        name: "fast-underground-belt",
        belt_to_ground_type: "input",
        direction: defines.direction.east,
      })
    })
    test("can upgrade underground in flipped direction", () => {
      underground.getWorldEntity(1)!.rotate({ by_player: player })
      player.build_from_cursor({ position: pos, alt: true })

      expect(underground).toMatchTable({
        firstValue: { name: "fast-underground-belt", type: "output" },
        direction: defines.direction.west,
      })
    })
    test("does not upgrade underground belt in wrong direction", () => {
      underground.setTypeProperty("output")
      refreshAllWorldEntities(project, underground)
      player.build_from_cursor({ position: pos, alt: true })

      expect(underground).toMatchTable({
        firstValue: { name: "underground-belt", type: "output" },
        direction: defines.direction.east,
      })
    })
  })
})

test("rotation forbidden at higher stage", () => {
  const entity = buildEntity(3)
  const worldEntity = entity.getWorldEntity(4)!
  worldEntity.direction = defines.direction.south
  const ret = tryUpdateEntityFromWorld(project, entity, 4)
  expect(ret).to.be("cannot-rotate")
  expect(entity.direction).to.be(defines.direction.east)
  assertEntityCorrect(entity, false)
})

test("rotation forbidden at higher stage via rotate", () => {
  const entity = buildEntity(3)
  const worldEntity = entity.getWorldEntity(4)!
  worldEntity.direction = defines.direction.south
  tryRotateEntityToMatchWorld(project, entity, 4)
  expect(entity.direction).to.be(defines.direction.east)
  assertEntityCorrect(entity, false)
})

test("creating upgrade via fast replace", () => {
  const entity = buildEntity(3)
  const replacedEntity = createEntity(4, { name: "stack-filter-inserter" })
  entity.replaceWorldEntity(4, replacedEntity)
  tryUpdateEntityFromWorld(project, entity, 4)
  expect(entity.firstValue.name).to.be("filter-inserter")
  expect(entity.getStageDiff(4)).to.equal({ name: "stack-filter-inserter" })

  assertEntityCorrect(entity, false)
})

test("refreshing and rebuilding an entity with diffs", () => {
  const entity = buildEntity(2)
  entity._applyDiffAtStage(5, { name: "stack-filter-inserter" })
  entity._applyDiffAtStage(3, { override_stack_size: 2 })
  refreshAllWorldEntities(project, entity)
  for (const stage of $range(1, 6)) {
    refreshWorldEntityAtStage(project, entity, stage)
    assertEntityCorrect(entity, false)
  }
  for (const stage of $range(1, 6)) {
    rebuildWorldEntityAtStage(project, entity, stage)
    assertEntityCorrect(entity, false)
  }
  for (const stage of $range(1, 6)) {
    rebuildStage(project, stage)
    assertEntityCorrect(entity, false)
  }
  rebuildAllStages(project)
  runEntireCurrentTask()
  assertEntityCorrect(entity, false)
})

test("update with upgrade and blocker", () => {
  createEntity(5, { name: "stone-wall" })
  const entity = buildEntity(3)

  let preview = entity.getWorldOrPreviewEntity(5)!
  expect(isPreviewEntity(preview)).to.be(true)
  expect(preview.name).to.be(Prototypes.PreviewEntityPrefix + "filter-inserter")

  assertEntityCorrect(entity, 5)

  entity._applyDiffAtStage(4, { name: "stack-filter-inserter" })
  refreshAllWorldEntities(project, entity)

  preview = entity.getWorldOrPreviewEntity(5)!
  expect(isPreviewEntity(preview)).to.be(true)
  expect(preview.name).to.be(Prototypes.PreviewEntityPrefix + "stack-filter-inserter")

  assertEntityCorrect(entity, 5)
})

test("creating upgrade via apply upgrade target", () => {
  const entity = buildEntity(3)
  const worldEntity = entity.getWorldEntity(4)!
  worldEntity.order_upgrade({
    force: worldEntity.force,
    target: "stack-filter-inserter",
  })
  tryApplyUpgradeTarget(project, entity, 4)
  expect(entity.firstValue.name).to.be("filter-inserter")
  expect(entity.getStageDiff(4)).to.equal({ name: "stack-filter-inserter" })

  assertEntityCorrect(entity, false)
})

test("moving entity up", () => {
  const entity = buildEntity(3)
  assertEntityCorrect(entity, false)
  trySetFirstStage(project, entity, 4)
  expect(entity.firstStage).to.be(4)
  assertEntityCorrect(entity, false)
})

test("moving entity down", () => {
  const entity = buildEntity(3)
  trySetFirstStage(project, entity, 2)
  expect(entity.firstStage).to.be(2)
  assertEntityCorrect(entity, false)
})

test("dolly entity", () => {
  const entity = buildEntity(3)
  const worldEntity = entity.getWorldEntity(3)!
  expect(worldEntity.teleport(1, 0)).to.be(true)
  const newPosition = worldEntity.position
  const ret = tryDollyEntities(project, entity, 3)
  expect(ret).to.be("success")
  expect(entity.position).to.equal(newPosition)
  assertEntityCorrect(entity, false)
})

test("resetProp", () => {
  const entity = buildEntity(3)
  entity._applyDiffAtStage(4, {
    override_stack_size: 2,
  })
  resetProp(project, entity, 4, "override_stack_size")
  expect(entity.hasStageDiff()).to.be(false)
  expect(entity.firstValue.override_stack_size).to.be(1)
  assertEntityCorrect(entity, false)
})

test("movePropDown", () => {
  const entity = buildEntity(3)
  entity._applyDiffAtStage(4, {
    override_stack_size: 2,
  })
  movePropDown(project, entity, 4, "override_stack_size")
  expect(entity.hasStageDiff()).to.be(false)
  expect(entity.firstValue.override_stack_size).to.be(2)
  assertEntityCorrect(entity, false)
})

test("resetAllProps", () => {
  const entity = buildEntity(3)
  entity._applyDiffAtStage(4, {
    override_stack_size: 2,
    filter_mode: "blacklist",
  })
  resetAllProps(project, entity, 4)
  expect(entity.hasStageDiff()).to.be(false)
  expect(entity.firstValue.override_stack_size).to.be(1)
  expect(entity.firstValue.filter_mode).to.be.nil() // whitelist is default
  assertEntityCorrect(entity, false)
})

test("moveAllPropsDown", () => {
  const entity = buildEntity(3)
  entity._applyDiffAtStage(4, {
    override_stack_size: 2,
    filter_mode: "blacklist",
  })
  moveAllPropsDown(project, entity, 4)
  expect(entity.hasStageDiff()).to.be(false)
  expect(entity.firstValue.override_stack_size).to.be(2)
  expect(entity.firstValue.filter_mode).to.be("blacklist")
  assertEntityCorrect(entity, false)
})

// with wire connections
function setupPole(stage: StageNumber, args: Partial<SurfaceCreateEntity> = {}) {
  return buildEntity(stage, { name: "medium-electric-pole", position: pos.minus(Pos(0, 1)), ...args })
}
function setupPole2(stage: StageNumber) {
  return setupPole(stage, {
    position: pos.minus(Pos(0, 2)),
  })
}

test("saves initial cable connections", () => {
  const pole1 = setupPole(3)
  const pole2 = setupPole2(3)
  expect(project.content.getCableConnections(pole1)?.has(pole2)).to.be(true)
  expect(project.content.getCableConnections(pole2)?.has(pole1)).to.be(true)
  assertEntityCorrect(pole1, false)
  assertEntityCorrect(pole2, false)
})

test("saves initial cable connections to a pole in higher stage", () => {
  const pole1 = setupPole(4)
  const pole2 = setupPole2(3) // should connect to pole1
  expect(project.content.getCableConnections(pole1)?.has(pole2)).to.be(true)
  expect(project.content.getCableConnections(pole2)?.has(pole1)).to.be(true)
  assertEntityCorrect(pole1, false)
  assertEntityCorrect(pole2, false)
})

test("disconnect and connect cables", () => {
  const pole1 = setupPole(3)
  const pole2 = setupPole2(3)
  pole1.getWorldEntity(3)!.disconnect_neighbour(pole2.getWorldEntity(3))
  updateWiresFromWorld(project, pole1, 3)

  expect(project.content.getCableConnections(pole1)?.has(pole2)).to.be.falsy()
  expect(project.content.getCableConnections(pole2)?.has(pole1)).to.be.falsy()
  assertEntityCorrect(pole1, false)
  assertEntityCorrect(pole2, false)

  pole1.getWorldEntity(3)!.connect_neighbour(pole2.getWorldEntity(3)!)
  updateWiresFromWorld(project, pole1, 3)

  expect(project.content.getCableConnections(pole1)?.has(pole2)).to.be(true)
  expect(project.content.getCableConnections(pole2)?.has(pole1)).to.be(true)
  assertEntityCorrect(pole1, false)
  assertEntityCorrect(pole2, false)
})

test("connect and disconnect circuit wires", () => {
  const inserter = buildEntity(3) // is filter inserter
  const pole = setupPole(3)
  pole.getWorldEntity(3)!.connect_neighbour({
    wire: defines.wire_type.red,
    target_entity: inserter.getWorldEntity(3)!,
  })
  updateWiresFromWorld(project, pole, 3)

  const expectedConnection = next(
    project.content.getCircuitConnections(inserter)!.get(pole)!,
  )[0] as ProjectCircuitConnection
  expect(expectedConnection).to.be.any()
  expect(
    circuitConnectionEquals(
      {
        wire: defines.wire_type.red,
        fromEntity: pole,
        toEntity: inserter,
        fromId: 1,
        toId: 1,
      },
      expectedConnection,
    ),
  ).to.be(true)

  assertEntityCorrect(inserter, false)
  assertEntityCorrect(pole, false)
})

function assertTrainEntityCorrect(entity: RollingStockProjectEntity, expectedHasError: number | false) {
  assertEntityCorrect(entity, expectedHasError)
}

test("create train entity", () => {
  const train = createRollingStock(surfaces[3 - 1])
  const entity = addNewEntity(project, train, 3)!
  expect(entity).to.be.any()
  assertTrainEntityCorrect(entity, false)
})
test("train entity error", () => {
  const train = createRollingStock(surfaces[3 - 1])
  const entity = addNewEntity(project, train, 3)!
  train.destroy()
  surfaces[3 - 1].find_entities().forEach((e) => e.destroy()) // destroys rails too, so train cannot be re-created

  refreshAllWorldEntities(project, entity)
  assertTrainEntityCorrect(entity, 3)
})

test("adding wire in higher stage sets empty control behavior", () => {
  const inserter = buildEntity(3) // is filter inserter
  const belt = buildEntity(2, { name: "transport-belt", position: pos.minus(Pos(0, 1)) })
  refreshWorldEntityAtStage(project, inserter, 4)
  refreshWorldEntityAtStage(project, belt, 4)
  const inserter4 = inserter.getWorldEntity(4)!
  const belt4 = belt.getWorldEntity(4)!

  inserter4.connect_neighbour({
    wire: defines.wire_type.red,
    target_entity: belt4,
  })
  updateWiresFromWorld(project, inserter, 4)

  const connections = project.content.getCircuitConnections(inserter)!
  expect(connections).to.be.any()
  const connection = next(connections.get(belt)!)[0] as ProjectCircuitConnection
  expect(connection).to.be.any()
  expect(
    circuitConnectionEquals(connection, {
      wire: defines.wire_type.red,
      fromEntity: inserter,
      toEntity: belt,
      fromId: 1,
      toId: 1,
    }),
  ).to.be(true)

  expect(inserter.firstValue.control_behavior).to.be(emptyInserterControlBehavior)
  expect(belt.firstValue.control_behavior).to.be(emptyBeltControlBehavior)

  expect(inserter.getStageDiff(4)!.control_behavior).to.be.truthy()
  expect(belt.getStageDiff(4)!.control_behavior).to.be.truthy()

  assertEntityCorrect(inserter, false)
  assertEntityCorrect(belt, false)
})

test.each([1, 2])("paste a chain of circuit wires over existing power poles, stage %s", (stage) => {
  const pole1 = buildEntity(stage, { name: "small-electric-pole", position: pos })
  const pole2 = buildEntity(stage, { name: "small-electric-pole", position: pos.plus(Pos(4, 0)) })
  const pole3 = buildEntity(stage, { name: "small-electric-pole", position: pos.plus(Pos(8, 0)) })

  const bpEntities: BlueprintEntity[] = [
    {
      entity_number: 1,
      name: "small-electric-pole",
      position: pos,
      connections: { "1": { red: [{ entity_id: 2 }] } },
    },
    {
      entity_number: 2,
      name: "small-electric-pole",
      position: pos.plus(Pos(4, 0)),
      connections: { "1": { red: [{ entity_id: 1 }, { entity_id: 3 }] } },
    },
    {
      entity_number: 3,
      name: "small-electric-pole",
      position: pos.plus(Pos(8, 0)),
      connections: { "1": { red: [{ entity_id: 2 }] } },
    },
  ]
  const stack = player.cursor_stack!
  stack.set_stack("blueprint")
  stack.set_blueprint_entities(bpEntities)

  player.teleport([0, 0], surfaces[stage - 1])
  player.build_from_cursor({ position: pos.plus(Pos(4, 0)) })

  // should have 2 cable connections

  const connection1 = project.content.getCircuitConnections(pole1)?.get(pole2)
  expect(connection1).not.toBeNil()
  const connection21 = project.content.getCircuitConnections(pole2)?.get(pole1)
  expect(connection21).not.toBeNil()
  const connection23 = project.content.getCircuitConnections(pole2)?.get(pole3)
  expect(connection23).not.toBeNil()
  const connection3 = project.content.getCircuitConnections(pole3)?.get(pole2)
  expect(connection3).not.toBeNil()

  assertEntityCorrect(pole1, false)
  assertEntityCorrect(pole2, false)
  assertEntityCorrect(pole3, false)
})

test("can build a entity using known value", () => {
  const luaEntity = createEntity(1, { name: "transport-belt", position: pos, direction: defines.direction.east })
  const entity = addNewEntity(project, luaEntity, 1, {
    entity_number: 1,
    name: "transport-belt",
    position: pos,
    direction: defines.direction.east,
    override_stack_size: 1,
  })!
  expect(entity).toMatchTable({
    firstStage: 1,
    firstValue: {
      name: "transport-belt",
      override_stack_size: 1,
    },
  })
})

test.each([true, false])("can maybe upgrade entity via blueprint, with setting %s", (enabled) => {
  player.mod_settings[Settings.UpgradeOnPaste] = { value: enabled }
  const bpEntity: BlueprintEntity = {
    entity_number: 1,
    name: "fast-inserter",
    position: Pos(0.5, 0.5),
    direction: direction.west,
  }
  const entity = buildEntity(1, { name: "inserter", position: pos, direction: direction.west })
  const stack = player.cursor_stack!
  stack.set_stack("blueprint")
  stack.blueprint_snap_to_grid = [1, 1]
  stack.blueprint_absolute_snapping = true
  stack.set_blueprint_entities([
    bpEntity,
    {
      entity_number: 2,
      name: "transport-belt",
      position: Pos(0, 2),
      direction: direction.south,
    },
  ])

  player.teleport([0, 0], surfaces[0])
  player.build_from_cursor({ position: pos, alt: true })

  const expected = enabled ? "fast-inserter" : "inserter"
  expect(entity.firstValue).toMatchTable({ name: expected })
  expect(entity.getWorldEntity(1)).toMatchTable({ name: expected })
})

test("can upgrade entity with wires via blueprint", () => {
  player.mod_settings[Settings.UpgradeOnPaste] = { value: true }
  const entity1: BlueprintEntity = {
    entity_number: 1,
    name: "fast-inserter",
    position: Pos(0.5, 0.5),
    direction: direction.west,
    connections: {
      1: {
        red: [{ entity_id: 2, circuit_id: 1 }],
      },
    },
  }
  const entity2: BlueprintEntity = {
    entity_number: 2,
    name: "transport-belt",
    position: Pos(0, 2),
    direction: direction.south,
    connections: {
      1: {
        red: [{ entity_id: 1, circuit_id: 1 }],
      },
    },
  }
  const entity = buildEntity(1, { name: "inserter", position: pos, direction: direction.west })
  const stack = player.cursor_stack!
  stack.set_stack("blueprint")
  stack.blueprint_snap_to_grid = [1, 1]
  stack.blueprint_absolute_snapping = true
  stack.set_blueprint_entities([entity1, entity2])

  player.teleport([0, 0], surfaces[0])
  player.build_from_cursor({ position: pos, alt: true })

  const expected = "fast-inserter"
  expect(entity.firstValue).toMatchTable({ name: expected })
  expect(entity.getWorldEntity(1)).toMatchTable({ name: expected })
  expect(project.content.getCircuitConnections(entity)).not.toBeNil()
})

describe.each([defines.direction.north, defines.direction.northeast])("with rail direction %d", (diag) => {
  test.each([defines.direction.north, defines.direction.east, defines.direction.south, defines.direction.west])(
    "can paste a straight rail in all rotations",
    (direction) => {
      const entity: BlueprintEntity = {
        entity_number: 1,
        name: "straight-rail",
        position: Pos(1, 1),
        direction: diag,
      }
      const stack = player.cursor_stack!
      stack.set_stack("blueprint")
      stack.blueprint_snap_to_grid = [2, 2]
      stack.blueprint_absolute_snapping = true
      stack.set_blueprint_entities([entity])

      const pos = Pos(5, 5)
      player.teleport([0, 0], surfaces[0])
      player.build_from_cursor({ position: pos, direction, alt: true })

      const rail = surfaces[0].find_entity("straight-rail", pos)!
      expect(rail).not.toBeNil()
      let expected = (diag + direction) % 8
      if (expected == 4 || expected == 6) expected -= 4 // left=right, up=down
      expect(rail.direction).toEqual(expected)

      const projectEntity = project.content.findCompatibleWithLuaEntity(rail, nil, 1)

      expect(projectEntity).not.toBeNil()
      expect(projectEntity!.getWorldEntity(1)).toEqual(rail)

      expect(projectEntity!.direction).toEqual(expected)
    },
  )
})

test("pasting diagonal rail at same position but different direction", () => {
  const entity: BlueprintEntity = {
    entity_number: 1,
    name: "straight-rail",
    position: Pos(1, 1),
    direction: defines.direction.northeast,
  }
  const stack = player.cursor_stack!
  stack.set_stack("blueprint")
  stack.blueprint_snap_to_grid = [2, 2]
  stack.blueprint_absolute_snapping = true
  stack.set_blueprint_entities([entity])

  const pos = Pos(5, 5)
  player.teleport([0, 0], surfaces[0])

  player.build_from_cursor({ position: pos, direction: defines.direction.north, alt: true })
  const rail = surfaces[0].find_entities_filtered({
    name: "straight-rail",
    position: pos,
    radius: 0,
    direction: defines.direction.northeast,
  })[0]
  expect(rail).not.toBeNil()

  player.build_from_cursor({ position: pos, direction: defines.direction.south, alt: true })
  const rail2 = surfaces[0].find_entities_filtered({
    name: "straight-rail",
    position: pos,
    radius: 0,
    direction: defines.direction.southwest,
  })[0]
  expect(rail2).not.toBeNil()

  const entity1 = project.content.findCompatibleWithLuaEntity(rail, nil, 1)
  const entity2 = project.content.findCompatibleWithLuaEntity(rail2, nil, 1)
  expect(entity1).not.toBeNil()
  expect(entity2).not.toBeNil()

  expect(entity1!.direction).toEqual(defines.direction.northeast)
  expect(entity2!.direction).toEqual(defines.direction.southwest)

  expect(entity1!.getWorldEntity(1)).toEqual(rail)
  expect(entity2!.getWorldEntity(1)).toEqual(rail2)
})

describe.each([
  "straight-rail",
  "stone-furnace",
  "storage-tank",
  "assembling-machine-1",
  "small-electric-pole",
  "boiler",
  "underground-belt",
])("can paste %s", (entityName) => {
  describe.each([defines.direction.north, defines.direction.east, defines.direction.south, defines.direction.west])(
    "at direction %d",
    (entityDirection) => {
      test.each([defines.direction.north, defines.direction.east, defines.direction.south, defines.direction.west])(
        "pasted at direction %d",
        (pasteDirection) => {
          const bboxSize = BBox.size(game.entity_prototypes[entityName].collision_box)
          const pos = Pos(bboxSize.x % 2 == 0 ? 0 : 0.5, bboxSize.y % 2 == 0 ? 0 : 0.5)

          const entity: BlueprintEntity = {
            entity_number: 1,
            name: entityName,
            position: pos,
            direction: entityDirection,
          }
          const stack = player.cursor_stack!
          stack.set_stack("blueprint")
          stack.set_blueprint_entities([entity])
          player.teleport([0, 0], surfaces[0])
          player.build_from_cursor({
            position: Pos(0, 0),
            direction: pasteDirection,
            alt: true,
          })
          const luaEntity = surfaces[0].find_entity(entityName, pos)!
          expect(luaEntity).not.toBeNil()

          const entity1 = project.content.findCompatibleWithLuaEntity(luaEntity, nil, 1)!
          expect(entity1).not.toBeNil()
          expect(entity1.direction).toEqual(luaEntity.direction)
          expect(entity1.getWorldEntity(1)).toEqual(luaEntity)

          assertEntityCorrect(entity1, false)
        },
      )
    },
  )
})

test("pasting rotate blueprint with a rotated fluid tank", () => {
  const entity: BlueprintEntity = {
    entity_number: 1,
    name: "storage-tank",
    position: Pos(0, 0),
    direction: 2,
  }
  const stack = player.cursor_stack!
  stack.set_stack("blueprint")
  stack.set_blueprint_entities([entity])

  const pos = Pos(5, 5)

  player.teleport([0, 0], surfaces[0])
  player.build_from_cursor({ position: pos, direction: 2, alt: true })
  const tank = surfaces[0].find_entity("storage-tank", pos)!
  expect(tank).not.toBeNil()

  expect(tank.direction).toBe(0)

  const entity1 = project.content.findCompatibleWithLuaEntity(tank, nil, 1)!
  expect(entity1).not.toBeNil()
  expect(entity1.direction).toEqual(0)
  expect(entity1.getWorldEntity(1)).toEqual(tank)

  assertEntityCorrect(entity1, false)
})

test("can paste a power pole at a lower stage to move", () => {
  const pole = buildEntity(3, { name: "medium-electric-pole", position: Pos(0.5, 0.5) })

  const entity: BlueprintEntity = {
    entity_number: 1,
    name: "medium-electric-pole",
    position: Pos(0.5, 0.5),
  }

  const stack = player.cursor_stack!
  stack.set_stack("blueprint")
  stack.set_blueprint_entities([entity])

  player.teleport([0, 0], surfaces[2 - 1])
  player.build_from_cursor({ position: Pos(0.5, 0.5), direction: 0, alt: true })
  // should move to stage 2

  const pole2 = surfaces[2 - 1].find_entity("medium-electric-pole", Pos(0.5, 0.5))!
  expect(pole2).not.toBeNil()

  expect(pole.firstStage).toBe(2)
  expect(pole.getWorldEntity(2)).toEqual(pole2)

  assertEntityCorrect(pole, false)
})

test("connecting power switch", () => {
  const pole = buildEntity(2, { name: "medium-electric-pole", position: Pos(0, 0) })
  const powerSwitch = buildEntity(1, { name: "power-switch", position: Pos(2, 0) })

  const poleLuaEntity = pole.getWorldEntity(2)!
  poleLuaEntity.connect_neighbour({
    wire: defines.wire_type.copper,
    target_entity: powerSwitch.getWorldEntity(2)!,
    target_wire_id: defines.wire_connection_id.power_switch_right,
  })

  onWiresPossiblyUpdated(project, poleLuaEntity, 2, player.index)

  assertEntityCorrect(pole, false)
  assertEntityCorrect(powerSwitch, false)
})

test("connecting power switch to new pole in higher stage", () => {
  const pole1 = buildEntity(1, { name: "medium-electric-pole", position: Pos(0, 0) })
  const powerSwitch = buildEntity(1, { name: "power-switch", position: Pos(2, 0) })
  const pole2 = buildEntity(2, { name: "medium-electric-pole", position: Pos(4, 0) })

  const pole1LuaEntity = pole1.getWorldEntity(1)!
  pole1LuaEntity.connect_neighbour({
    wire: defines.wire_type.copper,
    target_entity: powerSwitch.getWorldEntity(1)!,
    target_wire_id: defines.wire_connection_id.power_switch_right,
  })

  onWiresPossiblyUpdated(project, pole1LuaEntity, 1, player.index)
  assertEntityCorrect(pole1, false)
  assertEntityCorrect(pole2, false)
  assertEntityCorrect(powerSwitch, false)

  const pole2LuaEntity = pole2.getWorldEntity(3)!
  pole2LuaEntity.connect_neighbour({
    wire: defines.wire_type.copper,
    target_entity: powerSwitch.getWorldEntity(3)!,
    target_wire_id: defines.wire_connection_id.power_switch_right,
  })

  onWiresPossiblyUpdated(project, pole2LuaEntity, 3, player.index)
  assertEntityCorrect(pole1, false)
  assertEntityCorrect(pole2, false)
  assertEntityCorrect(powerSwitch, false)
})

test("using stage delete tool", () => {
  const entity = buildEntity(1, { name: "inserter", position: pos, direction: direction.west })
  Events.raiseFakeEventNamed("on_player_selected_area", {
    player_index: player.index,
    item: Prototypes.StageDeconstructTool,
    entities: [entity.getWorldEntity(3)!],
    tiles: [],
    surface: surfaces[2],
    area: { left_top: pos, right_bottom: pos },
  })

  expect(entity.lastStage).toBe(2)
  assertEntityCorrect(entity, false)
})

test("using stage delete tool alt select", () => {
  const entity = buildEntity(1, { name: "inserter", position: pos, direction: direction.west })
  userSetLastStageWithUndo(project, entity, 3, player.index)

  Events.raiseFakeEventNamed("on_player_alt_selected_area", {
    player_index: player.index,
    item: Prototypes.StageDeconstructTool,
    entities: [entity.getWorldEntity(3)!],
    tiles: [],
    surface: surfaces[2],
    area: { left_top: pos, right_bottom: pos },
  })

  expect(entity.lastStage).toBe(nil)
  assertEntityCorrect(entity, false)

  _simulateUndo(player)

  expect(entity.lastStage).toBe(3)
})

test("rebuildStage", () => {
  const entityPresent = buildEntity(2, { name: "inserter", position: pos.add(1, 0), direction: direction.west })
  const entityPreview = buildEntity(3, { name: "inserter", position: pos.add(2, 0), direction: direction.west })
  const entityPastLastStage = buildEntity(1, { name: "inserter", position: pos.add(3, 0), direction: direction.west })
  expect(trySetLastStage(project, entityPastLastStage, 1)).toEqual(StageMoveResult.Updated)
  entityPresent._applyDiffAtStage(4, { name: "stack-filter-inserter" })
  refreshAllWorldEntities(project, entityPresent)
  assertEntityCorrect(entityPresent, false)

  for (const stage of $range(1, 6)) {
    rebuildStage(project, stage)

    assertEntityCorrect(entityPresent, false)
    assertEntityCorrect(entityPreview, false)
    assertEntityCorrect(entityPastLastStage, false)
  }
})
