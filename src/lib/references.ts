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

// noinspection JSUnusedGlobalSymbols

import { Registry } from "./registry"
import { PRRecord } from "./util-types"

// --- Classes ---

// on a class it marks if the class was processed
// on an instance (prototype) it returns the class name
export interface Class<T> {
  name: string
  prototype: T
}

const registeredClasses = new LuaSet<Class<any>>()
function registerClass(name: string, item: Class<any>) {
  script.register_metatable(name, item.prototype)
  if (registeredClasses.has(item)) {
    error(`Class ${name} is already registered`)
  }
  registeredClasses.add(item)

  const prototype = item.prototype
  // make sure __call meta-method works for subclasses
  rawset(prototype, "__call", prototype.__call)

  // register static functions
  for (const [key, value] of pairs(item)) {
    // noinspection SuspiciousTypeOfGuard
    if (typeof value == "function" && typeof key == "string") {
      Functions.registerRaw(name + "." + key, value)
    }
  }
}

export function RegisterClass(name: string): (this: unknown, _class: Class<any>) => void {
  return (_class: Class<any>) => registerClass(name, _class)
}

export function assertIsRegisteredClass(item: Class<any>): void {
  if (!registeredClasses.has(item)) {
    error(`Class ${item.name} is not registered: ` + serpent.block(item))
  }
}

// -- functions --

// eslint-disable-next-line @typescript-eslint/ban-types
export type AnyFunction = Function
export type ContextualFun = (this: any, ...args: any) => any
export type SelflessFun = (this: void, ...args: any) => any

export interface Func<F extends ContextualFun = ContextualFun> {
  // Want to use "call", but that name exists on normal Function interface already
  invoke: F extends (...args: infer A) => infer R ? (this: this, ...args: A) => R : never
}

export type Callback = Func<() => void>

export const Functions = new Registry<AnyFunction>("function", (func: AnyFunction) =>
  serpent.block(type(func) == "function" ? debug.getinfo(func) : func, { nocode: true }),
)

export type Functions = PRRecord<string, AnyFunction>
export function registerFunctions(prefix: string, functions: Functions): void {
  registerFunctionsCustomPrefix(prefix + ":", functions)
}
export function registerFunctionsCustomPrefix(prefix: string, functions: Functions): void {
  for (const [name, func] of pairs(functions)) {
    Functions.registerRaw(prefix + name, func)
  }
}

const _nameToItem = Functions._nameToItem()
@RegisterClass("FuncRef")
class FuncRef implements Func {
  funcName: string

  constructor(public func: SelflessFun) {
    this.funcName = Functions.nameOf(func)
  }

  invoke(...args: any[]): any {
    return (_nameToItem[this.funcName] as SelflessFun)(...args)
  }
}

/** Requires function to be registered. Resulting func takes "this" parameter. */
export function funcRef<F extends SelflessFun>(func: F): Func<F> {
  return new FuncRef(func) as any
}

@RegisterClass("FuncBound1")
class Bound1 {
  constructor(
    public func: Func,
    public arg1: unknown,
  ) {}
  invoke(...args: any[]): any {
    return this.func.invoke(this.arg1, ...args)
  }
}

@RegisterClass("FuncBound2")
class Bound2 {
  constructor(
    public func: Func,
    public arg1: unknown,
    public arg2: unknown,
  ) {}
  invoke(...args: any[]): any {
    return this.func.invoke(this.arg1, this.arg2, ...args)
  }
}

@RegisterClass("FuncBound3")
class Bound3 {
  constructor(
    public func: Func,
    public arg1: unknown,
    public arg2: unknown,
    public arg3: unknown,
  ) {}
  invoke(...args: any[]): any {
    return this.func.invoke(this.arg1, this.arg2, this.arg3, ...args)
  }
}

