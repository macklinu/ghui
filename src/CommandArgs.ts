import * as Command from '@effect/platform/Command'
import * as Array from 'effect/Array'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import * as Redacted from 'effect/Redacted'

type Value = string | number | Redacted.Redacted<string | number>

export class CommandArgs extends Data.TaggedClass('ghui/CommandArgs')<{
  readonly values: Array.NonEmptyReadonlyArray<Value>
}> {}

export class EmptyCommandArgsError extends Data.TaggedError(
  'ghui/CommandArgs/EmptyCommandArgsError'
) {}

class Builder {
  readonly values: Value[]

  constructor(values: Value[]) {
    this.values = values
  }

  append(...values: Value[]): Builder {
    return new Builder(this.values.concat(values))
  }

  appendIf(condition: boolean, lazyValues: () => Value | Value[]): Builder {
    if (condition) {
      return new Builder(this.values.concat(lazyValues()))
    }
    return new Builder(this.values)
  }

  option<T>(option: Option.Option<T>, mapper: (value: T) => Value[]): Builder {
    return Option.match(option, {
      onSome: (value) => new Builder(this.values.concat(mapper(value))),
      onNone: () => new Builder(this.values),
    })
  }

  build(): Effect.Effect<CommandArgs, EmptyCommandArgsError> {
    if (Array.isNonEmptyReadonlyArray(this.values)) {
      return Effect.succeed(new CommandArgs({ values: this.values }))
    }
    return Effect.fail(new EmptyCommandArgsError())
  }
}

export const builder = (): Builder => new Builder([])

export const toCommand = (commandArgs: CommandArgs): Command.Command =>
  Command.make(
    ...Array.map(commandArgs.values, (value) => {
      if (Redacted.isRedacted(value)) {
        return Redacted.value(value).toString()
      }
      return value.toString()
    })
  )
