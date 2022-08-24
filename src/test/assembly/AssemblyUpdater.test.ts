/*
 * Copyright (c) 2022 GlassBricks
 * This file is part of BBPP3.
 *
 * BBPP3 is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * BBPP3 is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with BBPP3. If not, see <https://www.gnu.org/licenses/>.
 */

import { createMockAssemblyContent } from "../../assembly/Assembly-mock"
import { AssemblyContent, StagePosition } from "../../assembly/AssemblyContent"
import { AssemblyUpdater, createAssemblyUpdater, WorldNotifier } from "../../assembly/AssemblyUpdater"
import { WireSaver } from "../../assembly/WireHandler"
import { WorldUpdater } from "../../assembly/WorldUpdater"
import { Prototypes } from "../../constants"
import { AssemblyEntity, StageDiffs, StageNumber } from "../../entity/AssemblyEntity"
import { AssemblyWireConnection, wireConnectionEquals } from "../../entity/AssemblyWireConnection"
import { Entity } from "../../entity/Entity"
import { _overrideEntityCategory } from "../../entity/entity-info"
import { createMockEntitySaver } from "../../entity/EntityHandler-mock"
import { ContextualFun, Mutable } from "../../lib"
import { Pos } from "../../lib/geometry"
import { L_Interaction } from "../../locale"
import { entityMock, simpleMock } from "../simple-mock"
import direction = defines.direction
import wire_type = defines.wire_type

const pos = Pos(10.5, 10.5)

let assembly: AssemblyContent
let stage: Mutable<StagePosition>

let assemblyUpdater: AssemblyUpdater
let worldUpdater: mock.Stubbed<WorldUpdater>
let wireSaver: mock.Stubbed<WireSaver>
let worldNotifier: mock.Mocked<WorldNotifier>
before_all(() => {
  _overrideEntityCategory("test", "test")
  _overrideEntityCategory("test2", "test")
})

let totalCalls: number
before_each(() => {
  assembly = createMockAssemblyContent(1)
  stage = assembly.getStage(1)!
  totalCalls = 0
  function spyFn<F extends ContextualFun>(): F {
    return stub<F>().invokes((() => {
      totalCalls++
    }) as F)
  }
  worldUpdater = {
    updateWorldEntities: spyFn(),
    forceDeleteEntity: spyFn(),
    deleteWorldEntities: spyFn(),
    deleteWorldEntitiesInStage: spyFn(),
    deleteExtraEntitiesOnly: spyFn(),
    makeSettingsRemnant: spyFn(),
    reviveSettingsRemnant: spyFn(),
  }
  wireSaver = {
    getWireConnectionDiff: stub<WireSaver["getWireConnectionDiff"]>().invokes(() => $multi([], [])),
  }
  worldNotifier = {
    createNotification: spy(),
  }
  assemblyUpdater = createAssemblyUpdater(worldUpdater, createMockEntitySaver(), wireSaver, worldNotifier)
})

interface TestEntity extends Entity {
  readonly name: string
  prop1?: number
  prop2?: string
}
function createEntity(args?: Partial<LuaEntity>): LuaEntity & TestEntity {
  return entityMock<LuaEntity & TestEntity>({
    name: "test",
    position: pos,
    prop1: 2,
    prop2: "val1",
    ...args,
  })
}

function addEntity(args?: Partial<LuaEntity>) {
  const entity = createEntity(args)
  assemblyUpdater.onEntityCreated(assembly, entity, stage)
  const found = assembly.content.findCompatible(entity, entity.position, nil) as AssemblyEntity<TestEntity> | nil
  assert(found)
  return { luaEntity: entity, added: found! }
}

function addAndReset(addedNum: StageNumber = stage.stageNumber, setNum = stage.stageNumber, args?: Partial<LuaEntity>) {
  stage.stageNumber = addedNum
  const ret = addEntity(args)
  stage.stageNumber = setNum
  mock.clear(worldUpdater)
  totalCalls = 0
  return ret
}

let eventsAsserted = false
let entitiesAsserted = false
let notificationsAsserted = false
before_each(() => {
  eventsAsserted = false
  entitiesAsserted = false
  notificationsAsserted = false
})
after_each(() => {
  assert(eventsAsserted, "events not asserted")
  assert(entitiesAsserted, "entities not asserted")
  if (!notificationsAsserted)
    assert.message("unexpected notification").spy(worldNotifier.createNotification).not_called()
})

