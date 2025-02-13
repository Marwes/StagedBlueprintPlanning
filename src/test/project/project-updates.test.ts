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

import {
  BlueprintEntity,
  LuaEntity,
  LuaSurface,
  SurfaceCreateEntity,
  UndergroundBeltSurfaceCreateEntity,
} from "factorio:runtime"
import expect, { mock } from "tstl-expect"
import { oppositedirection } from "util"
import { UndergroundBeltEntity } from "../../entity/Entity"
import {
  createProjectEntityNoCopy,
  ProjectEntity,
  RollingStockProjectEntity,
  StageDiffsInternal,
  StageNumber,
} from "../../entity/ProjectEntity"
import { ContextualFun } from "../../lib"
import { Pos } from "../../lib/geometry"
import { EntityUpdateResult, StageMoveResult } from "../../project/project-updates"
import { Project } from "../../project/ProjectDef"
import { createRollingStock, createRollingStocks } from "../entity/createRollingStock"
import { moduleMock } from "../module-mock"
import { createMockProject, setupTestSurfaces } from "./Project-mock"
import _wireHandler = require("../../entity/wires")
import _highlights = require("../../project/entity-highlights")
import projectUpdates = require("../../project/project-updates")
import _worldListener = require("../../project/user-actions")
import _worldUpdater = require("../../project/world-entity-updates")
import direction = defines.direction
import wire_type = defines.wire_type

const pos = Pos(10.5, 10.5)

let project: Project
const surfaces: LuaSurface[] = setupTestSurfaces(6)

const worldUpdater = moduleMock(_worldUpdater, true)
const wireSaver = moduleMock(_wireHandler, true)
const highlights = moduleMock(_highlights, true)

let worldUpdaterCalls: number
let expectedWuCalls: number
before_each(() => {
  project = createMockProject(surfaces)
  worldUpdaterCalls = 0
  expectedWuCalls = 0
  for (const [, v] of pairs(worldUpdater)) {
    v.invokes((() => {
      worldUpdaterCalls++
    }) as ContextualFun)
  }
  wireSaver.saveWireConnections.returns(false as any)

  game.surfaces[1].find_entities().forEach((e) => e.destroy())
})

after_each(() => {
  if (expectedWuCalls == worldUpdaterCalls) return

  let message = `expected ${expectedWuCalls} calls to worldUpdater, got ${worldUpdaterCalls}\n`
  for (const [key, fn] of pairs(worldUpdater)) {
    if (fn.calls.length > 0) {
      message += `  ${key} called ${fn.calls.length} times\n`
    }
  }
  error(message)
})

function clearMocks(): void {
  mock.clear(worldUpdater)
  mock.clear(wireSaver)
  worldUpdaterCalls = 0
  expectedWuCalls = 0
}

function assertWUNotCalled() {
  if (worldUpdaterCalls != 0) {
    for (const [, spy] of pairs(worldUpdater)) {
      expect(spy as any).not.called()
    }
  }
}
function assertUpdateCalled(
  entity: ProjectEntity,
  startStage: StageNumber,
  n?: number,
  updateHighlights?: boolean,
): void {
  expectedWuCalls++
  if (n == nil) expect(worldUpdaterCalls).to.be(1)
  expect(worldUpdater.updateWorldEntities).nthCalledWith(n ?? 1, project, entity, startStage, updateHighlights)
  if (updateHighlights == false) {
    expect(highlights.updateAllHighlights).calledWith(project, entity)
  }
}

function assertUpdateOnLastStageChangedCalled(entity: ProjectEntity, startStage: StageNumber) {
  expectedWuCalls++
  expect(worldUpdaterCalls).to.be(1)
  expect(worldUpdater.updateWorldEntitiesOnLastStageChanged).calledWith(project, entity, startStage)
}

function assertRefreshCalled(entity: ProjectEntity, stage: StageNumber) {
  expectedWuCalls++
  expect(worldUpdater.refreshWorldEntityAtStage).calledWith(project, entity, stage)
}
function assertResetUndergroundRotationCalled(entity: ProjectEntity, stage: StageNumber) {
  expectedWuCalls++
  expect(worldUpdater.resetUnderground).calledWith(project, entity, stage)
}
function assertReplaceCalled(entity: ProjectEntity, stage: StageNumber) {
  expectedWuCalls++
  expect(worldUpdater.rebuildWorldEntityAtStage).calledWith(project, entity, stage)
}
function assertDeleteWorldEntityCalled(entity: ProjectEntity) {
  expectedWuCalls++
  expect(worldUpdaterCalls).to.be(1)
  expect(worldUpdater.deleteWorldEntities).calledWith(project, entity)
}
function assertMakeSettingsRemnantCalled(entity: ProjectEntity) {
  expectedWuCalls++
  expect(worldUpdaterCalls).to.be(1)
  expect(worldUpdater.makeSettingsRemnant).calledWith(project, entity)
}
function assertReviveSettingsRemnantCalled(entity: ProjectEntity) {
  expectedWuCalls++
  expect(worldUpdaterCalls).to.be(1)
  expect(worldUpdater.reviveSettingsRemnant).calledWith(project, entity)
}

function assertOneEntity() {
  expect(project.content.countNumEntities()).to.be(1)
}
function assertNEntities(n: number) {
  expect(project.content.countNumEntities()).to.be(n)
}
function assertNoEntities() {
  expect(project.content.countNumEntities()).to.equal(0)
}

function assertStageDiffs(entity: ProjectEntity, changes: StageDiffsInternal<BlueprintEntity>) {
  expect(entity.getStageDiffs()).to.equal(changes)
}

function createEntity(stageNum: StageNumber, args?: Partial<SurfaceCreateEntity>): LuaEntity {
  const params = {
    name: "filter-inserter",
    position: pos,
    force: "player",
    ...args,
  }
  const entity = assert(surfaces[stageNum - 1].create_entity(params), "created entity")[0]
  const proto = game.entity_prototypes[params.name]
  if (proto.type == "inserter") {
    entity.inserter_stack_size_override = 1
    entity.inserter_filter_mode = "whitelist"
  }
  return entity
}
function assertNewUpdated(entity: ProjectEntity) {
  expect(worldUpdater.updateNewWorldEntitiesWithoutWires).calledWith(project, entity)
  expectedWuCalls = 1
  if (project.content.getCircuitConnections(entity) || project.content.getCableConnections(entity)) {
    expect(worldUpdater.updateWireConnections).calledWith(project, entity)
    expectedWuCalls++
  }
}

