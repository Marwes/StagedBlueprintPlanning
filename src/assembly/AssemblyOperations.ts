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

import { isWorldEntityAssemblyEntity } from "../entity/AssemblyEntity"
import { AssemblyContent, StagePosition } from "./AssemblyContent"
import { DefaultWorldUpdater, WorldUpdater } from "./WorldUpdater"

/**
 * User and miscellaneous operations on an entire assembly at once.
 * @noSelf
 */
export interface AssemblyOperations {
  /** Delete all extra (non-main) entities in the assembly. Before assembly deletion. */
  deleteAllExtraEntitiesOnly(assembly: AssemblyContent): void

  resetStage(assembly: AssemblyContent, stage: StagePosition): void
}

/** @noSelf */
export interface AssemblyOpWorldInteractor {
  deleteAllWorldEntities(stage: StagePosition): void
}

export function createAssemblyOperations(
  worldUpdater: WorldUpdater,
  worldInteractor: AssemblyOpWorldInteractor,
): AssemblyOperations {
  const { updateWorldEntities, deleteExtraEntitiesOnly } = worldUpdater

  function deleteAllExtraEntitiesOnly(assembly: AssemblyContent) {
    for (const entity of assembly.content.iterateAllEntities()) {
      deleteExtraEntitiesOnly(entity)
    }
  }

  function resetStage(assembly: AssemblyContent, stage: StagePosition) {
    worldInteractor.deleteAllWorldEntities(stage)
    const stageNumber = stage.stageNumber
    for (const entity of assembly.content.iterateAllEntities()) {
      updateWorldEntities(assembly, entity, stageNumber, stageNumber)
    }
  }

  return {
    deleteAllExtraEntitiesOnly,
    resetStage,
  }
}

const DefaultWorldInteractor: AssemblyOpWorldInteractor = {
  deleteAllWorldEntities(stage: StagePosition) {
    for (const entity of stage.surface.find_entities()) {
      if (isWorldEntityAssemblyEntity(entity)) entity.destroy()
    }
  },
}

export const AssemblyOperations = createAssemblyOperations(DefaultWorldUpdater, DefaultWorldInteractor)