function assertNoCalls() {
  if (totalCalls !== 0) {
    for (const [key, spy] of pairs(worldUpdater)) {
      assert
        .message(`${key} called`)
        .spy(spy as any)
        .not_called()
    }
  }
  eventsAsserted = true
}

function assertUpdateCalled(
  entity: AssemblyEntity<TestEntity>,
  startStage: StageNumber,
  endStage: StageNumber | nil,
  replace: boolean,
) {
  eventsAsserted = true
  assert.equal(1, totalCalls, "called once")
  const spy = worldUpdater.updateWorldEntities as spy.Spy<WorldUpdater["updateWorldEntities"]>
  assert.spy(spy).called(1)
  const refs = spy.calls[0].refs as any[]
  const [cAssembly, cEntity, cStartStage, cEndStage, cReplace] = table.unpack(refs, 1, 5)
  assert.equal(assembly, cAssembly)
  assert.equal(entity, cEntity)
  assert.equal(startStage, cStartStage, "start stage")
  assert.equal(endStage, cEndStage, "end stage")
  if (replace) assert.true(cReplace, "replace")
  else assert.falsy(cReplace, "replace")
}
function assertDeleteAllEntitiesCalled(entity: AssemblyEntity<TestEntity>) {
  eventsAsserted = true
  assert.equal(1, totalCalls)
  assert.spy(worldUpdater.deleteWorldEntities).called_with(match.ref(entity))
}
function assertForceDeleteCalled(entity: AssemblyEntity<TestEntity>, stage: StageNumber) {
  eventsAsserted = true
  assert.equal(1, totalCalls)
  assert.spy(worldUpdater.forceDeleteEntity).called_with(match.ref(assembly), match.ref(entity), stage)
}
function assertMakeSettingsRemnantCalled(entity: AssemblyEntity<TestEntity>) {
  eventsAsserted = true
  assert.equal(1, totalCalls)
  assert.spy(worldUpdater.makeSettingsRemnant).called_with(assembly, entity)
}
function assertReviveSettingsRemnantCalled(entity: AssemblyEntity<TestEntity>) {
  eventsAsserted = true
  assert.equal(1, totalCalls)
  assert.spy(worldUpdater.reviveSettingsRemnant).called_with(assembly, entity)
}

function assertOneEntity() {
  assert.equal(1, assembly.content.countNumEntities(), "has one entity")
  entitiesAsserted = true
}
function assertNEntities(n: number) {
  assert.equal(n, assembly.content.countNumEntities(), `has ${n} entities`)
  entitiesAsserted = true
}

function assertNoEntities() {
  assert.same(0, assembly.content.countNumEntities(), "has no entities")
  entitiesAsserted = true
}

function assertNotified(entity: LuaEntity, message: LocalisedString) {
  assert.false(notificationsAsserted, "notifications already asserted")
  assert.spy(worldNotifier.createNotification).called(1)
  assert.spy(worldNotifier.createNotification).called_with(match.ref(entity), message)
  notificationsAsserted = true
}

function assertStageDiffs(entity: AssemblyEntity, changes: StageDiffs<TestEntity>) {
  assert.same(changes, entity._getStageDiffs())
}

function assertAdded(added: AssemblyEntity<TestEntity>, luaEntity: LuaEntity): void {
  assert.not_nil(added)
  assert.equal("test", added.getFirstValue().name)
  assert.same(pos, added.position)
  assert.nil(added.direction)

  assert.equal(luaEntity, added.getWorldEntity(stage.stageNumber))

  assertOneEntity()
  assertUpdateCalled(added, 1, nil, false)
}

describe("add", () => {
  test("updates all stages", () => {
    const { added, luaEntity } = addEntity()
    assertAdded(added, luaEntity)
  })

  test.each([1, 2], "at same or higher stage updates the newly added entity, added stage: %d", (stageNumber) => {
    const { luaEntity, added } = addAndReset(1, stageNumber)
    assemblyUpdater.onEntityCreated(assembly, luaEntity, stage)
    assertOneEntity()
    assertUpdateCalled(added, stageNumber, stageNumber, false)
  })

  test.each([false, true])("add at lower stage does all behaviors, with stage diffs: %s", (withChanges) => {
    const { added } = addAndReset(3, 1)
    const newEntity = createEntity()
    if (withChanges) {
      newEntity.prop1 = 3
      newEntity.direction = defines.direction.east
    }
    assemblyUpdater.onEntityCreated(assembly, newEntity, stage) // again
    // updates entity
    assert.equal(newEntity, added.getWorldEntity(1))
    assert.same(1, added.getFirstStage())
    // does not create stage diffs
    assert.equal(2, added.getFirstValue().prop1)
    assert.false(added.hasStageDiff())
    // calls updateWorldEntities
    assertOneEntity()
    assertUpdateCalled(added, 1, 3, true)
    // records old stage
    assert.equal(3, added.getOldStage())
    // creates notification
    assertNotified(newEntity, [L_Interaction.EntityMovedFromStage, "mock stage 3"])
  })
})