describe("addNewEntity", () => {
  test("simple add", () => {
    const luaEntity = createEntity(2)
    const entity = projectUpdates.addNewEntity(project, luaEntity, 2)!
    expect(entity).to.be.any()
    expect(entity.firstValue.name).to.be("filter-inserter")
    expect(entity.position).to.equal(pos)
    expect(entity.direction).to.be(0)

    const found = project.content.findCompatibleWithLuaEntity(luaEntity, nil, 2) as ProjectEntity<BlueprintEntity>
    expect(found).to.be(entity)

    expect(entity.getWorldEntity(2)).to.be(luaEntity)

    assertOneEntity()
    assertNewUpdated(entity)
  })

  test("addNewEntity with known value with same name", () => {
    const luaEntity = createEntity(2)
    const entity = projectUpdates.addNewEntity(project, luaEntity, 2, {
      entity_number: 1,
      direction: 0,
      position: { x: 0, y: 0 },
      name: "filter-inserter",
      neighbours: [2],
    })!
    expect(entity).to.be.any()
    expect(entity.firstValue).toEqual({
      name: "filter-inserter",
    })
    expect(entity.position).to.equal(pos)
    expect(entity.direction).to.be(0)

    const found = project.content.findCompatibleWithLuaEntity(luaEntity, nil, 2) as ProjectEntity<BlueprintEntity>
    expect(found).to.be(entity)

    expect(entity.getWorldEntity(2)).to.be(luaEntity)

    assertOneEntity()
    assertNewUpdated(entity)
  })

  test("addNewEntity with known value with different name", () => {
    const luaEntity = createEntity(2)
    const entityUpgraded = projectUpdates.addNewEntity(project, luaEntity, 2, {
      entity_number: 1,
      direction: 0,
      position: { x: 0, y: 0 },
      name: "fast-inserter",
      neighbours: [2],
    })!
    expect(entityUpgraded).to.be.any()
    expect(entityUpgraded.firstValue).toEqual({
      name: "fast-inserter",
    })
    expect(entityUpgraded.position).to.equal(pos)

    const found = project.content.findCompatibleWithLuaEntity(luaEntity, nil, 2) as ProjectEntity<BlueprintEntity>
    expect(found).to.be(entityUpgraded)

    assertOneEntity()
    assertNewUpdated(entityUpgraded)
  })
})

function addEntity(stage: StageNumber, args?: Partial<SurfaceCreateEntity>) {
  const luaEntity = createEntity(stage, args)
  const entity = projectUpdates.addNewEntity(project, luaEntity, stage) as ProjectEntity<BlueprintEntity>
  expect(entity).to.be.any()
  clearMocks()
  entity.replaceWorldEntity(stage, luaEntity)
  return { entity, luaEntity }
}

test("moving entity on preview replace", () => {
  const { entity } = addEntity(2)

  // assert(projectUpdates.moveFirstStageDownOnPreviewReplace(project, entity, 1))
  expect(projectUpdates.trySetFirstStage(project, entity, 1)).to.be(StageMoveResult.Updated)

  expect(entity.firstStage).to.equal(1)
  expect((entity.firstValue as BlueprintEntity).override_stack_size).to.be(1)
  expect(entity.hasStageDiff()).to.be(false)
  assertOneEntity()
  assertUpdateCalled(entity, 1)
})

test("tryReviveSettingsRemnant", () => {
  const { entity } = addEntity(2)
  entity.isSettingsRemnant = true

  projectUpdates.tryReviveSettingsRemnant(project, entity, 1)

  expect(entity.isSettingsRemnant).to.be.nil()
  expect(entity.firstStage).to.equal(1)
  assertOneEntity()
  assertReviveSettingsRemnantCalled(entity)
})

test("cannot tryReviveSettingsRemnant if not a remnant", () => {
  const { entity } = addEntity(2)

  expect(projectUpdates.tryReviveSettingsRemnant(project, entity, 1)).to.be(StageMoveResult.NoChange)
  assertOneEntity()
  assertWUNotCalled()
})

describe("deleteEntityOrCreateSettingsRemnant", () => {
  test("deletes normal entity", () => {
    const { entity } = addEntity(1)

    projectUpdates.deleteEntityOrCreateSettingsRemnant(project, entity)
    assertNoEntities()
    assertDeleteWorldEntityCalled(entity)
  })

  test("creates settings remnant if entity has stage diffs", () => {
    const { entity } = addEntity(1)
    entity._applyDiffAtStage(2, { override_stack_size: 2 })

    projectUpdates.deleteEntityOrCreateSettingsRemnant(project, entity)

    expect(entity.isSettingsRemnant).to.be(true)
    assertOneEntity()
    assertMakeSettingsRemnantCalled(entity)
  })

  test("creates settings remnant if entity has circuit connections", () => {
    const { entity } = addEntity(1)
    const otherEntity = createProjectEntityNoCopy({ name: "filter-inserter" }, Pos(0, 0), nil, 1)
    project.content.add(otherEntity)
    project.content.addCircuitConnection({
      fromEntity: otherEntity,
      toEntity: entity,
      fromId: 1,
      toId: 1,
      wire: wire_type.green,
    })

    projectUpdates.deleteEntityOrCreateSettingsRemnant(project, entity)
    expect(entity.isSettingsRemnant).to.be(true)
    assertNEntities(2)
    assertMakeSettingsRemnantCalled(entity)
  })

  test("deletes if entity has with circuit connections, but connections have world entity", () => {
    const { entity } = addEntity(1)
    const otherEntity = createProjectEntityNoCopy({ name: "filter-inserter" }, Pos(0, 0), nil, 1)
    project.content.add(otherEntity)
    project.content.addCircuitConnection({
      fromEntity: otherEntity,
      toEntity: entity,
      fromId: 1,
      toId: 1,
      wire: wire_type.green,
    })
    otherEntity.replaceWorldEntity(
      1,
      createEntity(1, {
        position: Pos.plus(entity.position, { x: 0, y: 1 }),
      }),
    )

    projectUpdates.deleteEntityOrCreateSettingsRemnant(project, entity)
    expect(entity.isSettingsRemnant).to.be.nil()
    assertOneEntity()
    assertDeleteWorldEntityCalled(entity)
  })
})

