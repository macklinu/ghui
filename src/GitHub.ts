import { Atom } from '@effect-atom/atom-react'
import * as BunContext from '@effect/platform-bun/BunContext'
import * as Command from '@effect/platform/Command'
import { pipe } from 'effect'
import * as Data from 'effect/Data'
import * as Duration from 'effect/Duration'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import * as Schema from 'effect/Schema'
import * as Stream from 'effect/Stream'
import * as String from 'effect/String'

import * as CommandArgs from './CommandArgs'
import * as GitHubApiSchema from './GitHubApiSchema'

export class PermissionError extends Data.TaggedError('ghui/GitHub/PermissionError')<{}> {}

export class UnknownError extends Data.TaggedError('ghui/GitHub/UnknownError')<{
  readonly message: string
}> {}

const runString = <E, R>(stream: Stream.Stream<Uint8Array, E, R>): Effect.Effect<string, E, R> =>
  stream.pipe(Stream.decodeText(), Stream.runFold(String.empty, String.concat))

const runCommand = Effect.fn(function* (command: Command.Command) {
  const [exitCode, stdout, stderr] = yield* pipe(
    // Start running the command and return a handle to the running process
    Command.start(command),
    Effect.flatMap((process) =>
      Effect.all(
        [
          // Waits for the process to exit and returns
          // the ExitCode of the command that was run
          process.exitCode,
          // The standard output stream of the process
          runString(process.stdout),
          // The standard error stream of the process
          runString(process.stderr),
        ],
        { concurrency: 3 }
      )
    )
  )

  if (exitCode === 0) {
    return yield* Effect.succeed(stdout)
  } else {
    return yield* Effect.fail(new UnknownError({ message: stderr }))
  }
})

export class PullRequests extends Effect.Service<PullRequests>()('ghui/GitHub/PullRequests', {
  accessors: true,
  sync: () => ({
    list: Effect.fn('PullRequests.list')(function* ({ repo }: { repo: Option.Option<string> }) {
      const args = yield* CommandArgs.builder()
        .append(
          'gh',
          'api',
          Option.match(repo, {
            onSome: (repo) => `repos/${repo}/pulls`,
            onNone: () => `repos/{owner}/{repo}/pulls`,
          }),
          '--paginate'
        )
        .build()

      const result = yield* CommandArgs.toCommand(args).pipe(Command.string)

      return yield* Schema.decodeUnknown(
        Schema.compose(Schema.parseJson(), Schema.Array(GitHubApiSchema.PullRequest))
      )(result)
    }),
  }),
  dependencies: [BunContext.layer],
}) {
  static readonly runtime = Atom.runtime(PullRequests.Default)

  static readonly listAtom = Atom.family((repo: Option.Option<string>) =>
    PullRequests.runtime
      .atom(PullRequests.list({ repo }).pipe(Effect.provide(BunContext.layer)))
      .pipe(Atom.setIdleTTL(Duration.decode('10 minutes')))
  )
}

type UpdateBranchOptions = {
  number: number
  repo: string
  type?: 'rebase' | 'merge'
}

export class PullRequest extends Effect.Service<PullRequest>()('ghui/GitHub/PullRequest', {
  accessors: true,
  sync: () => ({
    markdownDescription: Effect.fn('PullRequest.markdownDescription')(function* ({
      number,
    }: {
      number: number
    }) {
      const args = yield* CommandArgs.builder()
        .append('gh', 'pr', 'view', '--json', 'body', number)
        .build()

      const jsonString = yield* Command.string(CommandArgs.toCommand(args))

      const readme = yield* Schema.decodeUnknown(
        Schema.compose(Schema.parseJson(), Schema.Struct({ body: Schema.String }))
      )(jsonString)

      return readme.body
    }),
    updateBranch: Effect.fn('PullRequest.updateBranch')(function* ({
      number,
      repo,
      type = 'merge',
    }: UpdateBranchOptions) {
      const args = yield* CommandArgs.builder()
        .append('gh', 'pr', 'update-branch', number, '--repo', repo)
        .appendIf(type === 'rebase', () => '--rebase')
        .build()

      return yield* CommandArgs.toCommand(args).pipe(
        runCommand,
        Effect.mapError((error) => {
          if (error._tag === 'ghui/GitHub/UnknownError') {
            if (/does not have the correct permissions/i.test(error.message)) {
              return new PermissionError()
            }
          }
          return error
        })
      )
    }),
  }),
  dependencies: [BunContext.layer],
}) {
  static readonly runtime = Atom.runtime(PullRequest.Default)

  static readonly markdownDescriptionAtom = Atom.family((number: Option.Option<number>) =>
    PullRequest.runtime
      .atom(
        Effect.gen(function* () {
          if (Option.isNone(number)) {
            return Option.none<string>()
          }
          const description = yield* PullRequest.markdownDescription({ number: number.value })
          if (!description) {
            return Option.none<string>()
          }
          return Option.some(description)
        }).pipe(Effect.provide(BunContext.layer))
      )
      .pipe(Atom.setIdleTTL(Duration.decode('30 minutes')))
  )

  static readonly updateBranchAtom = PullRequest.runtime.fn(
    Effect.fnUntraced(function* (args: UpdateBranchOptions) {
      return yield* PullRequest.updateBranch(args)
    }, Effect.provide(BunContext.layer))
  )
}

export class Issues extends Effect.Service<Issues>()('ghui/GitHub/Issues', {
  accessors: true,
  sync: () => ({
    list: Effect.fn('Issues.list')(function* ({ repo }: { repo: Option.Option<string> }) {
      const args = yield* CommandArgs.builder()
        .append(
          'gh',
          'api',
          Option.match(repo, {
            onSome: (orgRepo) => `repos/${orgRepo}/issues`,
            onNone: () => `repos/{owner}/{repo}/issues`,
          }),
          '--paginate'
        )
        .build()

      const result = yield* CommandArgs.toCommand(args).pipe(Command.string)

      const response = yield* Schema.decodeUnknown(
        Schema.compose(Schema.parseJson(), Schema.Array(GitHubApiSchema.Issue))
      )(result)

      return response.filter((issue) => Option.isNone(issue.pull_request))
    }),
    dependencies: [BunContext.layer],
  }),
}) {
  static readonly runtime = Atom.runtime(Issues.Default)

  static readonly listAtom = Atom.family((repo: Option.Option<string>) =>
    Issues.runtime
      .atom(Issues.list({ repo }).pipe(Effect.provide(BunContext.layer)))
      .pipe(Atom.setIdleTTL(Duration.decode('10 minutes')))
  )
}