describe("delete", () => {
  test("not in assembly does nothing", () => {
    const entity = createEntity()
    assemblyUpdater.onEntityDeleted(assembly, entity, stage)
    assertNoEntities()
    assertNoCalls()
  })

  test("in stage below base does nothing (bug)", () => {
    const { luaEntity } = addAndReset(2, 1)
    assemblyUpdater.onEntityDeleted(assembly, luaEntity, stage)
    assertOneEntity()
    assertNoCalls()
  })

  test("in stage above base forbids deletion", () => {
    const { luaEntity, added } = addAndReset(1, 2)
    assemblyUpdater.onEntityDeleted(assembly, luaEntity, stage)
    assertOneEntity()
    assertUpdateCalled(added, 2, 2, true)
  })

  test("in first stage deletes entity", () => {
    const { luaEntity, added } = addAndReset()
    assemblyUpdater.onEntityDeleted(assembly, luaEntity, stage)
    assert.falsy(added.isSettingsRemnant)
    assertNoEntities()
    assertDeleteAllEntitiesCalled(added)
  })

  test("in first stage with oldStage moves back to old stage", () => {
    const { luaEntity, added } = addAndReset(3, 2)
    added.moveToStage(2, true)
    assemblyUpdater.onEntityDeleted(assembly, luaEntity, stage)
    assert.falsy(added.isSettingsRemnant)
    assertOneEntity()
    assertUpdateCalled(added, 2, 3, false)
    assert.nil(added.getOldStage())
    assertNotified(luaEntity, [L_Interaction.EntityMovedBackToStage, "mock stage 3"])
  })

  test("in first stage with updates creates settings remnant", () => {
    const { luaEntity, added } = addAndReset()
    added._applyDiffAtStage(2, { prop1: 3 })
    assemblyUpdater.onEntityDeleted(assembly, luaEntity, stage)
    assertOneEntity()
    assert.true(added.isSettingsRemnant)
    assertMakeSettingsRemnantCalled(added)
  })
})

test("force delete", () => {
  const { luaEntity, added } = addAndReset(1, 2)
  assemblyUpdater.onEntityForceDeleted(assembly, luaEntity, stage)
  assertOneEntity()
  assertForceDeleteCalled(added, 2)
})

describe("revive", () => {
  test.each([1, 2, 3, 4, 5, 6], "settings remnant 1->3->5, revive at stage %d", (reviveStage) => {
    const { luaEntity, added } = addAndReset(1, reviveStage)
    added._applyDiffAtStage(3, { prop1: 3 })
    added._applyDiffAtStage(5, { prop1: 4 })
    added.isSettingsRemnant = true

    assemblyUpdater.onEntityCreated(assembly, luaEntity, stage)
    assert.equal(luaEntity, added.getWorldEntity(reviveStage))
    assert.falsy(added.isSettingsRemnant)
    assert.equal(added.getFirstStage(), reviveStage)

    if (reviveStage >= 5) {
      assert.equal(4, added.getFirstValue().prop1)
      assert.false(added.hasStageDiff())
    } else if (reviveStage >= 3) {
      assert.equal(3, added.getFirstValue().prop1)
      assertStageDiffs(added, { 5: { prop1: 4 } })
    } else {
      assert.equal(2, added.getFirstValue().prop1)
      assertStageDiffs(added, { 3: { prop1: 3 }, 5: { prop1: 4 } })
    }

    assertOneEntity()
    assertReviveSettingsRemnantCalled(added)
  })

  test.each([false, true], "settings remnant 2->3, revive at stage 1, with changes: %s", (withChanges) => {
    const { luaEntity, added } = addAndReset(2, 1)
    added._applyDiffAtStage(3, { prop1: 3 })
    added.isSettingsRemnant = true

    if (withChanges) luaEntity.prop1 = 1

    assemblyUpdater.onEntityCreated(assembly, luaEntity, stage)
    assert.falsy(added.isSettingsRemnant)
    assert.equal(added.getFirstStage(), 1)

    assert.equal(2, added.getFirstValue().prop1)
    assertStageDiffs(added, { 3: { prop1: 3 } })

    assertOneEntity()
    assertReviveSettingsRemnantCalled(added)
  })
})