test("forceDeleteEntity always deletes", () => {
  const { entity } = addEntity(1)
  entity.isSettingsRemnant = true

  projectUpdates.forceDeleteEntity(project, entity)

  assertNoEntities()
  assertDeleteWorldEntityCalled(entity)
})

describe("tryUpdateEntityFromWorld", () => {
  test('with no changes returns "no-change"', () => {
    const { entity } = addEntity(2)
    const ret = projectUpdates.tryUpdateEntityFromWorld(project, entity, 2)
    expect(ret).to.be("no-change")
    assertOneEntity()
    assertWUNotCalled()
  })

  test('with change in first stage returns "updated" and updates all entities', () => {
    const { entity, luaEntity } = addEntity(2)
    luaEntity.inserter_stack_size_override = 3
    const ret = projectUpdates.tryUpdateEntityFromWorld(project, entity, 2)
    expect(ret).to.be("updated")

    expect(entity.firstValue.override_stack_size).to.be(3)

    assertOneEntity()
    assertUpdateCalled(entity, 2)
  })
  test('with change in first stage and known value returns "updated" and updates all entities', () => {
    const { entity } = addEntity(2)
    const knownValue = {
      name: "filter-inserter",
      override_stack_size: 3,
    }
    const ret = projectUpdates.tryUpdateEntityFromWorld(project, entity, 2, knownValue as BlueprintEntity)
    expect(ret).to.be("updated")

    expect(entity.firstValue.override_stack_size).to.be(3)

    assertOneEntity()
    assertUpdateCalled(entity, 2)
  })

  test("can detect rotate by pasting", () => {
    const { luaEntity, entity } = addEntity(2, {
      name: "assembling-machine-2",
      recipe: "express-transport-belt",
    })
    luaEntity.direction = defines.direction.east
    const ret = projectUpdates.tryUpdateEntityFromWorld(project, entity, 2)
    expect(ret).to.be("updated")

    expect(entity.direction).to.be(defines.direction.east)
    assertOneEntity()
    assertUpdateCalled(entity, 2)
  })

  test("forbids rotate if in higher stage than first", () => {
    const { luaEntity, entity } = addEntity(2)
    luaEntity.direction = defines.direction.east

    entity.replaceWorldEntity(3, luaEntity)
    const ret = projectUpdates.tryUpdateEntityFromWorld(project, entity, 3)
    expect(ret).to.be("cannot-rotate")
    expect(entity.direction).to.be(defines.direction.north)

    assertOneEntity()
    assertRefreshCalled(entity, 3)
  })

  test.each([false, true])("integration: in higher stage, with changes: %s", (withExistingChanges) => {
    const { luaEntity, entity } = addEntity(1)
    if (withExistingChanges) {
      entity._applyDiffAtStage(2, { override_stack_size: 2, filter_mode: "blacklist" })
      luaEntity.inserter_filter_mode = "blacklist"
    }

    luaEntity.inserter_stack_size_override = 3
    entity.replaceWorldEntity(2, luaEntity)
    const ret = projectUpdates.tryUpdateEntityFromWorld(project, entity, 2)
    expect(ret).to.be("updated")

    expect(entity.firstValue.override_stack_size).to.be(1)
    if (withExistingChanges) {
      assertStageDiffs(entity, { 2: { override_stack_size: 3, filter_mode: "blacklist" } })
    } else {
      assertStageDiffs(entity, { 2: { override_stack_size: 3 } })
    }

    assertOneEntity()
    assertUpdateCalled(entity, 2)
  })

  test("integration: updating to match removes stage diff", () => {
    const { luaEntity, entity } = addEntity(1)
    entity._applyDiffAtStage(2, { override_stack_size: 2 })
    expect(entity.hasStageDiff()).to.be(true)
    luaEntity.inserter_stack_size_override = 1

    entity.replaceWorldEntity(2, luaEntity)
    const ret = projectUpdates.tryUpdateEntityFromWorld(project, entity, 2)
    expect(ret).to.be("updated")
    expect(entity.hasStageDiff()).to.be(false)

    assertOneEntity()
    assertUpdateCalled(entity, 2)
  })
})

describe("tryRotateEntityToMatchWorld", () => {
  test("in first stage rotates all entities", () => {
    const { luaEntity, entity } = addEntity(2)
    luaEntity.direction = direction.west
    const ret = projectUpdates.tryRotateEntityToMatchWorld(project, entity, 2)
    expect(ret).to.be("updated")
    expect(entity.direction).to.be(direction.west)
    assertOneEntity()
    assertUpdateCalled(entity, 2)
  })

  test("in higher stage forbids rotation", () => {
    const { luaEntity, entity } = addEntity(1)
    const oldDirection = luaEntity.direction
    luaEntity.direction = direction.west
    entity.replaceWorldEntity(2, luaEntity)
    const ret = projectUpdates.tryRotateEntityToMatchWorld(project, entity, 2)
    expect(ret).to.be("cannot-rotate")
    expect(entity.direction).to.be(oldDirection)
    assertOneEntity()
    assertRefreshCalled(entity, 2)
  })

  test("rotating loader also sets loader type", () => {
    const { luaEntity, entity } = addEntity(1, { name: "loader", direction: direction.north, type: "input" })
    luaEntity.rotate()
    const ret = projectUpdates.tryRotateEntityToMatchWorld(project, entity, 1)
    expect(ret).to.be("updated")
    expect(entity.direction).to.be(direction.south)
    expect(entity.firstValue.type).to.be("output")
    assertOneEntity()
    assertUpdateCalled(entity, 1)
  })
})

