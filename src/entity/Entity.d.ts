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

import { BlueprintControlBehavior, LuaSurface, RealOrientation } from "factorio:runtime"
import { Position } from "../lib/geometry"

export interface Entity {
  readonly name: string
  readonly items?: Record<string, number>
  readonly control_behavior?: BlueprintControlBehavior
}

export interface EntityIdentification {
  readonly name: string
  readonly type: string
  readonly position: Position
  readonly direction: defines.direction
  readonly belt_to_ground_type: "input" | "output" | nil
  readonly object_name?: string
}
export interface LuaEntityInfo extends EntityIdentification {
  readonly surface: LuaSurface
  readonly position: Position
}
export interface UndergroundBeltEntity extends Entity {
  type: "input" | "output"
}
export type LoaderEntity = UndergroundBeltEntity
export interface RollingStockEntity extends Entity {
  orientation?: RealOrientation
}
