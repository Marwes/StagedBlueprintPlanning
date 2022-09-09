/*
 * Copyright (c) 2022 GlassBricks
 * This file is part of 100% Blueprint Planning.
 *
 * 100% Blueprint Planning is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * 100% Blueprint Planning is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License along with 100% Blueprint Planning. If not, see <https://www.gnu.org/licenses/>.
 */

import { Migrations } from "../lib/migration"
import { Assembly, AssemblyId } from "./AssemblyDef"

declare const global: {
  assemblies: LuaMap<AssemblyId, Assembly>
}

export function getAllAssemblies(): ReadonlyLuaMap<AssemblyId, Assembly> {
  return global.assemblies
}

Migrations.to("0.4.0", () => {
  for (const [, assembly] of global.assemblies) {
    for (const stage of assembly.getAllStages()) {
      const surface = stage.surface
      if (surface.valid) surface.show_clouds = false
    }
  }
})