describe("ignores assembling machine rotation if no fluid inputs", () => {
  let luaEntity: LuaEntity, entity: ProjectEntity<BlueprintEntity>
  before_each(() => {
    ;({ luaEntity, entity } = addEntity(2, {
      name: "assembling-machine-2",
      direction: defines.direction.east,
    }))

    entity.replaceWorldEntity(3, luaEntity)
    // hacky way to rotate
    luaEntity.set_recipe("express-transport-belt")
    luaEntity.direction = defines.direction.south
    luaEntity.set_recipe(nil)
    expect(luaEntity.direction).to.be(defines.direction.south)
  })
  test("using update", () => {
    const ret = projectUpdates.tryUpdateEntityFromWorld(project, entity, 3)
    expect(ret).to.be("no-change")
    expect(entity.direction).to.be(0)

    assertOneEntity()
    assertWUNotCalled()
  })
  test("using rotate", () => {
    const ret = projectUpdates.tryRotateEntityToMatchWorld(project, entity, 3)
    expect(ret).to.be("no-change")
    expect(entity.direction).to.be(0)

    assertOneEntity()
    assertWUNotCalled()
  })
  test("can change recipe and rotate", () => {
    luaEntity.set_recipe("iron-gear-wheel")
    const ret = projectUpdates.tryUpdateEntityFromWorld(project, entity, 3)
    expect(ret).to.be("updated")
    expect(entity.getValueAtStage(3)!.recipe).to.be("iron-gear-wheel")

    assertOneEntity()
    assertUpdateCalled(entity, 3)
  })
  test("disallows if has fluid inputs", () => {
    luaEntity.set_recipe("express-transport-belt")
    const ret = projectUpdates.tryUpdateEntityFromWorld(project, entity, 3)
    expect(ret).to.be("cannot-rotate")

    assertOneEntity()
    assertRefreshCalled(entity, 3)
  })
})

describe("tryApplyUpgradeTarget", () => {
  test("can apply upgrade", () => {
    const { luaEntity, entity } = addEntity(1)
    luaEntity.order_upgrade({
      force: luaEntity.force,
      target: "stack-filter-inserter",
    })
    const direction = luaEntity.direction
    const ret = projectUpdates.tryApplyUpgradeTarget(project, entity, 1)
    expect(ret).to.be("updated")
    expect(entity.firstValue.name).to.be("stack-filter-inserter")
    expect(entity.direction).to.be(direction)
    assertOneEntity()
    assertUpdateCalled(entity, 1)
  })
  test("can apply rotation", () => {
    const { luaEntity, entity } = addEntity(1)
    luaEntity.order_upgrade({
      force: luaEntity.force,
      target: luaEntity.name,
      direction: direction.west,
    })

    const ret = projectUpdates.tryApplyUpgradeTarget(project, entity, 1)
    expect(ret).to.be("updated")
    expect(entity.firstValue.name).to.be("filter-inserter")
    expect(entity.direction).to.be(direction.west)
    assertOneEntity()
    assertUpdateCalled(entity, 1)
  })
  test("upgrade to rotate forbidden", () => {
    const { luaEntity, entity } = addEntity(1)
    luaEntity.order_upgrade({
      force: luaEntity.force,
      target: luaEntity.name,
      direction: direction.west,
    })
    entity.replaceWorldEntity(2, luaEntity)
    const ret = projectUpdates.tryApplyUpgradeTarget(project, entity, 2)
    expect(ret).to.be("cannot-rotate")
    expect(entity.direction).to.be(0)
    assertOneEntity()
    assertRefreshCalled(entity, 2)
  })
  test("upgrade to rotation allowed if is assembling machine with no fluid inputs", () => {
    const { luaEntity, entity } = addEntity(1, {
      name: "assembling-machine-2",
      direction: defines.direction.east,
      recipe: "express-transport-belt",
    })
    luaEntity.set_recipe(nil)
    luaEntity.order_upgrade({
      force: luaEntity.force,
      target: "assembling-machine-3",
      direction: direction.north,
    })
    entity.replaceWorldEntity(2, luaEntity)
    const ret = projectUpdates.tryApplyUpgradeTarget(project, entity, 2)
    expect(ret).to.be("updated")
    assertOneEntity()
    assertUpdateCalled(entity, 2)
  })
})

describe("updateWiresFromWorld", () => {
  test("if saved, calls update", () => {
    const { entity } = addEntity(1)
    wireSaver.saveWireConnections.returnsOnce(true as any)
    const ret = projectUpdates.updateWiresFromWorld(project, entity, 1)
    expect(ret).to.be("updated")

    assertOneEntity()
    assertUpdateCalled(entity, 1)
  })
  test("if no changes, does not call update", () => {
    const { entity } = addEntity(1)
    wireSaver.saveWireConnections.returnsOnce(false as any)
    const ret = projectUpdates.updateWiresFromWorld(project, entity, 1)
    expect(ret).to.be("no-change")

    assertOneEntity()
    assertWUNotCalled()
  })
  test("doesn't crash if neighbor in previous stage doesn't exist", () => {
    const { entity: entity1 } = addEntity(2)
    const { entity: entity2, luaEntity: luaEntity2 } = addEntity(1, {
      position: pos.plus({ x: 1, y: 0 }),
    })
    project.content.addCircuitConnection({
      fromEntity: entity1,
      toEntity: entity2,
      fromId: 1,
      toId: 1,
      wire: defines.wire_type.green,
    })
    wireSaver.saveWireConnections.returnsOnce(true as any)
    luaEntity2.destroy()

    const ret = projectUpdates.updateWiresFromWorld(project, entity1, 2)
    expect(ret).to.be("updated")

    assertNEntities(2)
    assertUpdateCalled(entity1, 2, 1)
    assertUpdateCalled(entity2, 1, 2)
  })
  // test.todo(
  //   "if max connections exceeded, notifies and calls update",
  //   // , () => {
  //   // const { entity } = addEntity(1)
  //   // wireSaver.saveWireConnections.returnsOnce(true as any)
  //   // const ret = projectUpdates.updateWiresFromWorld(project, entity, 2)
  //   // expect(ret).to.be("max-connections-exceeded")
  //   //
  //   // assertOneEntity()
  //   // assertUpdateCalled(entity, 1, nil)
  //   // }
  // )
})