@RegisterClass("FuncBound4")
class Bound4 {
  constructor(
    public func: Func,
    public arg1: unknown,
    public arg2: unknown,
    public arg3: unknown,
    public arg4: unknown,
  ) {}
  invoke(...args: any[]): any {
    return this.func.invoke(this.arg1, this.arg2, this.arg3, this.arg4, ...args)
  }
}

@RegisterClass("FuncBoundN")
class BoundN {
  private readonly args: unknown[]
  constructor(
    public func: Func,
    ...args: unknown[]
  ) {
    this.args = args
  }
  invoke(...args: any[]): any {
    return this.func.invoke(...this.args, ...args)
  }
}

const boundFuncClasses = [Bound1, Bound2, Bound3, Bound4] as {
  new (func: Func, ...args: unknown[]): Func
}[]

type FOrFunc<F extends SelflessFun> = F | Func<F>

export function bind<A1, A extends any[], R>(
  func: FOrFunc<(this: void, arg1: A1, ...args: A) => R>,
  arg1: A1,
): Func<(...args: A) => R>
export function bind<A1, A2, A extends any[], R>(
  func: FOrFunc<(this: void, arg1: A1, arg2: A2, ...args: A) => R>,
  arg1: A1,
  arg2: A2,
): Func<(...args: A) => R>
export function bind<A1, A2, A3, A extends any[], R>(
  func: FOrFunc<(this: void, arg1: A1, arg2: A2, arg3: A3, ...args: A) => R>,
  arg1: A1,
  arg2: A2,
  arg3: A3,
): Func<(...args: A) => R>
export function bind<A1, A2, A3, A4, A extends any[], R>(
  func: FOrFunc<(this: void, arg1: A1, arg2: A2, arg3: A3, arg4: A4, ...args: A) => R>,
  arg1: A1,
  arg2: A2,
  arg3: A3,
  arg4: A4,
): Func<(...args: A) => R>
export function bind<AX, R>(func: FOrFunc<(...args: AX[]) => R>, ...args: AX[]): Func<(...args: AX[]) => R>
export function bind(func: FOrFunc<SelflessFun>, ...args: unknown[]): Func {
  const argCount = select("#", ...args)
  const Class = boundFuncClasses[argCount - 1] ?? BoundN
  if (typeof func == "function") {
    func = funcRef(func)
  }
  return new Class(func, ...args)
}

@RegisterClass("KeyFunc")
class KeyFunc implements Func {
  constructor(
    private readonly instance: Record<keyof any, ContextualFun>,
    private readonly key: keyof any,
  ) {}

  invoke(...args: unknown[]) {
    const instance = this.instance
    const fn = instance[this.key]
    if (fn == nil) {
      error(
        `Function with name ${tostring(this.key)} does not exist on ${tostring(this.instance)}\n` +
          `Block: ${serpent.block(this.instance, { maxlevel: 1 })}\n` +
          `Metatable: ${serpent.block(getmetatable(this.instance), { maxlevel: 1 })}`,
      )
    }
    return fn.call(instance, ...args)
  }
}

@RegisterClass("NoSelfKeyFunc")
class NoSelfKeyFunc implements Func {
  constructor(
    private readonly instance: Record<keyof any, SelflessFun>,
    private readonly key: keyof any,
  ) {}

  invoke(...args: unknown[]) {
    return this.instance[this.key](...args)
  }
}

/**
 * Instance bind. The single parameter passed must be a property/element access call, and a registered func that calls the instance/key will be returned.
 *
 * ibind(this.foo) stores (this, "foo") and returns a func that calls this.foo().
 */
export const ibind: AccessSplit<<F extends ContextualFun>(func: F) => Func<F>> = ((obj: any, key: keyof any) =>
  new KeyFunc(obj, key)) as any

// noinspection JSUnusedGlobalSymbols
export const ibindNoSelf: AccessSplit<<F extends SelflessFun>(func: F) => Func<F>> = ((obj: any, key: keyof any) =>
  new NoSelfKeyFunc(obj, key)) as any
