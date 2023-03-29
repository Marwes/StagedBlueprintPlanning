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

import { remove_from_list } from "util"
import {
  createNewBlueprintSettings,
  OverrideableBlueprintSettings,
  StageBlueprintSettings,
  StageBlueprintSettingsTable,
} from "../blueprints/blueprint-settings"
import { newAssemblyContent } from "../entity/AssemblyContent"
import { AssemblyEntity, StageNumber } from "../entity/AssemblyEntity"
import {
  bind,
  Events,
  globalEvent,
  Mutable,
  MutableProperty,
  property,
  Property,
  RegisterClass,
  SimpleEvent,
} from "../lib"
import { BBox, Position } from "../lib/geometry"
import { Migrations } from "../lib/migration"
import { L_Bp100 } from "../locale"
import {
  createdDiffedPropertyTableView,
  createEmptyPropertyOverrideTable,
  PropertiesTable,
} from "../utils/properties-obj"
import { AssemblyId, GlobalAssemblyEvent, LocalAssemblyEvent, Stage, UserAssembly } from "./AssemblyDef"
import { createStageSurface, destroySurface, prepareArea } from "./surfaces"
import { AutoSetTilesType, setTiles } from "./tiles"
import entity_filter_mode = defines.deconstruction_item.entity_filter_mode
import min = math.min

declare const global: {
  nextAssemblyId: AssemblyId
  // assemblies: LuaMap<AssemblyId, UserAssemblyImpl>
  assemblies: UserAssemblyImpl[]
  surfaceIndexToStage: LuaMap<SurfaceIndex, StageImpl>
}
Events.on_init(() => {
  global.nextAssemblyId = 1 as AssemblyId
  global.assemblies = []
  global.surfaceIndexToStage = new LuaMap()
})
Migrations.to("0.16.0", () => {
  const oldAssemblies = global.assemblies as unknown as LuaMap<AssemblyId, UserAssemblyImpl>
  global.assemblies = Object.values(oldAssemblies)
})

const GlobalAssemblyEvents = globalEvent<[GlobalAssemblyEvent]>()
export { GlobalAssemblyEvents as AssemblyEvents }

declare const luaLength: LuaLength<Record<number, any>, number>

@RegisterClass("Assembly")
class UserAssemblyImpl implements UserAssembly {
  name: MutableProperty<string>
  displayName: Property<LocalisedString>

  content = newAssemblyContent()
  localEvents = new SimpleEvent<LocalAssemblyEvent>()

  defaultBlueprintSettings = createNewBlueprintSettings()
  valid = true

  private readonly stages: Record<number, StageImpl> = {}

  constructor(readonly id: AssemblyId, name: string, initialNumStages: number) {
    this.name = property(name)
    this.displayName = this.name.map(bind(UserAssemblyImpl.getDisplayName, id))
    this.stages = {}
    for (const i of $range(1, initialNumStages)) {
      this.stages[i] = StageImpl.create(this, i, `<Stage ${i}>`)
    }
  }
  private static getDisplayName(this: void, id: AssemblyId, name: string): LocalisedString {
    return name != "" ? name : [L_Bp100.UnnamedAssembly, id]
  }

  static create(name: string, initialNumStages: number): UserAssemblyImpl {
    const assembly = new UserAssemblyImpl(global.nextAssemblyId++ as AssemblyId, name, initialNumStages)
    UserAssemblyImpl.onAssemblyCreated(assembly)

    return assembly
  }

  getSurface(stageNum: StageNumber): LuaSurface | nil {
    const stage = this.stages[stageNum]
    return stage && stage.surface
  }
  getStage(stageNumber: StageNumber): Stage | nil {
    return this.stages[stageNumber]
  }
  _maxStage(): number {
    return luaLength(this.stages)
  }
  numStages(): StageNumber {
    return luaLength(this.stages)
  }
  lastStageFor(entity: AssemblyEntity): StageNumber {
    if (entity.lastStage != nil) return min(entity.lastStage, this.numStages())
    return this.numStages()
  }

  getAllStages(): readonly StageImpl[] {
    return this.stages as unknown as readonly StageImpl[]
  }
  getStageName(stageNumber: StageNumber): LocalisedString {
    return this.stages[stageNumber].name.get()
  }

  insertStage(index: StageNumber): Stage {
    this.assertValid()
    assert(index >= 1 && index <= this.numStages() + 1, "Invalid new stage number")

    const newStage = StageImpl.create(this, index, this.getNewStageName())
    table.insert(this.stages as unknown as Stage[], index, newStage)
    // update stages
    for (const i of $range(index, luaLength(this.stages))) {
      this.stages[i].stageNumber = i
    }
    this.content.insertStage(index)

    this.raiseEvent({ type: "stage-added", assembly: this, stage: newStage })
    return newStage
  }

