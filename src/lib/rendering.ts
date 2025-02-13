// noinspection JSUnusedGlobalSymbols

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

import { LuaRendering, uint64 } from "factorio:runtime"

type Getters = {
  [K in keyof LuaRendering as K extends `get_${infer P}`
    ? LuaRendering[K] extends (id: uint64) => any
      ? P
      : never
    : never]-?: LuaRendering[K] extends (id: uint64) => infer R ? R : never
}
type RawSetters = {
  [K in keyof LuaRendering as K extends `set_${infer P}`
    ? LuaRendering[K] extends (id: uint64, value: any) => void
      ? P
      : never
    : never]-?: LuaRendering[K] extends (id: uint64, value: infer V) => void ? V : never
}
type Setters = {
  [K in keyof RawSetters as K extends keyof Getters
    ? Getters[K] & AnyNotNil extends RawSetters[K]
      ? K
      : never
    : K]: RawSetters[K]
}

type OtherSetters = {
  [K in keyof LuaRendering as K extends `set_${infer P}`
    ? P extends keyof Setters
      ? never
      : LuaRendering[K] extends (id: uint64, ...args: any) => void
      ? K
      : never
    : never]: LuaRendering[K] extends (id: uint64, ...args: infer V) => void
    ? (this: unknown, ...args: V) => void
    : never
}

type GetOnlyKeys = Exclude<keyof Getters, keyof Setters>
type GetAndSetKeys = keyof Getters & keyof Setters

export type DrawParams = {
  readonly [K in keyof LuaRendering as K extends `draw_${infer P}` ? P : never]: LuaRendering[K] extends (
    params: infer P,
  ) => uint64
    ? P
    : never
}
export type RenderType = keyof DrawParams

/** @noSelf */
interface BaseRenderObj<T extends RenderType> {
  readonly id: uint64
  readonly valid: boolean
  readonly type: T
  readonly object_name: "_RenderObj"
  destroy(): void
}
type AsObj = {
  readonly [K in GetOnlyKeys]-?: NonNullable<Getters[K]>
} & {
  [K in GetAndSetKeys]-?: Getters[K] & Setters[K]
}
interface KeyRemap {
  tint: "color"
}

type RenderObj<T extends RenderType = RenderType> = BaseRenderObj<T> &
  Pick<AsObj, (keyof DrawParams[T] & keyof AsObj) | KeyRemap[keyof DrawParams[T] & keyof KeyRemap]> &
  Pick<OtherSetters, `set_${keyof DrawParams[T] & string}` & keyof OtherSetters>

export type SpriteRender = RenderObj<"sprite">
export type RectangleRender = RenderObj<"rectangle">
export type CircleRender = RenderObj<"circle">
export type PolygonRender = RenderObj<"polygon">
export type TextRender = RenderObj<"text">
export type ArcRender = RenderObj<"arc">
export type LineRender = RenderObj<"line">
export type AnimationRender = RenderObj<"animation">
export type LightRender = RenderObj<"light">
export type AnyRender = { [K in RenderType]: RenderObj<K> }[RenderType]

const rendering: LuaRendering = (_G as any).rendering

const setterKeys = keySet<Setters>()
const getterKeys = keySet<Getters>()
const otherSetterKeys = keySet<OtherSetters>()

function getKey(key: string) {
  const [success, value] = pcall(() => (rendering as any)[key])
  if (success) return value
}
const setters: {
  [K in keyof Setters]: LuaRendering[`set_${K}`]
} = {} as any
for (const key of setterKeys) {
  setters[key] = getKey(`set_${key}`)
}
const getters: {
  -readonly [K in keyof Getters]: LuaRendering[`get_${K}`]
} & {
  valid: LuaRendering["is_valid"]
  destroy: (this: void, id: uint64) => () => void
} = {} as any
for (const key of getterKeys) {
  getters[key] = getKey(`get_${key}`)
}
getters.valid = rendering.is_valid
getters.destroy = (id) => () => {
  rendering.destroy(id)
}

const otherProps: {
  [K in keyof OtherSetters]: (this: BaseRenderObj<RenderType>, ...args: any[]) => void
} & {
  object_name: BaseRenderObj<any>["object_name"]
} = {} as any
for (const key of otherSetterKeys) {
  const set = rendering[key] as (id: uint64, ...args: any) => void
  otherProps[key] = function (this: BaseRenderObj<RenderType>, ...args: any[]) {
    set(this.id, ...args)
  }
}
otherProps.object_name = "_RenderObj"

const metatable: LuaMetatable<BaseRenderObj<RenderType>, any> = {
  __index(this: BaseRenderObj<RenderType>, key: string) {
    const getter = getters[key as keyof Getters]
    if (getter != nil) return getter(this.id)
    return otherProps[key as keyof OtherSetters]
  },
  __newindex(this: BaseRenderObj<RenderType>, key: string, value: any) {
    const setter = setters[key as keyof Setters]
    if (setter != nil) setter(this.id, value as never)
    else error(`${key} not in render object`)
  },
}
script.register_metatable("render obj", metatable)
export default function draw<T extends RenderType>(type: T, params: DrawParams[T]): RenderObj<T> {
  const id = rendering[`draw_${type}`](params as any)
  return setmetatable<any>({ id }, metatable)
}

export function destroyAllRenders(): void {
  for (const id of rendering.get_all_ids(script.mod_name)) {
    rendering.destroy(id)
  }
}
