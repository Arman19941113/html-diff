import { reactive, UnwrapNestedRefs } from 'vue'

export function reactiveFn<T extends object>(param: T): UnwrapNestedRefs<T> {
  return reactive(param)
}
