import { skipToken } from '@tanstack/react-query'
import * as Option from 'effect/Option'

import * as GitHub from './GitHub'
import * as RQE from './ReactQueryEffect'
import { Repo } from './Repo'
import { AppRuntime } from './Runtime'

export const currentDirectoryRepo = () =>
  RQE.queryOptions({
    queryKey: ['currentDirectoryRepo'] as const,
    queryFn: () => AppRuntime.runPromiseExit(Repo.currentRepo),
  })

export const pullRequests = (options: {
  author: Option.Option<string>
  repo: Option.Option<{ owner: string; name: string }>
}) =>
  RQE.queryOptions({
    queryKey: ['pulls', options] as const,
    queryFn: () => AppRuntime.runPromiseExit(GitHub.PullRequests.list(options)),
  })

export const pullRequestReadme = (options: {
  number: Option.Option<number>
  repo: Option.Option<string>
}) => {
  return RQE.queryOptions({
    queryKey: ['pull', options],
    queryFn: Option.match(options.number, {
      onSome: (number) => () =>
        AppRuntime.runPromiseExit(
          GitHub.PullRequests.readme({ ...options, number })
        ),
      onNone: () => skipToken,
    }),
  })
}

export const issues = (options: {
  repo: Option.Option<{ owner: string; name: string }>
}) =>
  RQE.queryOptions({
    queryKey: ['issues', options] as const,
    queryFn: () => AppRuntime.runPromiseExit(GitHub.Issues.list(options)),
  })
