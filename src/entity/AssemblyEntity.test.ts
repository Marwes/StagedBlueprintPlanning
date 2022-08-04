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

import { shallowCopy } from "../lib"
import { Pos } from "../lib/geometry"
import { entityMock } from "../test-util/simple-mock"
import { AssemblyEntity, createAssemblyEntity } from "./AssemblyEntity"
import { getNilPlaceholder } from "./diff"
import { Entity } from "./Entity"

interface FooEntity extends Entity {
  foo1: number
  foo2?: number | nil
}

let entity: FooEntity
let assemblyEntity: AssemblyEntity<FooEntity>
before_each(() => {
  entity = {
    name: "foo",
    foo1: 1,
  }
  assemblyEntity = createAssemblyEntity(shallowCopy(entity), Pos(0, 0), nil, 2)
  assemblyEntity.applyDiffAtLayer(3, { foo1: 3, foo2: 4 })
  assemblyEntity.applyDiffAtLayer(5, { foo1: 5 })
  assemblyEntity.applyDiffAtLayer(7, { foo2: getNilPlaceholder() })
})

test("getters", () => {
  assert.same(2, assemblyEntity.getBaseLayer())
  assert.same(entity, assemblyEntity.getBaseValue())
})

describe("getValueAtLayer", () => {
  test("applyDiffAtLayer at base layer", () => {
    const expected = { ...entity, foo1: 2 }
    assemblyEntity.applyDiffAtLayer(2, { foo1: 2 })
    const actual = assemblyEntity.getBaseValue()
    assert.same(expected, actual)
  })

  test("nil if lower than layer", () => {
    assert.nil(assemblyEntity.getValueAtLayer(1))
  })

  test("getValueAtLayer returns same entity if no layerChanges", () => {
    assert.same(entity, assemblyEntity.getValueAtLayer(2))
  })

  test("applies changes from one layer", () => {
    const result = assemblyEntity.getValueAtLayer(3)
    assert.same({ ...entity, foo1: 3, foo2: 4 }, result)
  })

  test("applies changes from multiple layers", () => {
    const result = assemblyEntity.getValueAtLayer(5)
    assert.same({ ...entity, foo1: 5, foo2: 4 }, result)
  })

  test("replaces nilPlaceholder with nil", () => {
    const result = assemblyEntity.getValueAtLayer(7)
    const expected = { ...entity, foo1: 5 }
    delete expected.foo2

    assert.same(expected, result)
  })
})

test("hasLayerChanges", () => {
  const assemblyEntity = createAssemblyEntity(shallowCopy(entity), Pos(0, 0), nil, 2)
  assert.false(assemblyEntity.hasLayerChanges())
  assemblyEntity.applyDiffAtLayer(3, { foo1: 3 })
  assert.true(assemblyEntity.hasLayerChanges())
})

test("iterateValues", () => {
  const expected = []
  for (let layer = 2; layer <= 6; layer++) {
    expected.push([layer, assemblyEntity.getValueAtLayer(layer)])
  }
  const result = []
  for (const [layer, entity] of assemblyEntity.iterateValues(2, 6)) {
    result.push([layer, shallowCopy(entity)])
  }
  assert.same(expected, result)
})

describe("moveEntityDown", () => {
  test("with no changes", () => {
    assemblyEntity.moveDown(1)
    assert.same(entity, assemblyEntity.getBaseValue())
    assert.equal(1, assemblyEntity.getBaseLayer())
  })

  test("with new value", () => {
    assemblyEntity.moveDown(1, { ...entity, foo1: 3 })
    assert.same({ ...entity, foo1: 3 }, assemblyEntity.getBaseValue())
    assert.same({ ...entity, foo1: 3 }, assemblyEntity.getValueAtLayer(2))
    assert.equal(1, assemblyEntity.getBaseLayer())
  })

  test("with new value and changes", () => {
    assemblyEntity.applyDiffAtLayer(3, { foo1: 3 })
    assemblyEntity.moveDown(1, { ...entity, foo1: 3 }, true)
    assert.same({ ...entity, foo1: 3 }, assemblyEntity.getBaseValue())
    assert.same({ ...entity }, assemblyEntity.getValueAtLayer(2))
  })

  test("error if moving up", () => {
    assert.error(() => assemblyEntity.moveDown(2))
  })
})

describe("Get/set world entities", () => {
  let entity: LuaEntity
  let assemblyEntity: AssemblyEntity
  before_each(() => {
    // entity = area.surface.create_entity({ name: "iron-chest", position: area.bbox.left_top })!
    entity = entityMock({ name: "test", position: Pos(0, 0) })
    assemblyEntity = createAssemblyEntity({ name: entity.name }, Pos(0, 0), nil, 1)
    assert(entity)
  })

  test("get after replace returns the correct entity", () => {
    assert.nil(assemblyEntity.getWorldEntity(1))
    assert.nil(assemblyEntity.getWorldEntity(2))
    assemblyEntity.replaceWorldEntity(1, entity)
    assert.same(entity, assemblyEntity.getWorldEntity(1))
    assert.nil(assemblyEntity.getWorldEntity(2))
    assemblyEntity.replaceWorldEntity(2, entity)
    assert.same(entity, assemblyEntity.getWorldEntity(1))
    assert.same(entity, assemblyEntity.getWorldEntity(2))
  })

  test("replaceOrDestroy with nil destroys the entity", () => {
    assemblyEntity.replaceWorldEntity(1, entity)
    assemblyEntity.replaceWorldEntity(1, nil)
    assert.false(entity.valid)
    assert.nil(assemblyEntity.getWorldEntity(1))
  })

  test("replace world entity deletes old entity", () => {
    assemblyEntity.replaceWorldEntity(1, entity)
    const newEntity = entityMock({ name: "test", position: Pos(0, 0) })
    assemblyEntity.replaceWorldEntity(1, newEntity)
    assert.false(entity.valid)
    assert.same(newEntity, assemblyEntity.getWorldEntity(1))
  })

  test("replace world entity does not delete if same entity", () => {
    assemblyEntity.replaceWorldEntity(1, entity)
    assemblyEntity.replaceWorldEntity(1, entity)
    assert.true(entity.valid)
    assert.same(entity, assemblyEntity.getWorldEntity(1))
  })

  test("get world entity returns nil if entity becomes invalid", () => {
    assemblyEntity.replaceWorldEntity(1, entity)
    entity.destroy()
    assert.nil(assemblyEntity.getWorldEntity(1))
  })
})
