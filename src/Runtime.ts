import * as BunContext from '@effect/platform-bun/BunContext'
import * as Layer from 'effect/Layer'
import * as ManagedRuntime from 'effect/ManagedRuntime'

import * as GitHub from './GitHub'
import * as Repo from './Repo'

export const AppRuntime = ManagedRuntime.make(
  Layer.mergeAll(
    Repo.Repo.Default,
    GitHub.Issues.Default,
    GitHub.PullRequests.Default,
    GitHub.PullRequest.Default,
    BunContext.layer
  )
)