describe("trySetFirstStage", () => {
  test("can move up", () => {
    const { entity } = addEntity(1)
    const result = projectUpdates.trySetFirstStage(project, entity, 2)
    expect(result).to.be("updated")
    expect(entity.firstStage).to.be(2)
    assertOneEntity()
    assertUpdateCalled(entity, 1)
  })

  test("can move down to preview", () => {
    const { entity } = addEntity(4)
    const result = projectUpdates.trySetFirstStage(project, entity, 3)
    expect(result).to.be("updated")
    expect(entity.firstStage).to.be(3)
    assertOneEntity()
    assertUpdateCalled(entity, 3)
  })

  test("ignores settings remnants", () => {
    const { entity } = addEntity(1)
    entity.isSettingsRemnant = true
    const result = projectUpdates.trySetFirstStage(project, entity, 2)
    expect(result).to.be(StageMoveResult.NoChange)
    expect(entity.firstStage).to.be(1)
    assertOneEntity()
    assertWUNotCalled()
  })

  test("returns no-change if already at stage", () => {
    const { entity } = addEntity(1)
    const result = projectUpdates.trySetFirstStage(project, entity, 1)
    expect(result).to.be(StageMoveResult.NoChange)
  })

  test("cannot move down if will intersect another entity", () => {
    const { entity: entity1 } = addEntity(1)
    entity1.setLastStageUnchecked(2)
    const { entity: entity2 } = addEntity(3) // prevents moving up

    const result = projectUpdates.trySetFirstStage(project, entity2, 2)
    expect(result).to.be(StageMoveResult.IntersectsAnotherEntity)
  })

  test("cannot move past last stage", () => {
    const { entity } = addEntity(1)
    entity.setLastStageUnchecked(2)
    const result = projectUpdates.trySetFirstStage(project, entity, 5)
    expect(result).to.be(StageMoveResult.CannotMovePastLastStage)
  })
})

describe("trySetLastStage", () => {
  test("can move down", () => {
    const { entity } = addEntity(2)
    entity.setLastStageUnchecked(3)
    const result = projectUpdates.trySetLastStage(project, entity, 2)
    expect(result).to.be("updated")
    expect(entity.lastStage).to.be(2)
    assertOneEntity()
    assertUpdateOnLastStageChangedCalled(entity, 3)
  })
  test("can move up", () => {
    const { entity } = addEntity(2)
    entity.setLastStageUnchecked(3)
    const result = projectUpdates.trySetLastStage(project, entity, 4)
    expect(result).to.be("updated")
    expect(entity.lastStage).to.be(4)
    assertOneEntity()
    assertUpdateOnLastStageChangedCalled(entity, 3)
  })

  test("can set to nil", () => {
    const { entity } = addEntity(2)
    entity.setLastStageUnchecked(3)
    const result = projectUpdates.trySetLastStage(project, entity, nil)
    expect(result).to.be("updated")
    expect(entity.lastStage).to.be(nil)
    assertOneEntity()
    assertUpdateOnLastStageChangedCalled(entity, 3)
  })

  test("ignores settings remnants", () => {
    const { entity } = addEntity(1)
    entity.isSettingsRemnant = true
    const result = projectUpdates.trySetLastStage(project, entity, 2)
    expect(result).to.be(StageMoveResult.NoChange)
    expect(entity.lastStage).to.be(nil)
    assertOneEntity()
    assertWUNotCalled()
  })

  test("returns no-change if already at stage", () => {
    const { entity } = addEntity(1)
    entity.setLastStageUnchecked(2)
    const result = projectUpdates.trySetLastStage(project, entity, 2)
    expect(result).to.be(StageMoveResult.NoChange)
  })

  test("cannot move up if will intersect another entity", () => {
    const { entity: entity1 } = addEntity(1)
    entity1.setLastStageUnchecked(2)
    addEntity(3) // prevents moving down

    const result = projectUpdates.trySetLastStage(project, entity1, 3)
    expect(result).to.be(StageMoveResult.IntersectsAnotherEntity)
  })

  test("cannot move before first stage", () => {
    const { entity } = addEntity(1)
    entity.setLastStageUnchecked(2)
    const result = projectUpdates.trySetLastStage(project, entity, 0)
    expect(result).to.be(StageMoveResult.CannotMoveBeforeFirstStage)
  })
})