  deleteStage(index: StageNumber): void {
    this.assertValid()
    const stage = this.stages[index]
    assert(stage != nil, "invalid stage number")
    if (this.numStages() == 1) {
      this.delete()
      return
    }

    this.raiseEvent({ type: "pre-stage-deleted", assembly: this, stage })

    stage._doDelete()
    table.remove(this.stages as unknown as Stage[], index)
    // update stages
    for (const i of $range(index, this.numStages())) {
      this.stages[i].stageNumber = i
    }
    this.content.deleteStage(index)

    this.raiseEvent({ type: "stage-deleted", assembly: this, stage })
  }
  delete() {
    if (!this.valid) return
    remove_from_list(global.assemblies, this)
    this.valid = false
    for (const [, stage] of pairs(this.stages)) {
      stage._doDelete()
    }
    this.raiseEvent({ type: "assembly-deleted", assembly: this })
    this.localEvents.closeAll()
  }

  private getNewStageName(): string {
    let subName = ""
    for (let i = 1; ; i++) {
      const name = `<New stage>${subName}`
      if ((this.stages as unknown as Stage[]).some((stage) => stage.name.get() == name)) {
        subName = ` (${i})`
      } else {
        return name
      }
    }
  }

  private raiseEvent(event: LocalAssemblyEvent): void {
    // local first, more useful event order
    this.localEvents.raise(event)
    GlobalAssemblyEvents.raise(event)
  }
  private assertValid(): void {
    if (!this.valid) error("Assembly is invalid")
  }

  __tostring(): string {
    return `<Assembly ${this.id} "${this.name.get()}">`
  }

  static onAssemblyCreated(assembly: UserAssemblyImpl): void {
    global.assemblies.push(assembly)
    GlobalAssemblyEvents.raise({ type: "assembly-created", assembly })
  }
}

export function createUserAssembly(name: string, initialNumStages: number): UserAssembly {
  return UserAssemblyImpl.create(name, initialNumStages)
}

export function _deleteAllAssemblies(): void {
  for (const assembly of global.assemblies) {
    assembly.delete()
  }
  global.nextAssemblyId = 1 as AssemblyId
}
export function getAllAssemblies(): readonly UserAssembly[] {
  return global.assemblies
}

function swapAssemblies(index1: number, index2: number): void {
  const assemblies = global.assemblies
  const temp = assemblies[index1]
  assemblies[index1] = assemblies[index2]
  assemblies[index2] = temp
  GlobalAssemblyEvents.raise({
    type: "assemblies-reordered",
    assembly1: assemblies[index1],
    assembly2: assemblies[index2],
  })
}
export function moveAssemblyUp(assembly: UserAssembly): boolean {
  // up means lower index
  const index = global.assemblies.indexOf(assembly as UserAssemblyImpl)
  if (index <= 0) return false
  swapAssemblies(index - 1, index)
  return true
}

export function moveAssemblyDown(assembly: UserAssembly): boolean {
  // down means higher index
  const index = global.assemblies.indexOf(assembly as UserAssemblyImpl)
  if (index < 0 || index >= global.assemblies.length - 1) return false
  swapAssemblies(index, index + 1)
  return true
}

const initialPreparedArea = BBox.around({ x: 0, y: 0 }, script.active_mods.debugadapter != nil ? 32 : 5 * 32)

function createEmptyStageBlueprintSettings(): StageBlueprintSettingsTable {
  return {
    ...createEmptyPropertyOverrideTable<OverrideableBlueprintSettings>(keys<OverrideableBlueprintSettings>()),
    icons: property(nil),
  }
}

@RegisterClass("Stage")
class StageImpl implements Stage {
  name: MutableProperty<string>
  readonly valid = true

  readonly surfaceIndex: SurfaceIndex

  stageBlueprintSettings = createEmptyStageBlueprintSettings()

  getBlueprintSettingsView(): PropertiesTable<StageBlueprintSettings> {
    return {
      ...createdDiffedPropertyTableView(this.assembly.defaultBlueprintSettings, this.stageBlueprintSettings),
      icons: this.stageBlueprintSettings.icons,
    }
  }

  getBlueprintBBox(): BBox {
    return this.assembly.content.computeBoundingBox() ?? BBox.coords(-20, -20, 20, 20)
  }
  public constructor(
    public readonly assembly: UserAssemblyImpl,
    public readonly surface: LuaSurface,
    public stageNumber: StageNumber,
    name: string,
  ) {
    this.name = property(name)
    this.surfaceIndex = surface.index
    if (assembly.id != 0) global.surfaceIndexToStage.set(this.surfaceIndex, this)
  }