describe("update", () => {
  test("non-existent defaults to add behavior (bug)", () => {
    const entity = createEntity()
    assemblyUpdater.onEntityPotentiallyUpdated(assembly, entity, stage)
    const added = assembly.content.findCompatibleBasic("test", pos, nil) as AssemblyEntity<TestEntity>
    assertAdded(added, entity)
  })

  test("with no changes does nothing", () => {
    const { luaEntity } = addAndReset()
    assemblyUpdater.onEntityPotentiallyUpdated(assembly, luaEntity, stage)
    assertOneEntity()
    assertNoCalls()
  })

  test("in lower than first stage defaults to add below behavior (bug)", () => {
    const { luaEntity, added } = addAndReset(3, 1)
    assemblyUpdater.onEntityPotentiallyUpdated(assembly, luaEntity, stage)
    assert.equal(luaEntity, added.getWorldEntity(1))
    assertOneEntity()
    assertUpdateCalled(added, 1, 3, true)
    notificationsAsserted = true // skip
  })

  test("in first stage updates all entities", () => {
    const { luaEntity, added } = addAndReset(2, 2)
    luaEntity.prop1 = 3
    assemblyUpdater.onEntityPotentiallyUpdated(assembly, luaEntity, stage)
    assert.equal(3, added.getFirstValue().prop1)

    assertOneEntity()
    assertUpdateCalled(added, 2, nil, false)
  })

  test.each([false, true])(
    "in higher stage updates assembly.content and entities, with existing changes: %s",
    (withExistingChanges) => {
      const { luaEntity, added } = addAndReset(1, 2)
      if (withExistingChanges) {
        added._applyDiffAtStage(2, { prop1: 5, prop2: "val2" })
        luaEntity.prop2 = "val2" // not changed
      }

      luaEntity.prop1 = 3 // changed
      assemblyUpdater.onEntityPotentiallyUpdated(assembly, luaEntity, stage)
      assert.equal(2, added.getFirstValue().prop1)
      if (withExistingChanges) {
        assertStageDiffs(added, { 2: { prop1: 3, prop2: "val2" } })
      } else {
        assertStageDiffs(added, { 2: { prop1: 3 } })
      }

      assertOneEntity()
      assertUpdateCalled(added, 2, nil, false)
    },
  )

  test("updating match previous stage removes stage diffs", () => {
    const { luaEntity, added } = addAndReset(1, 2)
    added._applyDiffAtStage(2, { prop1: 5 })
    assert.true(added.hasStageDiff())
    luaEntity.prop1 = 2
    assemblyUpdater.onEntityPotentiallyUpdated(assembly, luaEntity, stage)

    assertOneEntity()
    assertUpdateCalled(added, 2, nil, false)
  })
})

describe("rotate", () => {
  test("in first stage rotates all entities", () => {
    const { luaEntity, added } = addAndReset(2, 2)
    const oldDirection = luaEntity.direction
    luaEntity.direction = direction.west
    assemblyUpdater.onEntityRotated(assembly, luaEntity, stage, oldDirection)
    assert.equal(direction.west, added.direction)
    assertOneEntity()
    assertUpdateCalled(added, 1, nil, false)
  })

  test("in higher stage forbids rotation", () => {
    const { luaEntity, added } = addAndReset(1, 2)
    const oldDirection = luaEntity.direction
    luaEntity.direction = direction.west
    assemblyUpdater.onEntityRotated(assembly, luaEntity, stage, oldDirection)
    assert.equal(oldDirection, added.direction ?? 0)
    assertOneEntity()
    assertUpdateCalled(added, 2, 2, false)
    assertNotified(luaEntity, [L_Interaction.CannotRotateEntity])
  })
})

