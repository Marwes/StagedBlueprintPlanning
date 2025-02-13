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

import { BlueprintItemStack, LuaInventory, LuaItemStack, LuaPlayer, LuaSurface, PlayerIndex } from "factorio:runtime"
import { Prototypes } from "../constants"
import { Events, isEmpty, MutableProperty } from "../lib"
import { BBox, Pos, Position } from "../lib/geometry"
import { L_Interaction } from "../locale"
import { PropertiesTable } from "../utils/properties-obj"
import { BlueprintTakeParameters, ProjectOrStageBlueprintSettings, StageBlueprintSettings } from "./blueprint-settings"
import { FirstEntityOriginalPositionTag, takeSingleBlueprint } from "./take-single-blueprint"

interface BlueprintEditInfo {
  blueprintInventory: LuaInventory
  settings: ProjectOrStageBlueprintSettings
  editType: "blueprint-item" | "additionalWhitelist" | "blacklist"
}
declare global {
  interface PlayerData {
    blueprintEditInfo?: BlueprintEditInfo
  }
}
declare const global: GlobalWithPlayers

function clearOpenedItem(playerIndex: PlayerIndex): void {
  const data = global.players[playerIndex]
  if (data && data.blueprintEditInfo) {
    const inventory = data.blueprintEditInfo.blueprintInventory
    if (inventory && inventory.valid) inventory.destroy()
    data.blueprintEditInfo = nil
  }
}

function getBasicBlueprintTakeParams(settings: ProjectOrStageBlueprintSettings): BlueprintTakeParameters {
  return {
    positionOffset: settings.positionOffset.get(),
    snapToGrid: settings.snapToGrid.get(),
    positionRelativeToGrid: settings.positionRelativeToGrid.get(),
    absoluteSnapping: settings.absoluteSnapping.get(),
    stageLimit: nil,
    additionalWhitelist: nil,
    blacklist: settings.blacklist.get(),
    replaceInfinityEntitiesWithCombinators: settings.replaceInfinityEntitiesWithCombinators.get(),
    useModulePreloading: false,
    icons: settings.icons?.get(),
  }
}

export function editInItemBlueprintSettings(
  player: LuaPlayer,
  settings: ProjectOrStageBlueprintSettings,
  surface: LuaSurface,
  bbox: BBox,
  bpName: string,
): LuaItemStack | nil {
  clearOpenedItem(player.index)
  const inventory = game.create_inventory(1)
  const blueprint = inventory[0]

  const took = takeSingleBlueprint(blueprint, getBasicBlueprintTakeParams(settings), surface, bbox, nil, true)
  if (!took) {
    inventory.destroy()
    return
  }
  blueprint.label = bpName

  global.players[player.index].blueprintEditInfo = {
    blueprintInventory: inventory,
    settings,
    editType: "blueprint-item",
  }
  player.opened = blueprint

  return blueprint
}

export function editBlueprintFilters(
  player: LuaPlayer,
  settings: ProjectOrStageBlueprintSettings,
  type: "additionalWhitelist" | "blacklist",
): LuaItemStack {
  clearOpenedItem(player.index)
  const inventory = game.create_inventory(1)
  const stack = inventory[0]
  stack.set_stack(Prototypes.BlueprintFilters)

  const property: MutableProperty<ReadonlyLuaSet<string> | nil> = settings[type]
  const currentFilters = property.get()
  if (currentFilters) {
    stack.entity_filters = Object.keys(currentFilters)
  }

  global.players[player.index].blueprintEditInfo = {
    blueprintInventory: inventory,
    settings,
    editType: type,
  }
  player.opened = stack

  return stack
}

function notifyFirstEntityRemoved(playerIndex: PlayerIndex): void {
  const player = game.get_player(playerIndex)
  if (player)
    player.create_local_flying_text({
      create_at_cursor: true,
      text: [L_Interaction.BlueprintFirstEntityRemoved],
    })
}
function updateBlueprintItemSettings(
  blueprint: BlueprintItemStack,
  settings: ProjectOrStageBlueprintSettings,
  playerIndex: PlayerIndex,
): void {
  if (settings.icons) {
    const icons = blueprint.blueprint_icons
    settings.icons.set(icons && icons[0] ? icons : nil)
  }

  const snapToGrid = blueprint.blueprint_snap_to_grid
  if (snapToGrid == nil) {
    settings.snapToGrid.set(nil)
    // keep position offset for later
    return
  }

  const originalPosition = blueprint.get_blueprint_entity_tag(1, FirstEntityOriginalPositionTag) as Position | nil
  if (!originalPosition) return notifyFirstEntityRemoved(playerIndex)

  const bpPosition = blueprint.get_blueprint_entities()![0].position
  settings.snapToGrid.set(snapToGrid)
  settings.absoluteSnapping.set(blueprint.blueprint_absolute_snapping)
  settings.positionRelativeToGrid.set(blueprint.blueprint_position_relative_to_grid)
  settings.positionOffset.set(Pos.minus(bpPosition, originalPosition))
}
function updateBlueprintFilters(stack: LuaItemStack, property: MutableProperty<ReadonlyLuaSet<string> | nil>): void {
  const filters = stack.entity_filters
  if (isEmpty(filters)) {
    property.set(nil)
    return
  }

  const result = new LuaSet<string>()
  for (const [, filter] of pairs(filters as Record<number, string>)) result.add(filter)
  property.set(result)
}

function tryUpdateSettings(playerIndex: PlayerIndex, info: BlueprintEditInfo): void {
  const inventory = info.blueprintInventory
  if (!inventory.valid) return
  const stack = inventory[0]
  if (!stack.valid_for_read) return

  if (info.editType == "blueprint-item") {
    if (!stack.is_blueprint) return
    updateBlueprintItemSettings(stack, info.settings, playerIndex)
  } else if (info.editType == "additionalWhitelist" || info.editType == "blacklist") {
    assume<PropertiesTable<StageBlueprintSettings>>(info.settings)
    updateBlueprintFilters(stack, info.settings[info.editType])
  }
}
Events.on_gui_closed((e) => {
  const playerIndex = e.player_index
  const data = global.players[playerIndex]
  const info = data.blueprintEditInfo
  if (!info) return
  delete data.blueprintEditInfo

  tryUpdateSettings(playerIndex, info)
  const bpInventory = info.blueprintInventory
  if (bpInventory.valid) bpInventory.destroy()
})