describe("undergrounds", () => {
  before_each(() => {
    game.surfaces[1].find_entities().forEach((e) => e.destroy())
  })
  function createUndergroundBelt(firstStage: StageNumber, args?: Partial<UndergroundBeltSurfaceCreateEntity>) {
    const { luaEntity, entity } = addEntity(firstStage, {
      name: "underground-belt",
      position: pos,
      direction: direction.west,
      ...args,
    })

    return { luaEntity, entity: entity as ProjectEntity<UndergroundBeltEntity> }
  }

  test("creating underground automatically sets to correct direction", () => {
    const { luaEntity } = createUndergroundBelt(1)
    luaEntity.destroy()
    const luaEntity2 = createEntity(1, {
      name: "underground-belt",
      position: Pos.plus(pos, { x: -3, y: 0 }),
      direction: direction.east,
      type: "input",
    })
    const entity = projectUpdates.addNewEntity(project, luaEntity2, 2) as ProjectEntity<UndergroundBeltEntity>
    expect(entity).to.be.any()

    expect(entity.firstValue.type).to.be("output")
    assertNEntities(2)

    assertNewUpdated(entity)
    // assert.spy(wireSaver.saveWireConnections).calledWith(project.content, entity, 1)
  })

  function createUndergroundBeltPair(
    firstStage: StageNumber,
    otherStage: StageNumber = firstStage,
  ): {
    luaEntity1: LuaEntity
    luaEntity2: LuaEntity
    entity1: ProjectEntity<UndergroundBeltEntity>
    entity2: ProjectEntity<UndergroundBeltEntity>
  } {
    const { luaEntity: luaEntity1, entity: entity1 } = createUndergroundBelt(firstStage)
    const { luaEntity: luaEntity2, entity: entity2 } = createUndergroundBelt(otherStage, {
      position: Pos.plus(pos, { x: -3, y: 0 }),
      type: "output",
    })
    return { luaEntity1, luaEntity2, entity1, entity2 }
  }

  describe("rotating", () => {
    test("lone underground belt in first stage rotates all entities", () => {
      const { luaEntity, entity } = createUndergroundBelt(1)

      const [rotated] = luaEntity.rotate()
      assert(rotated)

      const ret = projectUpdates.tryRotateEntityToMatchWorld(project, entity, 1)
      expect(ret).to.be("updated")

      expect(entity.firstValue.type).to.be("output")
      expect(entity.direction).to.be(direction.east)

      assertOneEntity()
      assertUpdateCalled(entity, 1)
    })

    test("lone underground belt in higher stage forbids rotation", () => {
      const { luaEntity, entity } = createUndergroundBelt(1)

      const [rotated] = luaEntity.rotate()
      assert(rotated)

      entity.replaceWorldEntity(2, luaEntity)
      const ret = projectUpdates.tryRotateEntityToMatchWorld(project, entity, 2)
      expect(ret).to.be("cannot-rotate")

      expect(entity.firstValue.type).to.be("input")
      expect(entity.direction).to.be(direction.west)

      assertOneEntity()
      assertResetUndergroundRotationCalled(entity, 2)
    })

    test.each(["lower", "higher"])("%s underground in first stage rotates pair", (which) => {
      const { entity1, entity2 } = createUndergroundBeltPair(1, 2)

      const entity = which == "lower" ? entity1 : entity2
      const [rotated] = entity.getWorldEntity(entity.firstStage)!.rotate()
      assert(rotated)

      const ret = projectUpdates.tryRotateEntityToMatchWorld(project, entity, entity.firstStage)
      expect(ret).to.be("updated")

      expect(entity1).toMatchTable({
        firstValue: { type: "output" },
        direction: direction.east,
      })
      expect(entity2).toMatchTable({
        firstValue: { type: "input" },
        direction: direction.east,
      })

      assertNEntities(2)
      assertUpdateCalled(entity1, 1, which == "lower" ? 1 : 2, false)
      assertUpdateCalled(entity2, 2, which == "lower" ? 2 : 1, false)
    })

    test("cannot rotate if not in first stage", () => {
      const { entity1, entity2, luaEntity1 } = createUndergroundBeltPair(2, 1)

      const [rotated1] = luaEntity1.rotate()
      assert(rotated1)

      entity1.replaceWorldEntity(3, luaEntity1)
      const ret = projectUpdates.tryRotateEntityToMatchWorld(project, entity1, 3)
      expect(ret).to.be("cannot-rotate")

      expect(entity1).toMatchTable({
        firstValue: { type: "input" },
        direction: direction.west,
      })
      expect(entity2).toMatchTable({
        firstValue: { type: "output" },
        direction: direction.west,
      })

      assertNEntities(2)
      assertResetUndergroundRotationCalled(entity1, 3)
    })
  })

  describe("upgrading", () => {
    moduleMock(_worldListener, true)

    test("can upgrade underground in first stage", () => {
      const { luaEntity, entity } = createUndergroundBelt(1)
      luaEntity.order_upgrade({
        target: "fast-underground-belt",
        force: luaEntity.force,
      })
      const ret = projectUpdates.tryApplyUpgradeTarget(project, entity, 1)
      expect(ret).to.be("updated")

      expect(entity.firstValue.name).to.be("fast-underground-belt")
      expect(entity.firstValue.type).to.be("input")
      expect(entity.direction).to.be(direction.west)
      assertOneEntity()
      assertUpdateCalled(entity, 1)
    })

    test("can upgrade underground in higher stage", () => {
      const { luaEntity, entity } = createUndergroundBelt(1)
      luaEntity.order_upgrade({
        target: "fast-underground-belt",
        force: luaEntity.force,
      })
      entity.replaceWorldEntity(2, luaEntity)
      const ret = projectUpdates.tryApplyUpgradeTarget(project, entity, 2)
      expect(ret).to.be("updated")

      expect(entity.getValueAtStage(2)?.name).to.be("fast-underground-belt")
      expect(entity.firstValue.type).to.be("input")

      assertOneEntity()
      assertUpdateCalled(entity, 2)
    })

    test("can apply rotate via upgrade to underground belt", () => {
      const { luaEntity, entity } = createUndergroundBelt(1)
      luaEntity.order_upgrade({
        target: "underground-belt",
        force: luaEntity.force,
        direction: oppositedirection(luaEntity.direction),
      })
      const ret = projectUpdates.tryApplyUpgradeTarget(project, entity, 1)
      expect(ret).to.be("updated")

      expect(entity).toMatchTable({
        firstValue: {
          name: "underground-belt",
          type: "output",
        },
        direction: direction.east,
      })
      assertOneEntity()
      assertUpdateCalled(entity, 1)
    })
    test("can both rotate and upgrade", () => {
      const { luaEntity, entity } = createUndergroundBelt(1)
      luaEntity.order_upgrade({
        target: "fast-underground-belt",
        force: luaEntity.force,
        direction: oppositedirection(luaEntity.direction),
      })
      const ret = projectUpdates.tryApplyUpgradeTarget(project, entity, 1)
      expect(ret).to.be("updated")

      expect(entity).toMatchTable({
        firstValue: {
          name: "fast-underground-belt",
          type: "output",
        },
        direction: direction.east,
      })
      assertOneEntity()
      assertUpdateCalled(entity, 1)
    })
    test("if not in first stage, forbids both rotate and upgrade", () => {
      const { luaEntity, entity } = createUndergroundBelt(1)
      luaEntity.order_upgrade({
        target: "fast-underground-belt",
        force: luaEntity.force,
        direction: oppositedirection(luaEntity.direction),
      })
      entity.replaceWorldEntity(2, luaEntity)
      const ret = projectUpdates.tryApplyUpgradeTarget(project, entity, 2)
      expect(ret).to.be("cannot-rotate")

      expect(entity).toMatchTable({
        firstValue: {
          name: "underground-belt",
          type: "input",
        },
        direction: direction.west,
      })

      assertOneEntity()
      assertResetUndergroundRotationCalled(entity, 2)
    })

    test.each(["lower", "pair in higher", "self in higher"])(
      "upgrading underground %s stage upgrades pair",
      (which) => {
        const endStage = which == "lower" ? 1 : 2
        const { entity1, entity2, luaEntity1, luaEntity2 } = createUndergroundBeltPair(1, 2)
        const entity = which == "pair in higher" ? entity2 : entity1
        const luaEntity = which == "pair in higher" ? luaEntity2 : luaEntity1
        luaEntity.order_upgrade({
          target: "fast-underground-belt",
          force: luaEntity.force,
        })
        entity.replaceWorldEntity(endStage, luaEntity)
        const ret = projectUpdates.tryApplyUpgradeTarget(project, entity, endStage)
        expect(ret).to.be("updated")

        expect(entity1).toMatchTable({
          firstValue: { name: "fast-underground-belt", type: "input" },
          direction: direction.west,
        })
        expect(entity2).toMatchTable({
          firstValue: { name: "fast-underground-belt", type: "output" },
          direction: direction.west,
        })

        assertNEntities(2)
        assertUpdateCalled(entity1, 1, luaEntity == luaEntity1 ? 1 : 2, false)
        assertUpdateCalled(entity2, 2, luaEntity == luaEntity1 ? 2 : 1, false)
      },
    )

    test("cannot upgrade underground if it would change pair", () => {
      const { luaEntity1, entity1, entity2 } = createUndergroundBeltPair(1, 1)
      const { entity: entity3 } = createUndergroundBelt(1, {
        position: Pos.plus(pos, { x: -2, y: 0 }),
        name: "fast-underground-belt",
      })
      luaEntity1.order_upgrade({
        target: "fast-underground-belt",
        force: luaEntity1.force,
      })

      const ret = projectUpdates.tryApplyUpgradeTarget(project, entity1, 1)
      expect(ret).to.be("cannot-upgrade-changed-pair")

      expect(entity1.firstValue.name).to.be("underground-belt")
      expect(entity2.firstValue.name).to.be("underground-belt")
      expect(entity3.firstValue.name).to.be("fast-underground-belt")

      assertNEntities(3)
      assertRefreshCalled(entity1, 1)
      assertRefreshCalled(entity2, 1)
    })

    test("cannot upgrade underground if it would break existing pair", () => {
      const { entity1, entity2 } = createUndergroundBeltPair(1, 1)
      const { entity: entity3, luaEntity: luaEntity3 } = createUndergroundBelt(1, {
        position: Pos.plus(pos, { x: -2, y: 0 }),
        name: "fast-underground-belt",
      })
      // downgrading entity3 would cut the pair
      luaEntity3.order_upgrade({
        target: "underground-belt",
        force: luaEntity3.force,
      })
      const ret = projectUpdates.tryApplyUpgradeTarget(project, entity3, 1)
      expect(ret).to.be("cannot-upgrade-changed-pair")

      expect(entity1.firstValue.name).to.be("underground-belt")
      expect(entity2.firstValue.name).to.be("underground-belt")
      expect(entity3.firstValue.name).to.be("fast-underground-belt")

      assertNEntities(3)
      assertRefreshCalled(entity3, 1)
    })
    test("if rotate allowed but not upgrade, still does rotate", () => {
      const { entity1, luaEntity1, entity2 } = createUndergroundBeltPair(1, 1)
      // just to forbid upgrade
      createUndergroundBelt(1, {
        position: Pos.plus(pos, { x: -2, y: 0 }),
        name: "fast-underground-belt",
      })
      luaEntity1.order_upgrade({
        target: "fast-underground-belt",
        force: luaEntity1.force,
        direction: oppositedirection(luaEntity1.direction),
      })

      const ret = projectUpdates.tryApplyUpgradeTarget(project, entity1, 1)
      expect(ret).to.be(EntityUpdateResult.CannotUpgradeChangedPair)

      expect(entity1).toMatchTable({
        firstValue: { name: "underground-belt", type: "output" },
        direction: direction.east,
      })
      expect(entity2).toMatchTable({
        firstValue: { name: "underground-belt", type: "input" },
        direction: direction.east,
      })

      assertNEntities(3)
      assertUpdateCalled(entity1, 1, 1, false)
      assertUpdateCalled(entity2, 1, 2, false)
    })
  })
  test("fast replace to upgrade also upgrades pair", () => {
    const { luaEntity1, entity1, entity2 } = createUndergroundBeltPair(1, 1)
    const newEntity = luaEntity1.surface.create_entity({
      name: "fast-underground-belt",
      direction: luaEntity1.direction,
      position: luaEntity1.position,
      force: luaEntity1.force,
      type: luaEntity1.belt_to_ground_type,
      fast_replace: true,
    })!
    expect(newEntity).to.be.any()
    entity1.replaceWorldEntity(1, newEntity)

    const ret = projectUpdates.tryUpdateEntityFromWorld(project, entity1, 1)
    expect(ret).to.be("updated")

    expect(entity1).toMatchTable({
      firstValue: { name: "fast-underground-belt", type: "input" },
      direction: direction.west,
    })
    expect(entity2).toMatchTable({
      firstValue: { name: "fast-underground-belt", type: "output" },
      direction: direction.west,
    })

    assertNEntities(2)
    assertUpdateCalled(entity1, 1, 1, false)
    assertUpdateCalled(entity2, 1, 2, false)
  })

  test("rotating to fix direction updates all entities", () => {
    const { luaEntity, entity } = createUndergroundBelt(1)
    luaEntity.rotate()
    expect(entity.hasErrorAt(1)).toBe(true)
    luaEntity.rotate()
    expect(entity.hasErrorAt(1)).toBe(false)
    const ret = projectUpdates.tryRotateEntityToMatchWorld(project, entity, 1)
    expect(ret).toBe(EntityUpdateResult.NoChange)

    assertOneEntity()
    assertUpdateCalled(entity, 1)
  })
  test("updating to fix direction updates all entities", () => {
    const { luaEntity, entity } = createUndergroundBelt(1)
    luaEntity.rotate()
    expect(entity.hasErrorAt(1)).toBe(true)
    luaEntity.rotate()
    expect(entity.hasErrorAt(1)).toBe(false)
    const ret = projectUpdates.tryUpdateEntityFromWorld(project, entity, 1)
    expect(ret).toBe(EntityUpdateResult.NoChange)

    assertOneEntity()
    assertUpdateCalled(entity, 1)
  })
  test("upgrade rotating to fix direction applies upgrade and updates entities", () => {
    const { luaEntity, entity } = createUndergroundBelt(1)
    luaEntity.rotate()
    expect(entity.hasErrorAt(1)).toBe(true)

    luaEntity.order_upgrade({
      target: "underground-belt",
      force: luaEntity.force,
      direction: direction.west,
    })
    worldUpdater.updateWorldEntities.invokes((_, pEntity, stage) => {
      if (entity == pEntity && stage == 1) {
        luaEntity.rotate()
      }
      worldUpdaterCalls++
    })

    const ret = projectUpdates.tryApplyUpgradeTarget(project, entity, 1)
    expect(ret).toBe(EntityUpdateResult.NoChange)

    expect(luaEntity.direction).toBe(direction.west)
    expect(luaEntity.direction).toBe(entity.direction)

    assertOneEntity()
    assertUpdateCalled(entity, 1)
  })

  test("rotate a broken underground at higher stage fixes underground, if pair is correct", () => {
    const { luaEntity1, entity1, luaEntity2, entity2 } = createUndergroundBeltPair(1, 1)
    entity1.replaceWorldEntity(2, luaEntity1)
    entity2.replaceWorldEntity(2, luaEntity2)

    luaEntity2.rotate()
    expect(entity2.hasErrorAt(2)).toBe(true)
    luaEntity2.rotate()
    expect(entity2.hasErrorAt(2)).toBe(false)

    const ret = projectUpdates.tryRotateEntityToMatchWorld(project, entity2, 2)
    expect(ret).toBe(EntityUpdateResult.NoChange)
    assertUpdateCalled(entity2, 1, 1, false)
    assertUpdateCalled(entity1, 1, 2, false)

    assertNEntities(2)
  })
  test.each(["self", "pair"])("rotating a broken underground fixes pair if %s in first stage", (which) => {
    const { luaEntity1, entity1, luaEntity2, entity2 } = createUndergroundBeltPair(
      which == "pair" ? 2 : 1,
      which == "pair" ? 1 : 2,
    )
    entity1.replaceWorldEntity(2, luaEntity1)
    entity2.replaceWorldEntity(2, luaEntity2)
    // break entity2
    entity2.direction = direction.east
    entity2.setTypeProperty("input")
    expect(entity2.hasErrorAt(2)).toBe(true)

    assert(luaEntity2.rotate())

    const ret = projectUpdates.tryRotateEntityToMatchWorld(project, entity2, 2)
    expect(ret).toBe(EntityUpdateResult.Updated)

    expect(entity1).toMatchTable({
      direction: direction.east,
      firstValue: { type: "output" },
    })
    expect(entity2).toMatchTable({
      direction: direction.east,
      firstValue: { type: "input" },
    })

    assertUpdateCalled(entity2, entity2.firstStage, 1, false)
    assertUpdateCalled(entity1, entity1.firstStage, 2, false)

    assertNEntities(2)
  })
  test("rotating a broken underground that changes pair disallowed if not first stage", () => {
    const { luaEntity1, entity1, luaEntity2, entity2 } = createUndergroundBeltPair(1, 1)
    entity1.replaceWorldEntity(2, luaEntity1)
    entity2.replaceWorldEntity(2, luaEntity2)
    // break entity2
    entity2.direction = direction.east
    entity2.setTypeProperty("input")
    expect(entity2.hasErrorAt(2)).toBe(true)

    assert(luaEntity2.rotate())

    const ret = projectUpdates.tryRotateEntityToMatchWorld(project, entity2, 2)
    expect(ret).toBe(EntityUpdateResult.CannotRotate)
    // assert rotated back
    expect(luaEntity2).toMatchTable({
      direction: direction.west,
      belt_to_ground_type: "output",
    })

    assertNEntities(2)
    assertWUNotCalled()
  })
})

