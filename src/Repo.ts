import * as BunContext from '@effect/platform-bun/BunContext'
import * as Command from '@effect/platform/Command'
import * as Array from 'effect/Array'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import * as Schema from 'effect/Schema'
import * as Struct from 'effect/Struct'

export class Repository extends Schema.Class<Repository>('Repository')({
  owner: Schema.Struct({
    login: Schema.String,
  }),
  name: Schema.String,
  nameWithOwner: Schema.String,
  defaultBranchRef: Schema.Struct({
    name: Schema.String,
  }),
}) {}

export class Repo extends Effect.Service<Repo>()('ghui/Repo', {
  accessors: true,
  sync: () => ({
    currentRepo: Effect.gen(function* () {
      const command = Command.make(
        'gh',
        'repo',
        'view',
        '--json',
        Struct.keys(Repository.fields).join(',')
      )

      return yield* Command.string(command).pipe(
        Effect.flatMap(
          Schema.decodeUnknown(Schema.compose(Schema.parseJson(), Repository))
        ),
        Effect.map(({ nameWithOwner }) => Option.some(nameWithOwner)),
        Effect.catchAll(() => Effect.succeed(Option.none<string>()))
      )
    }),
    get: Effect.fn(function* (orgRepo: Option.Option<string>) {
      const [gh, ...args] = [
        'gh',
        'repo',
        'view',
        ...Option.map(orgRepo, (repo) => [repo]).pipe(
          Option.getOrElse(() => Array.empty<string>())
        ),
        '--json',
        Struct.keys(Repository.fields).join(','),
      ] as const

      const command = Command.make(gh, ...args)

      return yield* Command.string(command).pipe(
        Effect.flatMap(
          Schema.decodeUnknown(Schema.compose(Schema.parseJson(), Repository))
        ),
        Effect.map(({ nameWithOwner }) => Option.some(nameWithOwner)),
        Effect.catchAll(() => Effect.succeed(Option.none<string>()))
      )
    }),
  }),
  dependencies: [BunContext.layer],
}) {}
