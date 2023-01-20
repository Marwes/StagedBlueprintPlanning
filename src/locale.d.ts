// Generated by gen-locale-defs.ts
// noinspection JSUnusedGlobalSymbols

export declare const enum L_ItemName {
  /** Build cleanup tool */
  CleanupTool = "item-name.bp100:cleanup-tool",
  /** Stage move tool */
  StageMoveTool = "item-name.bp100:stage-move-tool",
  /** Filtered stage move tool */
  FilteredStageMoveTool = "item-name.bp100:filtered-stage-move-tool",
  /** Blueprint filters */
  BlueprintFilters = "item-name.bp100:blueprint-filters",
}
export declare const enum L_ShortcutName {
  /** Build cleanup tool */
  CleanupTool = "shortcut-name.bp100:cleanup-tool",
  /** Stage move tool */
  StageMoveTool = "shortcut-name.bp100:stage-move-tool",
  /** Filtered stage move tool */
  FilteredStageMoveTool = "shortcut-name.bp100:filtered-stage-move-tool",
}
export declare const enum L_EntityName {
  /** Blueprint entity marker */
  EntityMarker = "entity-name.bp100:entity-marker",
}
export declare const enum L_ItemGroupName {
  /** Staged blueprint planning utility entities */
  Utility = "item-group-name.bp100:utility",
}
export declare const enum L_ModSettingName {
  /** Use cyclic stage navigation */
  CyclicNavigation = "mod-setting-name.bp100:cyclic-navigation",
  /** Flexible offshore pump placement */
  FlexibleOffshorePumpPlacement = "mod-setting-name.bp100:flexible-offshore-pump-placement",
  /** Location of entity stage info gui */
  EntityInfoLocation = "mod-setting-name.bp100:entity-info-location",
}
export declare const enum L_ModSettingDescription {
  /** The move to previous/next stage controls will wrap around at the first/last stage. */
  CyclicNavigation = "mod-setting-description.bp100:cyclic-navigation",
  /** Allow placing offshore pumps at locations that are not normally allowed. See dropdown tooltips for more info. */
  FlexibleOffshorePumpPlacement = "mod-setting-description.bp100:flexible-offshore-pump-placement",
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
  /** Go to entity's first stage */
  GoToFirstStage = "controls.bp100:go-to-first-stage",
  /** Go to entity's next notable stage */
  GoToNextNotableStage = "controls.bp100:go-to-next-notable-stage",
  /** Move entity to current stage */
  MoveToThisStage = "controls.bp100:move-to-this-stage",
  /** Stage move tool: select next stage */
  StageSelectNext = "controls.bp100:stage-select-next",
  /** Stage move tool: select previous stage */
  StageSelectPrevious = "controls.bp100:stage-select-previous",
}
export declare const enum L_Bp100 {
  /** __1__ (preview) */
  PreviewEntity = "bp100.preview-entity",
  /** __1__ (selection proxy) */
  SelectionProxy = "bp100.selection-proxy",
  /** <Unnamed build __1__> */
  UnnamedAssembly = "bp100.unnamed-assembly",
}
export declare const enum L_Interaction {
  /** An unexpected error occurred: __1__. Additional details outputted to log. Please report this to the mod author! */
  UnexpectedError = "bp100.interaction.unexpected-error",
  /** WARNING: pasting a blueprint from the blueprint [font=default-bold]library[/font] into a staged build is not supported.\nEntities that have settings changed from pasting this blueprint will not be detected (newly created entities are fine).\nTo fix, make a copy of the blueprint (book) first, then paste again. */
  BlueprintNotHandled = "bp100.interaction.blueprint-not-handled",
  /** Entity moved from __1__ */
  EntityMovedFromStage = "bp100.interaction.entity-moved-from-stage",
  /** Cannot flip underground paired with multiple other undergrounds */
  CannotFlipUndergroundDueToMultiplePairs = "bp100.interaction.cannot-flip-underground-due-to-multiple-pairs",
  /** Cannot upgrade underground paired with multiple other undergrounds */
  CannotUpgradeUndergroundDueToMultiplePairs = "bp100.interaction.cannot-upgrade-underground-due-to-multiple-pairs",
  /** Cannot create stage upgrade if underground pair not in the same stage */
  CannotCreateUndergroundUpgradeIfNotInSameStage = "bp100.interaction.cannot-create-underground-upgrade-if-not-in-same-stage",
  /** Upgrading this will change the underground pair */
  CannotUpgradeUndergroundChangedPair = "bp100.interaction.cannot-upgrade-underground-changed-pair",
  /** Cannot move underground belt with upgrade. Try first upgrading in the entity first stage. */
  CannotMoveUndergroundBeltWithUpgrade = "bp100.interaction.cannot-move-underground-belt-with-upgrade",
  /** Max of 5 connections reached (in another stage). */
  MaxConnectionsReachedInAnotherStage = "bp100.interaction.max-connections-reached-in-another-stage",
  /** __1__ does not support moving (in another stage). */
  CantBeTeleportedInAnotherStage = "bp100.interaction.cant-be-teleported-in-another-stage",
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
  /** Not in an staged build */
  NotInAnAssembly = "bp100.interaction.not-in-an-assembly",
  /** No next stage */
  NoNextStage = "bp100.interaction.no-next-stage",
  /** No previous stage */
  NoPreviousStage = "bp100.interaction.no-previous-stage",
  /** Already at entity first stage */
  AlreadyAtFirstStage = "bp100.interaction.already-at-first-stage",
  /** Entity is the same in all stages */
  EntitySameInAllStages = "bp100.interaction.entity-same-in-all-stages",
  /** Blueprint is empty */
  BlueprintEmpty = "bp100.interaction.blueprint-empty",
  /** Blueprint book is empty */
  BlueprintBookEmpty = "bp100.interaction.blueprint-book-empty",
  /** The only entity you should not have removed was removed from the blueprint... snap to grid settings have not been saved properly. Try editing the blueprint again without removing entities. */
  BlueprintFirstEntityRemoved = "bp100.interaction.blueprint-first-entity-removed",
  /** Cannot move to same stage */
  CannotMoveToSameStage = "bp100.interaction.cannot-move-to-same-stage",
  /** WARNING: The filtered stage move tool must be used with instant-deconstruction [font=default-large-bold]disabled[/font]. Otherwise, the tool will not work properly (it will act like a deconstruction planner). */
  FilteredStageMoveToolWarning = "bp100.interaction.filtered-stage-move-tool-warning",
  /** Blueprint book exported to script-output/__1__ */
  BlueprintBookExported = "bp100.interaction.blueprint-book-exported",
}
export declare const enum L_GuiAssemblySelector {
  /** Staged builds */
  ShowAllAssemblies = "bp100.gui.assembly-selector.show-all-assemblies",
  /** Staged builds */
  AllAssemblies = "bp100.gui.assembly-selector.all-assemblies",
  /** New staged build */
  NewAssembly = "bp100.gui.assembly-selector.new-assembly",
  /** [font=default-bold]Ctrl+left click[/font] to move up\n[font=default-bold]Ctrl+right click[/font] to move down */
  ButtonTooltip = "bp100.gui.assembly-selector.button-tooltip",
}
export declare const enum L_GuiAssemblySettings {
  /** Show settings */
  ShowFullSettings = "bp100.gui.assembly-settings.show-full-settings",
  /** Hide settings */
  HideFullSettings = "bp100.gui.assembly-settings.hide-full-settings",
  /** Staged build: */
  TitleCaption = "bp100.gui.assembly-settings.title-caption",
  /** New stage */
  NewStage = "bp100.gui.assembly-settings.new-stage",
  /** After current */
  AfterCurrent = "bp100.gui.assembly-settings.after-current",
  /** At front */
  AtFront = "bp100.gui.assembly-settings.at-front",
  /** Rename */
  RenameAssembly = "bp100.gui.assembly-settings.rename-assembly",
  /** Stage */
  Stage = "bp100.gui.assembly-settings.stage",
  /** Blueprints */
  Blueprints = "bp100.gui.assembly-settings.blueprints",
  /** Other */
  Other = "bp100.gui.assembly-settings.other",
  /** Rename stage */
  RenameStage = "bp100.gui.assembly-settings.rename-stage",
  /** Entities */
  Entities = "bp100.gui.assembly-settings.entities",
  /** Rebuild stage [img=info] */
  ResetStage = "bp100.gui.assembly-settings.reset-stage",
  /** Deletes and replaces all entities to match the stored state.\nThis may help resolve inconsistencies due to bugs. */
  ResetStageTooltip = "bp100.gui.assembly-settings.reset-stage-tooltip",
  /** Disable all entities */
  DisableAllEntities = "bp100.gui.assembly-settings.disable-all-entities",
  /** Enable all entities */
  EnableAllEntities = "bp100.gui.assembly-settings.enable-all-entities",
  /** Set tiles */
  SetTiles = "bp100.gui.assembly-settings.set-tiles",
  /** Lab tiles */
  LabTiles = "bp100.gui.assembly-settings.lab-tiles",
  /** Landfill and water */
  LandfillAndWater = "bp100.gui.assembly-settings.landfill-and-water",
  /** Landfill and lab tiles */
  LandfillAndLab = "bp100.gui.assembly-settings.landfill-and-lab",
  /** Failed to set tiles. Have the "water" or "landfill" tiles been removed by another mod? */
  FailedToSetTiles = "bp100.gui.assembly-settings.failed-to-set-tiles",
  /** Delete stage */
  DeleteStage = "bp100.gui.assembly-settings.delete-stage",
  /** Are you sure you want to delete stage __1__? */
  DeleteStageConfirmation1 = "bp100.gui.assembly-settings.delete-stage-confirmation1",
  /** Stage contents will be merged with the next stage (__1__). */
  DeleteStageConfirmation2First = "bp100.gui.assembly-settings.delete-stage-confirmation2-first",
  /** Stage contents will be merged with the previous stage (__1__). */
  DeleteStageConfirmation2Middle = "bp100.gui.assembly-settings.delete-stage-confirmation2-middle",
  /** Defaults */
  Defaults = "bp100.gui.assembly-settings.defaults",
  /** Current stage [img=info] */
  CurrentStage = "bp100.gui.assembly-settings.current-stage",
  /** These settings override the default settings for the current stage. Overriden settings are highlighted. */
  CurrentStageTooltip = "bp100.gui.assembly-settings.current-stage-tooltip",
  /** Defaults */
  EditingDefaults = "bp100.gui.assembly-settings.editing-defaults",
  /** Overrides for stage: __1__ */
  EditingForStage = "bp100.gui.assembly-settings.editing-for-stage",
  /** Grid settings: */
  GridSettings = "bp100.gui.assembly-settings.grid-settings",
  /** Icons and grid settings: */
  GridSettingsAndIcons = "bp100.gui.assembly-settings.grid-settings-and-icons",
  /** Edit */
  Edit = "bp100.gui.assembly-settings.edit",
  /** Entities */
  FilteringEntities = "bp100.gui.assembly-settings.filtering-entities",
  /** Only include entities changed in the last */
  IncludeEntitiesInTheNextNStages1 = "bp100.gui.assembly-settings.include-entities-in-the-next-n-stages-1",
  /** stages [img=info] */
  IncludeEntitiesInTheNextNStages2 = "bp100.gui.assembly-settings.include-entities-in-the-next-n-stages-2",
  /** Only new entities, or entities with configuration changes in the last "n" stages will be included.\n[font=default-bold]Notes:[/font]\n  Consider adding assembling machines to the "additional whitelist" below, so that previously unresearched recipes can still be pasted by later blueprints.\n  It may be helpful to include entities such as rails and roboports to the "additional whitelist", to help align blueprints with each other. */
  IncludeEntitiesInTheNextNStagesTooltip = "bp100.gui.assembly-settings.include-entities-in-the-next-n-stages-tooltip",
  /** or in whitelist: */
  OrInWhitelist = "bp100.gui.assembly-settings.or-in-whitelist",
  /** Blacklist: */
  Blacklist = "bp100.gui.assembly-settings.blacklist",
  /** Tiles */
  Tiles = "bp100.gui.assembly-settings.tiles",
  /** Auto-landfill [img=info] */
  AutoLandfill = "bp100.gui.assembly-settings.auto-landfill",
  /** Automatically set landfill tiles before taking a blueprint. */
  AutoLandfillTooltip = "bp100.gui.assembly-settings.auto-landfill-tooltip",
  /** Use next stage's tiles [img=info] */
  UseNextStageTiles = "bp100.gui.assembly-settings.use-next-stage-tiles",
  /** Each blueprint will contain the next stage's tiles. Useful for landfill. */
  UseNextStageTilesTooltip = "bp100.gui.assembly-settings.use-next-stage-tiles-tooltip",
  /** Replace infinity chests/pipes with combinators [img=info] */
  ReplaceInfinityWithCombinators = "bp100.gui.assembly-settings.replace-infinity-with-combinators",
  /** In blueprints, replaces infinity chests/pipes with constant combinators having the same icons when viewed in alt-mode. */
  ReplaceInfinityWithCombinatorsTooltip = "bp100.gui.assembly-settings.replace-infinity-with-combinators-tooltip",
  /** Export */
  BpExport = "bp100.gui.assembly-settings.bp-export",
  /** Get blueprint */
  GetBlueprint = "bp100.gui.assembly-settings.get-blueprint",
  /** Make blueprint book [img=info] */
  MakeBlueprintBook = "bp100.gui.assembly-settings.make-blueprint-book",
  /** Creates a blueprint book containing all stages. */
  MakeBlueprintBookTooltip = "bp100.gui.assembly-settings.make-blueprint-book-tooltip",
  /** Export book to file [img=info] */
  ExportBlueprintBookStringToFile = "bp100.gui.assembly-settings.export-blueprint-book-string-to-file",
  /** Exports the blueprint book string to a file (located in <user-data-directory>/script-output). */
  ExportBlueprintBookStringToFileTooltip = "bp100.gui.assembly-settings.export-blueprint-book-string-to-file-tooltip",
  /** Delete staged build */
  DeleteAssembly = "bp100.gui.assembly-settings.delete-assembly",
  /** Are you sure you want to delete staged build __1__? */
  DeleteAssemblyConfirmation1 = "bp100.gui.assembly-settings.delete-assembly-confirmation1",
  /** This cannot be undone. */
  DeleteAssemblyConfirmation2 = "bp100.gui.assembly-settings.delete-assembly-confirmation2",
}
export declare const enum L_GuiEntityInfo {
  /** Stage info */
  Title = "bp100.gui.entity-info.title",
  /** First stage */
  FirstStage = "bp100.gui.entity-info.first-stage",
  /** Updated */
  StagesWithChanges = "bp100.gui.entity-info.stages-with-changes",
  /** Move to this stage */
  MoveToThisStage = "bp100.gui.entity-info.move-to-this-stage",
  /** Reset train */
  ResetTrain = "bp100.gui.entity-info.reset-train",
  /** Set train location here */
  SetTrainLocationHere = "bp100.gui.entity-info.set-train-location-here",
  /** Force delete entity */
  DeleteEntity = "bp100.gui.entity-info.delete-entity",
  /** Stage changes */
  StageDiff = "bp100.gui.entity-info.stage-diff",
  /** Reset */
  ResetProp = "bp100.gui.entity-info.reset-prop",
  /** Apply to previous stage w/ change (__1__) */
  ApplyToLowerStage = "bp100.gui.entity-info.apply-to-lower-stage",
  /** <All> */
  AllProps = "bp100.gui.entity-info.all-props",
}