describe("rolling stock", () => {
  let rollingStock: LuaEntity
  before_each(() => {
    game.surfaces[1].find_entities().forEach((e) => e.destroy())
    rollingStock = createRollingStock()
  })
  function addEntity() {
    const result = projectUpdates.addNewEntity(project, rollingStock, 1)
    clearMocks()
    return result
  }
  test("can save rolling stock", () => {
    const result = projectUpdates.addNewEntity(project, rollingStock, 1)!
    expect(result).to.be.any()
    expect(result.firstValue.name).to.be("locomotive")

    assertNEntities(1)

    const found = project.content.findCompatibleByProps(rollingStock.name, rollingStock.position, nil, 1)!
    expect(found).to.be.any()
    expect(found).to.be(result)

    const foundDirectly = project.content.findCompatibleWithLuaEntity(rollingStock, nil, 1)
    expect(foundDirectly).to.be.any()
    expect(foundDirectly).to.be(found)

    assertNewUpdated(result)
  })

  test("no update on rolling stock", () => {
    const entity = addEntity()!

    projectUpdates.tryUpdateEntityFromWorld(project, entity, 1)

    assertNEntities(1)
    assertWUNotCalled()
  })
})

describe("trains", () => {
  let entities: LuaEntity[]
  let projectEntities: RollingStockProjectEntity[]
  before_each(() => {
    game.surfaces[1].find_entities().forEach((e) => e.destroy())
    entities = createRollingStocks(game.surfaces[1], "locomotive", "cargo-wagon", "fluid-wagon")
    projectEntities = entities.map((e) => {
      const aEntity = createProjectEntityNoCopy(
        {
          name: e.name,
          orientation: e.orientation,
        },
        e.position,
        nil,
        1,
      )
      aEntity.replaceWorldEntity(1, e)
      project.content.add(aEntity)
      e.connect_rolling_stock(defines.rail_direction.front)
      return aEntity
    })
  })
  test("resetTrainLocation", () => {
    const anEntity = projectEntities[1]
    projectUpdates.resetTrain(project, anEntity)

    assertReplaceCalled(projectEntities[0], 1)
    assertReplaceCalled(projectEntities[1], 1)
    assertReplaceCalled(projectEntities[2], 1)
    assertNEntities(3)
  })
  test("setTrainLocationToCurrent", () => {
    entities[0].train!.speed = 10
    after_ticks(10, () => {
      const anEntity = projectEntities[1]
      projectUpdates.setTrainLocationToCurrent(project, anEntity)

      for (let i = 0; i < 3; i++) {
        expect(projectEntities[i].position).to.equal(entities[i].position)
      }
      assertReplaceCalled(projectEntities[0], 1)
      assertReplaceCalled(projectEntities[1], 1)
      assertReplaceCalled(projectEntities[2], 1)
      assertNEntities(3)
    })
  })
})