  static create(assembly: UserAssemblyImpl, stageNumber: StageNumber, name: string): StageImpl {
    const surface = createStageSurface()
    prepareArea(surface, initialPreparedArea)
    return new StageImpl(assembly, surface, stageNumber, name)
  }

  autoSetTiles(tiles: AutoSetTilesType): boolean {
    const bbox = this.assembly.content.computeBoundingBox() ?? BBox.coords(-20, -20, 20, 20)
    return setTiles(this.surface, bbox, tiles)
  }

  deleteInAssembly(): void {
    if (!this.valid) return
    this.assembly.deleteStage(this.stageNumber)
  }

  _doDelete(): void {
    if (!this.valid) return
    ;(this as Mutable<Stage>).valid = false
    global.surfaceIndexToStage.delete(this.surfaceIndex)
    if (this.surface.valid) destroySurface(this.surface)
  }

  __tostring() {
    return `<Stage ${this.stageNumber} "${this.name.get()}" of "${this.assembly.name.get()}">`
  }
}

export function getStageAtSurface(surfaceIndex: SurfaceIndex): Stage | nil {
  return global.surfaceIndexToStage.get(surfaceIndex)
}

Events.on_pre_surface_deleted((e) => {
  const stage = getStageAtSurface(e.surface_index)
  if (stage != nil) stage.deleteInAssembly()
})

Migrations.to("0.16.0", () => {
  interface OldAssembly {
    assemblyBlueprintSettings?: {
      autoLandfill: MutableProperty<boolean>
      useNextStageTiles: MutableProperty<boolean>

      emptyBlueprintNames: MutableProperty<boolean>
      emptyBlueprintBookName: MutableProperty<boolean>

      entityFilters: MutableProperty<LuaSet<string> | nil>
      entityFilterMode: MutableProperty<defines.deconstruction_item.entity_filter_mode | nil>
      replaceInfinityWithCombinators: MutableProperty<boolean>
    }
  }

  interface OldStage {
    blueprintSettings?: {
      name: string
      icons: BlueprintSignalIcon[] | nil

      /** Original position + offset = blueprint position */
      positionOffset: Position
      snapToGrid?: Position
      positionRelativeToGrid?: Position
      absoluteSnapping: boolean
    }
  }

  function copyFromOldStageSettings(
    newSettings: PropertiesTable<OverrideableBlueprintSettings>,
    oldSettings: OldStage["blueprintSettings"] & AnyNotNil,
  ) {
    newSettings.positionOffset.set(oldSettings.positionOffset)
    newSettings.snapToGrid.set(oldSettings.snapToGrid)
    newSettings.positionRelativeToGrid.set(oldSettings.positionRelativeToGrid)
    newSettings.absoluteSnapping.set(oldSettings.absoluteSnapping)
  }

  for (const assembly of global.assemblies) {
    assume<Mutable<UserAssemblyImpl>>(assembly)
    assume<OldAssembly>(assembly)

    const oldSettings = assembly.assemblyBlueprintSettings!
    delete assembly.assemblyBlueprintSettings

    const newSettings = createNewBlueprintSettings()
    assembly.defaultBlueprintSettings = newSettings

    newSettings.autoLandfill.set(oldSettings.autoLandfill.get())
    newSettings.useNextStageTiles.set(oldSettings.useNextStageTiles.get())
    newSettings.replaceInfinityEntitiesWithCombinators.set(oldSettings.replaceInfinityWithCombinators.get())

    const entityFilterMode = oldSettings.entityFilterMode.get()
    if (entityFilterMode == entity_filter_mode.whitelist) {
      newSettings.additionalWhitelist.set(oldSettings.entityFilters.get())
    } else if (entityFilterMode == entity_filter_mode.blacklist) {
      newSettings.blacklist.set(oldSettings.entityFilters.get())
    }

    const lastStageSettings = (assembly.getStage(assembly.numStages())! as OldStage).blueprintSettings!
    copyFromOldStageSettings(newSettings, lastStageSettings)

    for (const stage of assembly.getAllStages()) {
      assume<OldStage>(stage)
      const oldSettings = stage.blueprintSettings!
      delete stage.blueprintSettings

      stage.stageBlueprintSettings = createEmptyStageBlueprintSettings()

      const view = stage.getBlueprintSettingsView()
      copyFromOldStageSettings(view, oldSettings)
      stage.stageBlueprintSettings.icons.set(oldSettings.icons)
    }
  }
})
