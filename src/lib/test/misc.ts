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

export function getPlayer(): LuaPlayer {
  return game.players[1]
}

declare global {
  let __TS__sourcemap: Record<string, Record<string, number | Source> | nil> | nil
}
export interface Source {
  readonly file?: string
  readonly line?: number
}

function tryUseSourcemap(rawFile: string | nil, line: number | nil): Source | nil {
  if (!rawFile || !line || !__TS__sourcemap) return nil
  const [fileName] = string.match(rawFile, "@?(%S+)%.lua")
  if (!fileName) return nil
  const fileSourceMap = __TS__sourcemap[fileName + ".lua"]
  if (!fileSourceMap) return nil
  const data = fileSourceMap[tostring(line)]
  if (!data) return nil
  return typeof data == "number" ? { file: fileName + ".ts", line: data } : data
}

// noinspection JSUnusedGlobalSymbols
export function debugPrint(...values: unknown[]): void {
  const info = debug.getinfo(2, "Sl")!
  const source = tryUseSourcemap(info.source, info.currentline)
  const sourceString = source ? `${source.file}:${source.line ?? 1}` : "<unknown source>"
  const valueStrs = []
  for (const i of $range(1, select("#", ...values))) {
    const value = values[i - 1]
    valueStrs[i - 1] =
      typeof value == "number" || typeof value == "string"
        ? value.toString()
        : serpent.block(value, {
            maxlevel: 3,
            nocode: true,
          })
  }

  const message: LocalisedString = ["", sourceString, ": ", valueStrs.join(", ")]
  game?.print(message)
  log(message)
}

export function pauseTest(): void {
  game.tick_paused = true
  game.speed = 1
  async(1)
}