describe("fast replace", () => {
  test("fast replace sets world entity and calls update", () => {
    const { luaEntity, added } = addAndReset()
    const newEntity = createEntity({ name: "test2" })
    luaEntity.destroy()
    assemblyUpdater.onEntityPotentiallyUpdated(assembly, newEntity, stage)
    assert.equal(newEntity, added.getWorldEntity(1))
    assertOneEntity()
    assertUpdateCalled(added, 1, nil, false)
  })
  test("fast replace with new direction sets world entity and calls update", () => {
    const { luaEntity, added } = addAndReset()
    const oldDirection = luaEntity.direction
    const newEntity = createEntity({ name: "test2", direction: direction.west })
    luaEntity.destroy()
    assemblyUpdater.onEntityPotentiallyUpdated(assembly, newEntity, stage, oldDirection)
    assert.equal(newEntity, added.getWorldEntity(1))
    assertOneEntity()
    assertUpdateCalled(added, 1, nil, false)
  })
  test("fast replace with forbidden rotation", () => {
    const { luaEntity, added } = addAndReset(1, 2)
    const oldDirection = luaEntity.direction
    const newEntity = createEntity({ name: "test2", direction: direction.west })
    luaEntity.destroy()
    assemblyUpdater.onEntityPotentiallyUpdated(assembly, newEntity, stage, oldDirection)
    assert.equal(oldDirection, added.direction ?? 0)
    assertOneEntity()
    assertUpdateCalled(added, 2, 2, false)
    assertNotified(newEntity, [L_Interaction.CannotRotateEntity])
  })
})

describe("mark for upgrade", () => {
  test("upgrade to new value", () => {
    const { luaEntity, added } = addAndReset()
    rawset(luaEntity, "get_upgrade_target", () => simpleMock<LuaEntityPrototype>({ name: "test2" }))
    rawset(luaEntity, "get_upgrade_direction", () => nil)
    rawset(luaEntity, "cancel_upgrade", () => true)
    assemblyUpdater.onEntityMarkedForUpgrade(assembly, luaEntity, stage)
    assert.equal("test2", added.getFirstValue().name)
    assertOneEntity()
    assertUpdateCalled(added, 1, nil, false)
  })
  test("upgrade to rotated", () => {
    const { luaEntity, added } = addAndReset()
    rawset(luaEntity, "get_upgrade_target", () => nil)
    rawset(luaEntity, "get_upgrade_direction", () => direction.west)
    rawset(luaEntity, "cancel_upgrade", () => true)
    assemblyUpdater.onEntityMarkedForUpgrade(assembly, luaEntity, stage)
    assert.equal(direction.west, added.direction)
    assertOneEntity()
    assertUpdateCalled(added, 1, nil, false)
  })
  test("upgrade to rotate forbidden", () => {
    const { luaEntity, added } = addAndReset(1, 2)
    rawset(luaEntity, "get_upgrade_target", () => simpleMock<LuaEntityPrototype>({ name: "test2" }))
    rawset(luaEntity, "get_upgrade_direction", () => direction.west)
    rawset(luaEntity, "cancel_upgrade", () => true)
    assemblyUpdater.onEntityMarkedForUpgrade(assembly, luaEntity, stage)
    assert.equal(0, added.direction ?? 0)
    assertOneEntity()
    assertUpdateCalled(added, 2, 2, false)
    assertNotified(luaEntity, [L_Interaction.CannotRotateEntity])
  })
})

describe("cleanup tool", () => {
  function setupWithProxy() {
    const { luaEntity, added } = addAndReset()
    luaEntity.destroy()
    const proxy = createEntity({ name: Prototypes.SelectionProxyPrefix + "test" })
    return { added, proxy }
  }
  test("revive error entity", () => {
    const { added, proxy } = setupWithProxy()
    assemblyUpdater.onCleanupToolUsed(assembly, proxy, stage)
    assert.nil(added.getWorldEntity(1))
    assertOneEntity()
    assertUpdateCalled(added, 1, 1, false)
  })

  test("clear settings remnant", () => {
    const { added, proxy } = setupWithProxy()
    added.isSettingsRemnant = true
    assemblyUpdater.onCleanupToolUsed(assembly, proxy, stage)
    assert.nil(added.getWorldEntity(1))
    assertNoEntities()
    assertDeleteAllEntitiesCalled(added)
  })
})

describe("move to current stage", () => {
  test("normal entity", () => {
    const { luaEntity, added } = addAndReset(1, 3)
    assemblyUpdater.onMoveEntityToStage(assembly, luaEntity, stage)
    assert.equal(3, added.getFirstStage())
    assertOneEntity()
    assertUpdateCalled(added, 1, nil, false)
    assertNotified(luaEntity, [L_Interaction.EntityMovedFromStage, "mock stage 1"])
  })
  test("preview entity", () => {
    const { luaEntity, added } = addAndReset(1, 3)
    luaEntity.destroy()
    const preview = createEntity({ name: Prototypes.PreviewEntityPrefix + "test" })
    assemblyUpdater.onMoveEntityToStage(assembly, preview, stage)
    assert.equal(3, added.getFirstStage())
    assertOneEntity()
    assertUpdateCalled(added, 1, nil, false)
    assertNotified(preview, [L_Interaction.EntityMovedFromStage, "mock stage 1"])
  })
  test("settings remnant", () => {
    // with preview again
    const { luaEntity, added } = addAndReset(1, 3)
    luaEntity.destroy()
    const preview = createEntity({ name: Prototypes.PreviewEntityPrefix + "test" })
    added.isSettingsRemnant = true
    assemblyUpdater.onMoveEntityToStage(assembly, preview, stage)
    assert.equal(3, added.getFirstStage())
    assertOneEntity()
    assertReviveSettingsRemnantCalled(added)
  })
})

