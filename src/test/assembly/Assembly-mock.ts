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

import { AssemblyContent, StagePosition } from "../../assembly/AssemblyContent"
import { newEntityMap } from "../../assembly/EntityMap"
import { createStageSurface, prepareArea } from "../../assembly/surfaces"
import { BBox, Pos } from "../../lib/geometry"

export function createMockAssemblyContent(stages: number | LuaSurface[]): AssemblyContent {
  const stagePos: StagePosition[] = Array.from(
    {
      length: typeof stages === "number" ? stages : stages.length,
    },
    (_, i) => ({
      stageNumber: i + 1,
      surface: typeof stages === "number" ? game.surfaces[1] : stages[i],
    }),
  )
  return {
    getStage: (n) => stagePos[n - 1],
    numStages: () => stagePos.length,
    iterateStages: (start = 1, end = stagePos.length): any => {
      function next(s: StagePosition[], i: number) {
        if (i >= end) return
        i++
        return $multi(i, s[i - 1])
      }
      return $multi(next, stagePos, start - 1)
    },
    content: newEntityMap(),
    getStageName: (n) => "mock stage " + n,
  }
}

export function setupTestSurfaces(numSurfaces: number): LuaSurface[] {
  const surfaces: LuaSurface[] = []
  before_all(() => {
    for (let i = 0; i < numSurfaces; i++) {
      const surface = createStageSurface()
      prepareArea(surface, BBox.around(Pos(0, 0), 10))
      surfaces.push(surface)
    }
  })
  before_each(() => {
    for (const surface of surfaces) {
      surface.find_entities().forEach((e) => e.destroy())
    }
  })
  after_all(() => {
    surfaces.forEach((surface) => game.delete_surface(surface))
  })
  return surfaces
}
