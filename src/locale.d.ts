// Generated by gen-locale-defs.ts
// noinspection JSUnusedGlobalSymbols

export declare const enum L_ItemName {
  /** Cleanup tool */
  CleanupTool = "item-name.bp100:cleanup-tool",
  /** Stage move tool */
  StageMoveTool = "item-name.bp100:stage-move-tool",
  /** Filtered stage move tool */
  FilteredStageMoveTool = "item-name.bp100:filtered-stage-move-tool",
  /** Blueprint filters */
  BlueprintFilters = "item-name.bp100:blueprint-filters",
  /** Stage deconstruction tool */
  StageDeconstructTool = "item-name.bp100:stage-deconstruct-tool",
}
export declare const enum L_ShortcutName {
  /** [Staged BP planning] cleanup tool */
  CleanupTool = "shortcut-name.bp100:cleanup-tool",
  /** Stage move tool */
  StageMoveTool = "shortcut-name.bp100:stage-move-tool",
  /** Filtered stage move tool */
  FilteredStageMoveTool = "shortcut-name.bp100:filtered-stage-move-tool",
  /** Stage deconstruction tool */
  StageDeconstructTool = "shortcut-name.bp100:stage-deconstruct-tool",
}
export declare const enum L_EntityName {
  /** Blueprint entity marker */
  EntityMarker = "entity-name.bp100:entity-marker",
  /** Undo reference */
  UndoReference = "entity-name.bp100:undo-reference",
}
export declare const enum L_ItemGroupName {
  /** Staged bp planning: utility entities */
  Utility = "item-group-name.bp100:utility",
}
export declare const enum L_ModSettingName {
  /** Flexible offshore pump placement */
  FlexibleOffshorePumpPlacement = "mod-setting-name.bp100:flexible-offshore-pump-placement",
  /** Location of Entity info gui */
  EntityInfoLocation = "mod-setting-name.bp100:entity-info-location",
  /** Allow blueprint paste to upgrade entities */
  UpgradeOnPaste = "mod-setting-name.bp100:upgrade-on-paste",
}
export declare const enum L_ModSettingDescription {
  /** Allow placing offshore pumps at locations that are not normally allowed. See dropdown tooltips for more info. */
  FlexibleOffshorePumpPlacement = "mod-setting-description.bp100:flexible-offshore-pump-placement",
  /** For example, if pasting a blueprint with a fast-inserter over a normal inserter, this will upgrade the inserter. This is different from vanilla behavior.\nThis setting only applies while within a staged project. */
  UpgradeOnPaste = "mod-setting-description.bp100:upgrade-on-paste",
}
export declare const enum L_StringModSetting {
  /** Top */
  EntityInfoLocationTop = "string-mod-setting.bp100:entity-info-location-top",
  /** Bottom */
  EntityInfoLocationBottom = "string-mod-setting.bp100:entity-info-location-bottom",
  /** Left */
  EntityInfoLocationLeft = "string-mod-setting.bp100:entity-info-location-left",
  /** Right */
  EntityInfoLocationRight = "string-mod-setting.bp100:entity-info-location-right",
  /** Disabled */
  FlexibleOffshorePumpPlacementDisabled = "string-mod-setting.bp100:flexible-offshore-pump-placement-disabled",
  /** One water tile */
  FlexibleOffshorePumpPlacementOneWaterTile = "string-mod-setting.bp100:flexible-offshore-pump-placement-one-water-tile",
  /** Anywhere */
  FlexibleOffshorePumpPlacementAnywhere = "string-mod-setting.bp100:flexible-offshore-pump-placement-anywhere",
}
export declare const enum L_StringModSettingDescription {
  /** Offshore pumps only require only one water tile behind one land tile to be placed. */
  FlexibleOffshorePumpPlacementOneWaterTile = "string-mod-setting-description.bp100:flexible-offshore-pump-placement-one-water-tile",
  /** Offshore pumps can be placed anywhere on land (water tiles not required). */
  FlexibleOffshorePumpPlacementAnywhere = "string-mod-setting-description.bp100:flexible-offshore-pump-placement-anywhere",
}
export declare const enum L_Controls {
  /** Go to next stage */
  NextStage = "controls.bp100:next-stage",
  /** Go to previous stage */
  PreviousStage = "controls.bp100:previous-stage",
  /** Go to next project */
  NextProject = "controls.bp100:next-project",
  /** Go to previous project */
  PreviousProject = "controls.bp100:previous-project",
  /** Go to entity first stage */
  GoToFirstStage = "controls.bp100:go-to-first-stage",
  /** Move entity to current stage */
  MoveToThisStage = "controls.bp100:move-to-this-stage",
  /** Force delete entity */
  ForceDelete = "controls.bp100:force-delete",
  /** Stage move tool: select next stage */
  StageSelectNext = "controls.bp100:stage-select-next",
  /** Stage move tool: select previous stage */
  StageSelectPrevious = "controls.bp100:stage-select-previous",
}
export declare const enum L_ControlsDescription {
  /** Delete an entity even if not in its the current stage. */
  ForceDelete = "controls-description.bp100:force-delete",
}
export declare const enum L_Bp100 {
  /** __1__ (preview) */
  PreviewEntity = "bp100.preview-entity",
  /** <Unnamed project __1__> */
  UnnamedProject = "bp100.unnamed-project",
}
export declare const enum L_Interaction {
  /** An unexpected error occurred: __1__. Additional details outputted to log. Please report this to the mod author! */
  UnexpectedError = "bp100.interaction.unexpected-error",
  /** WARNING: pasting from the blueprint [font=default-bold]library[/font] into a staged BP project may cause issues.\nTo fix, make a copy of the blueprint, and paste again using the copy. */
  BlueprintNotHandled = "bp100.interaction.blueprint-not-handled",
  /** Entity moved from __1__ */
  EntityMovedFromStage = "bp100.interaction.entity-moved-from-stage",
  /** Entity moved back to __1__ */
  EntityMovedBackToStage = "bp100.interaction.entity-moved-back-to-stage",
  /** Cannot flip underground paired with multiple other undergrounds */
  CannotFlipUndergroundDueToMultiplePairs = "bp100.interaction.cannot-flip-underground-due-to-multiple-pairs",
  /** Cannot upgrade underground paired with multiple other undergrounds */
  CannotUpgradeUndergroundDueToMultiplePairs = "bp100.interaction.cannot-upgrade-underground-due-to-multiple-pairs",
  /** Cannot create upgrade if underground pairs are not in the same stage */
  CannotCreateUndergroundUpgradeIfNotInSameStage = "bp100.interaction.cannot-create-underground-upgrade-if-not-in-same-stage",
  /** Upgrading this will change the underground pair */
  CannotUpgradeUndergroundChangedPair = "bp100.interaction.cannot-upgrade-underground-changed-pair",
  /** Cannot move underground belt with upgrade. */
  CannotMoveUndergroundBeltWithUpgrade = "bp100.interaction.cannot-move-underground-belt-with-upgrade",
  /** Cannot move entity past last stage */
  CannotMovePastLastStage = "bp100.interaction.cannot-move-past-last-stage",
  /** Cannot deconstruct entity at first stage */
  CannotDeleteBeforeFirstStage = "bp100.interaction.cannot-delete-before-first-stage",
  /** This move will intersect an identical entity in another stage */
  MoveWillIntersectAnotherEntity = "bp100.interaction.move-will-intersect-another-entity",
  /** Max of 5 connections reached (in another stage). */
  MaxConnectionsReachedInAnotherStage = "bp100.interaction.max-connections-reached-in-another-stage",
  /** __1__ does not support moving (in another stage). */
  CannotBeTeleportedInAnotherStage = "bp100.interaction.cannot-be-teleported-in-another-stage",
  /** The wires can not be stretched any longer (in another stage). */
  WiresMaxedInAnotherStage = "bp100.interaction.wires-maxed-in-another-stage",
  /** __1__ will not fit (in another stage). */
  NoRoomInAnotherStage = "bp100.interaction.no-room-in-another-stage",
  /** This cannot be moved */
  CannotMove = "bp100.interaction.cannot-move",
  /** Cannot move, entities missing in another stage */
  EntitiesMissing = "bp100.interaction.entities-missing",
  /** Cannot move, power/circuit connected entities missing in another stage */
  ConnectedEntitiesMissing = "bp100.interaction.connected-entities-missing",
  /** Cannot overlap existing entity in a different direction */
  CannotBuildDifferentDirection = "bp100.interaction.cannot-build-different-direction",
  /** Note: some entities were upgraded (the upgrade on blueprint paste user setting is enabled) */
  PasteUpgradeApplied = "bp100.interaction.paste-upgrade-applied",
  /** Not in a Staged BP project */
  NotInAnProject = "bp100.interaction.not-in-an-project",
  /** No next stage */
  NoNextStage = "bp100.interaction.no-next-stage",
  /** No previous stage */
  NoPreviousStage = "bp100.interaction.no-previous-stage",
  /** No next project */
  NoNextProject = "bp100.interaction.no-next-project",
  /** No previous project */
  NoPreviousProject = "bp100.interaction.no-previous-project",
  /** Already at first stage */
  AlreadyAtFirstStage = "bp100.interaction.already-at-first-stage",
  /** Blueprint is empty */
  BlueprintEmpty = "bp100.interaction.blueprint-empty",
  /** Blueprint book is empty */
  BlueprintBookEmpty = "bp100.interaction.blueprint-book-empty",
  /** Snap to grid settings have not been saved. Try editing the blueprint again without removing entities. */
  BlueprintFirstEntityRemoved = "bp100.interaction.blueprint-first-entity-removed",
  /** WARNING: The filtered stage move tool must be used with instant-deconstruction [font=default-large-bold]disabled[/font]. Otherwise, the tool will not work properly (it will act like a deconstruction planner). */
  FilteredStageMoveToolWarning = "bp100.interaction.filtered-stage-move-tool-warning",
  /** Blueprint book exported to script-output/__1__ */
  BlueprintBookExported = "bp100.interaction.blueprint-book-exported",
}
export declare const enum L_GuiProjectSelector {
  /** Staged BP projects */
  ShowAllProjects = "bp100.gui.project-selector.show-all-projects",
  /** Staged BP projects */
  AllProjects = "bp100.gui.project-selector.all-projects",
  /** New project */
  NewProject = "bp100.gui.project-selector.new-project",
  /** Exit project */
  ExitProject = "bp100.gui.project-selector.exit-project",
  /** [font=default-bold]Ctrl+left click[/font] to move up\n[font=default-bold]Ctrl+right click[/font] to move down */
  ButtonTooltip = "bp100.gui.project-selector.button-tooltip",
}
export declare const enum L_GuiProjectSettings {
  /** Show settings */
  ShowFullSettings = "bp100.gui.project-settings.show-full-settings",
  /** Hide settings */
  HideFullSettings = "bp100.gui.project-settings.hide-full-settings",
  /** Project: */
  TitleCaption = "bp100.gui.project-settings.title-caption",
  /** New stage */
  NewStage = "bp100.gui.project-settings.new-stage",
  /** After current */
  AfterCurrent = "bp100.gui.project-settings.after-current",
  /** At front */
  AtFront = "bp100.gui.project-settings.at-front",
  /** Rename */
  RenameProject = "bp100.gui.project-settings.rename-project",
  /** Stage */
  Stage = "bp100.gui.project-settings.stage",
  /** Blueprints */
  Blueprints = "bp100.gui.project-settings.blueprints",
  /** Other */
  Other = "bp100.gui.project-settings.other",
  /** Rename stage */
  RenameStage = "bp100.gui.project-settings.rename-stage",
  /** Entities */
  Entities = "bp100.gui.project-settings.entities",
  /** Rebuild stage [img=info] */
  ResetStage = "bp100.gui.project-settings.reset-stage",
  /** Deletes and replaces all entities to match the stored state.\nThis may resolve inconsistencies due to bugs. */
  ResetStageTooltip = "bp100.gui.project-settings.reset-stage-tooltip",
  /** Disable all entities */
  DisableAllEntities = "bp100.gui.project-settings.disable-all-entities",
  /** Enable all entities */
  EnableAllEntities = "bp100.gui.project-settings.enable-all-entities",
  /** Set tiles */
  SetTiles = "bp100.gui.project-settings.set-tiles",
  /** Lab tiles */
  LabTiles = "bp100.gui.project-settings.lab-tiles",
  /** Landfill and water */
  LandfillAndWater = "bp100.gui.project-settings.landfill-and-water",
  /** Landfill and lab tiles */
  LandfillAndLab = "bp100.gui.project-settings.landfill-and-lab",
  /** Failed to set tiles. Have the "water" or "landfill" tiles been removed by another mod? */
  FailedToSetTiles = "bp100.gui.project-settings.failed-to-set-tiles",
  /** Delete stage */
  DeleteStage = "bp100.gui.project-settings.delete-stage",
  /** Are you sure you want to delete stage __1__? */
  DeleteStageConfirmation1 = "bp100.gui.project-settings.delete-stage-confirmation1",
  /** Contents will be merged with the next stage (__1__). */
  DeleteStageConfirmation2First = "bp100.gui.project-settings.delete-stage-confirmation2-first",
  /** Contents will be merged with the previous stage (__1__). */
  DeleteStageConfirmation2Middle = "bp100.gui.project-settings.delete-stage-confirmation2-middle",
  /** Defaults */
  BlueprintSettingsDefaults = "bp100.gui.project-settings.blueprint-settings-defaults",
  /** Current stage [img=info] */
  BlueprintSettingsCurrentStage = "bp100.gui.project-settings.blueprint-settings-current-stage",
  /** These settings override the default settings for the current stage. Overriden settings are highlighted. */
  BlueprintSettingsCurrentStageTooltip = "bp100.gui.project-settings.blueprint-settings-current-stage-tooltip",
  /** Defaults */
  EditingDefaults = "bp100.gui.project-settings.editing-defaults",
  /** Overrides for stage: __1__ */
  EditingForStage = "bp100.gui.project-settings.editing-for-stage",
  /** Grid settings: */
  GridSettings = "bp100.gui.project-settings.grid-settings",
  /** Icons and grid settings: */
  GridSettingsAndIcons = "bp100.gui.project-settings.grid-settings-and-icons",
  /** Edit */
  Edit = "bp100.gui.project-settings.edit",
  /** Entities */
  FilteringEntities = "bp100.gui.project-settings.filtering-entities",
  /** Only include entities changed in the last */
  IncludeEntitiesInTheNextNStages1 = "bp100.gui.project-settings.include-entities-in-the-next-n-stages-1",
  /** stages [img=info] */
  IncludeEntitiesInTheNextNStages2 = "bp100.gui.project-settings.include-entities-in-the-next-n-stages-2",
  /** Only new entities or entities with setting changes in the last "n" stages will be included in the blueprint.\n[font=default-bold]Notes:[/font]\n  Consider adding assembling machines to the whitelist below, so that previously unresearched recipes can still be pasted by later blueprints.\n  It may be helpful to include entities such as rails and roboports to the whitelist to help align blueprints. */
  IncludeEntitiesInTheNextNStagesTooltip = "bp100.gui.project-settings.include-entities-in-the-next-n-stages-tooltip",
  /** or in whitelist: */
  OrInWhitelist = "bp100.gui.project-settings.or-in-whitelist",
  /** Blacklist: */
  Blacklist = "bp100.gui.project-settings.blacklist",
  /** Tiles */
  Tiles = "bp100.gui.project-settings.tiles",
  /** Auto-landfill [img=info] */
  AutoLandfill = "bp100.gui.project-settings.auto-landfill",
  /** Automatically set landfill tiles before taking a blueprint. */
  AutoLandfillTooltip = "bp100.gui.project-settings.auto-landfill-tooltip",
  /** Use next stage's tiles [img=info] */
  UseNextStageTiles = "bp100.gui.project-settings.use-next-stage-tiles",
  /** Each blueprint will contain the next stage's tiles. Useful for landfill. */
  UseNextStageTilesTooltip = "bp100.gui.project-settings.use-next-stage-tiles-tooltip",
  /** Replace infinity chests/pipes with combinators [img=info] */
  ReplaceInfinityWithCombinators = "bp100.gui.project-settings.replace-infinity-with-combinators",
  /** In blueprints, replaces infinity chests/pipes with constant combinators having the same icons when viewed in alt-mode. */
  ReplaceInfinityWithCombinatorsTooltip = "bp100.gui.project-settings.replace-infinity-with-combinators-tooltip",
  /** Export */
  BpExport = "bp100.gui.project-settings.bp-export",
  /** Get blueprint for current stage */
  GetBlueprintForCurrentStage = "bp100.gui.project-settings.get-blueprint-for-current-stage",
  /** Make blueprint book [img=info] */
  MakeBlueprintBook = "bp100.gui.project-settings.make-blueprint-book",
  /** Creates a blueprint book containing all stages. */
  MakeBlueprintBookTooltip = "bp100.gui.project-settings.make-blueprint-book-tooltip",
  /** Export book to file [img=info] */
  ExportBlueprintBookStringToFile = "bp100.gui.project-settings.export-blueprint-book-string-to-file",
  /** Exports the blueprint book string to a file (located in <user-data-directory>/script-output). */
  ExportBlueprintBookStringToFileTooltip = "bp100.gui.project-settings.export-blueprint-book-string-to-file-tooltip",
  /** Rebuild all stages */
  RebuildAllStages = "bp100.gui.project-settings.rebuild-all-stages",
  /** Delete project */
  DeleteProject = "bp100.gui.project-settings.delete-project",
  /** Are you sure you want to delete project __1__? */
  DeleteProjectConfirmation1 = "bp100.gui.project-settings.delete-project-confirmation1",
  /** This cannot be undone. */
  DeleteProjectConfirmation2 = "bp100.gui.project-settings.delete-project-confirmation2",
}
export declare const enum L_GuiTasks {
  /** Cancel */
  Cancel = "bp100.gui.tasks.cancel",
  /** Rebuild all stages */
  RebuildAllStages = "bp100.gui.tasks.rebuild-all-stages",
  /** Rebuilding __1__ */
  RebuildingStage = "bp100.gui.tasks.rebuilding-stage",
}
export declare const enum L_GuiBlueprintBookTask {
  /** Assembling blueprint book */
  AssemblingBlueprintBook = "bp100.gui.blueprint-book-task.assembling-blueprint-book",
  /** Preparing project __1__ */
  ComputeChangedEntities = "bp100.gui.blueprint-book-task.compute-changed-entities",
  /** __1__: preparing to take blueprint */
  ComputeUnitNumberFilter = "bp100.gui.blueprint-book-task.compute-unit-number-filter",
  /** __1__: setting landfill tiles */
  SetLandfillTiles = "bp100.gui.blueprint-book-task.set-landfill-tiles",
  /** __1__: taking blueprint */
  TakeStageBlueprint = "bp100.gui.blueprint-book-task.take-stage-blueprint",
  /** __1__: setting tiles */
  SetNextStageTiles = "bp100.gui.blueprint-book-task.set-next-stage-tiles",
  /** Finishing up */
  FinalizeBlueprintBook = "bp100.gui.blueprint-book-task.finalize-blueprint-book",
  /** Exporting book to file */
  ExportBlueprintBookToFile = "bp100.gui.blueprint-book-task.export-blueprint-book-to-file",
}
export declare const enum L_GuiEntityInfo {
  /** Stage info */
  Title = "bp100.gui.entity-info.title",
  /** First stage */
  FirstStage = "bp100.gui.entity-info.first-stage",
  /** Updated */
  StagesWithChanges = "bp100.gui.entity-info.stages-with-changes",
  /** Last stage */
  LastStage = "bp100.gui.entity-info.last-stage",
  /** Move to this stage */
  MoveToThisStage = "bp100.gui.entity-info.move-to-this-stage",
  /** Cancel deconstruction */
  RemoveLastStage = "bp100.gui.entity-info.remove-last-stage",
  /** Reset train */
  ResetTrain = "bp100.gui.entity-info.reset-train",
  /** Set train location here */
  SetTrainLocationHere = "bp100.gui.entity-info.set-train-location-here",
  /** Force delete entity */
  DeleteEntity = "bp100.gui.entity-info.delete-entity",
  /** Updated settings */
  StageDiff = "bp100.gui.entity-info.stage-diff",
  /** Remove this change (sets to previous value) */
  ResetProp = "bp100.gui.entity-info.reset-prop",
  /** Apply to previous stage (__1__) */
  ApplyToLowerStage = "bp100.gui.entity-info.apply-to-lower-stage",
  /** <All> */
  AllProps = "bp100.gui.entity-info.all-props",
}
