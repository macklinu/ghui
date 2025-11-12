import * as Command from '@effect/platform/Command'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import * as Schema from 'effect/Schema'

class User extends Schema.Class<User>('User')({
  id: Schema.Number,
  login: Schema.String,
}) {}

class PullRequest extends Schema.Class<PullRequest>('PullRequest')({
  user: User,
  created_at: Schema.DateTimeUtc,
  head: Schema.Struct({
    repo: Schema.Struct({
      name: Schema.String,
      owner: Schema.Struct({
        login: Schema.String,
      }),
    }),
  }),
  base: Schema.Struct({
    repo: Schema.Struct({
      name: Schema.String,
      owner: Schema.Struct({
        login: Schema.String,
      }),
    }),
  }),
  id: Schema.Number,
  draft: Schema.Boolean,
  number: Schema.Number,
  state: Schema.String,
  title: Schema.String,
}) {}

export class PullRequests extends Effect.Service<PullRequests>()(
  'ghui/GitHub/PullRequests',
  {
    accessors: true,
    sync: () => ({
      list: Effect.fn('PullRequests.list')(function* ({
        author,
        repo,
      }: {
        author: Option.Option<string>
        repo: Option.Option<{ owner: string; name: string }>
      }) {
        const [gh, ...args] = [
          'gh',
          'api',
          Option.match(repo, {
            onSome: (repo) => `repos/${repo.owner}/${repo.name}/pulls`,
            onNone: () => `repos/{owner}/{repo}/pulls`,
          }),
          '--paginate',
        ] as const

        const result = yield* Command.make(gh, ...args).pipe(Command.string)

        const response = yield* Schema.decodeUnknown(
          Schema.compose(Schema.parseJson(), Schema.Array(PullRequest))
        )(result)

        return Option.match(author, {
          onSome: (author) => response.filter((pr) => pr.user.login === author),
          onNone: () => response,
        })
      }),

      readme: Effect.fn('PullRequests.readme')(function* ({
        number,
      }: {
        number: number
      }) {
        const args = [
          'gh',
          'pr',
          'view',
          '--json',
          'body',
          number.toString(),
        ] as const

        const jsonString = yield* Command.string(Command.make(...args))

        const readme = yield* Schema.decodeUnknown(
          Schema.compose(
            Schema.parseJson(),
            Schema.Struct({ body: Schema.String })
          )
        )(jsonString)

        return readme.body
      }),
    }),
  }
) {}

class Issue extends Schema.Class<Issue>('Issue')({
  user: User,
  created_at: Schema.DateTimeUtc,
  id: Schema.Number,
  number: Schema.Number,
  title: Schema.String,
  body: Schema.OptionFromNullOr(Schema.String),
  pull_request: Schema.OptionFromNullOr(Schema.Unknown),
}) {}

export class Issues extends Effect.Service<Issues>()('ghui/GitHub/Issues', {
  accessors: true,
  sync: () => ({
    list: Effect.fn('Issues.list')(function* ({
      repo,
    }: {
      repo: Option.Option<{ owner: string; name: string }>
    }) {
      const [gh, ...args] = [
        'gh',
        'api',
        Option.match(repo, {
          onSome: (repo) => `repos/${repo.owner}/${repo.name}/issues`,
          onNone: () => `repos/{owner}/{repo}/issues`,
        }),
        '--paginate',
      ] as const

      const result = yield* Command.make(gh, ...args).pipe(Command.string)

      const response = yield* Schema.decodeUnknown(
        Schema.compose(Schema.parseJson(), Schema.Array(Issue))
      )(result)

      return response.filter((issue) => Option.isNone(issue.pull_request))
    }),
  }),
}) {}