describe("circuit wires", () => {
  function setupNewWire(luaEntity1: LuaEntity, entity1: AssemblyEntity<TestEntity>): void {
    wireSaver.getWireConnectionDiff.invokes((_, entity2) => {
      wireSaver.getWireConnectionDiff.invokes(() => false as any)
      return $multi(
        [
          {
            wire: wire_type.red,
            fromEntity: entity1,
            toEntity: entity2,
            fromId: 1,
            toId: 0,
          } as AssemblyWireConnection,
        ],
        [],
      )
    })
  }
  function assertSingleWireMatches(entity2: AssemblyEntity<TestEntity>, entity1: AssemblyEntity<TestEntity>): void {
    const expectedConnection: AssemblyWireConnection = {
      wire: defines.wire_type.red,
      fromEntity: entity2,
      toEntity: entity1,
      fromId: 0,
      toId: 1,
    }
    function assertConnectionsMatch(connections: LuaSet<AssemblyWireConnection> | nil) {
      if (!connections) error("no connections")
      assert.equal(1, table_size(connections))
      const value = next(connections)[0] as AssemblyWireConnection
      assert.true(wireConnectionEquals(value, expectedConnection), "connections do not match")
    }
    assertConnectionsMatch(assembly.content.getWireConnections(entity1)?.get(entity2))
    assertConnectionsMatch(assembly.content.getWireConnections(entity1)?.get(entity2))
  }

  test("added circuit wires when entity added", () => {
    const { luaEntity: luaEntity1, added: entity1 } = addAndReset(nil, nil, {
      name: "test2",
      position: pos.plus(Pos(0, 1)),
    })
    setupNewWire(luaEntity1, entity1)
    const { added: entity2 } = addEntity()
    assertSingleWireMatches(entity2, entity1)

    assertUpdateCalled(entity2, 1, nil, false)
    assertNEntities(2)
  })

  describe("onCircuitWiresPotentiallyUpdated", () => {
    test("adds wire", () => {
      const { luaEntity: luaEntity1, added: entity1 } = addAndReset(nil, nil, {
        name: "test2",
        position: pos.plus(Pos(0, 1)),
      })
      addAndReset()
      setupNewWire(luaEntity1, entity1)

      assemblyUpdater.onCircuitWiresPotentiallyUpdated(assembly, luaEntity1, stage)

      assertUpdateCalled(entity1, 1, nil, false)
      assertNEntities(2)
    })

    test("deletes wire", () => {
      const { luaEntity: luaEntity1, added: entity1 } = addAndReset(nil, nil, {
        name: "test2",
        position: pos.plus(Pos(0, 1)),
      })
      setupNewWire(luaEntity1, entity1)
      const { added: entity2 } = addAndReset()

      const connection = next(assembly.content.getWireConnections(entity1)!.get(entity2)!)[0] as AssemblyWireConnection

      wireSaver.getWireConnectionDiff.invokes(() => {
        wireSaver.getWireConnectionDiff.invokes(() => false as any)
        return $multi([], [connection])
      })
      assemblyUpdater.onCircuitWiresPotentiallyUpdated(assembly, luaEntity1, stage)
      assert.falsy(assembly.content.getWireConnections(entity1)?.get(entity2))
      assert.falsy(assembly.content.getWireConnections(entity2)?.get(entity1))
      assertUpdateCalled(entity1, 1, nil, false)
      assertNEntities(2)
    })

    test("does nothing if no change", () => {
      const { luaEntity: luaEntity1, added: entity1 } = addAndReset(nil, nil, {
        name: "test2",
        position: pos.plus(Pos(0, 1)),
      })
      setupNewWire(luaEntity1, entity1)
      addAndReset()

      assemblyUpdater.onCircuitWiresPotentiallyUpdated(assembly, luaEntity1, stage)
      assertNoCalls()
      assertNEntities(2)
    })
  })
})
