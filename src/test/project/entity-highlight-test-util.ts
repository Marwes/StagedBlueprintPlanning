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

import expect from "tstl-expect"
import { ProjectEntity, StageNumber } from "../../entity/ProjectEntity"
import { HighlightConstants } from "../../project/entity-highlights"

export function assertConfigChangedHighlightsCorrect(entity: ProjectEntity, maxStage: StageNumber): void {
  let i = entity.firstStage
  for (const [stageNumber, changes] of pairs(entity.getStageDiffs() ?? {})) {
    const isUpgrade = changes.name != nil

    const highlight = expect(entity.getExtraEntity("configChangedHighlight", stageNumber)).to.be.any().getValue()!
    expect(highlight.highlight_box_type).to.be(
      isUpgrade ? HighlightConstants.Upgraded : HighlightConstants.ConfigChanged,
    )

    const firstI = i
    for (; i < stageNumber; i++) {
      if (i != firstI) expect(entity.getExtraEntity("configChangedHighlight", i)).to.be.nil()

      const highlight = expect(entity.getExtraEntity("configChangedLaterHighlight", i)).to.be.any().getValue()!
      expect(highlight.sprite).to.be(
        isUpgrade ? HighlightConstants.UpgradedLater : HighlightConstants.ConfigChangedLater,
      )
    }
  }
  for (let j = i; j <= maxStage; j++) {
    if (j != i) expect(entity.getExtraEntity("configChangedHighlight", j)).to.be.nil()
    expect(entity.getExtraEntity("configChangedLaterHighlight", j)).to.be.nil()
  }
}

export function assertErrorHighlightsCorrect(entity: ProjectEntity, maxStage: StageNumber): void {
  let anyHasError = false
  for (const stage of $range(entity.firstStage, maxStage)) {
    if (entity.hasErrorAt(stage)) {
      anyHasError = true
      const highlight = expect(entity.getExtraEntity("errorOutline", stage)).to.be.any().getValue()!
      expect(highlight.highlight_box_type).to.be(HighlightConstants.Error)
    } else {
      expect(entity.getExtraEntity("errorOutline", stage)).to.be.nil()
    }
  }
  if (!anyHasError) {
    expect(entity.hasAnyExtraEntities("errorElsewhereIndicator")).to.be(false)
  } else {
    for (const stage of $range(1, maxStage)) {
      const hasError = entity.hasErrorAt(stage)
      if (hasError) {
        // no indicator
        expect(entity.getExtraEntity("errorOutline", stage)).not.toBeNil()
        expect(entity.getExtraEntity("errorElsewhereIndicator", stage)).toBeNil()
      } else {
        expect(entity.getExtraEntity("errorElsewhereIndicator", stage)).toBeAny()
      }
    }
  }
}

export function assertLastStageHighlightCorrect(entity: ProjectEntity): void {
  if (entity.lastStage != nil && entity.lastStage != entity.firstStage) {
    const highlight = expect(entity.getExtraEntity("stageDeleteHighlight", entity.lastStage)).to.be.any().getValue()!
    expect(highlight).toMatchTable({
      object_name: "_RenderObj",
      sprite: HighlightConstants.DeletedNextStage,
    })
  } else {
    expect(entity.hasAnyExtraEntities("stageDeleteHighlight")).to.be(false)
  }
}

export function assertNoHighlightsAfterLastStage(entity: ProjectEntity, maxStage: StageNumber): void {
  if (!entity.lastStage) return
  for (const stage of $range(entity.lastStage + 1, maxStage)) {
    expect(entity.getExtraEntity("configChangedHighlight", stage)).to.be.nil()
    expect(entity.getExtraEntity("configChangedLaterHighlight", stage)).to.be.nil()
    expect(entity.getExtraEntity("errorOutline", stage)).to.be.nil()
    expect(entity.getExtraEntity("errorElsewhereIndicator", stage)).to.be.nil()
    expect(entity.getExtraEntity("stageDeleteHighlight", stage)).to.be.nil()
  }
}
