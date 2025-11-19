import { TextAttributes } from '@opentui/core'
import { useKeyboard } from '@opentui/react'
import { pipe } from 'effect'
import * as Cause from 'effect/Cause'
import * as DateTime from 'effect/DateTime'
import * as Effect from 'effect/Effect'
import * as Match from 'effect/Match'
import * as Option from 'effect/Option'
import { useEffect, useState } from 'react'
import invariant from 'tiny-invariant'

import * as GitHub from './GitHub'
import { Loading } from './Loading'
import * as Queries from './Queries'
import * as RQE from './ReactQueryEffect'
import { useCurrentRepo } from './RepoProvider'
import { AppRuntime } from './Runtime'
import { useToast } from './Toast'

const elementOrder = ['list', 'detail'] as const

export const PullRequests = ({
  author: initialAuthor,
}: {
  author: Option.Option<string>
}) => {
  const orgRepo = useCurrentRepo()
  // TODO filter author?
  const [author, _setAuthor] = useState<Option.Option<string>>(initialAuthor)
  const repo = RQE.useQuery(Queries.getRepo(orgRepo))
  const pulls = RQE.useQuery(
    Queries.pullRequests({
      author,
      repo: orgRepo,
    })
  )

  const [elementFocusIndex, setElementFocusIndex] = useState(0)
  const focusedElement = elementOrder[elementFocusIndex % elementOrder.length]

  const [selectedPrNumber, setSelectedPrNumber] = useState<
    Option.Option<number>
  >(Option.none())

  const selectedPr = Match.value([pulls, selectedPrNumber]).pipe(
    Match.when([{ isSuccess: true }, Option.isSome], ([{ data }, prNumber]) =>
      Option.fromNullable(data.find((pr) => pr.number === prNumber.value))
    ),
    Match.orElse(() => Option.none())
  )

  useEffect(() => {
    if (pulls.isSuccess) {
      setSelectedPrNumber(Option.fromNullable(pulls.data[0]?.number))
    }
  }, [pulls.isSuccess, pulls.data])

  const description = RQE.useQuery(
    Queries.pullRequestMarkdownDescription({
      number: selectedPrNumber,
      repo: Option.none(),
    })
  )

  const showToast = useToast((state) => state.showToast)

  const updateBranch = RQE.useMutation({
    mutationFn: (input: {
      repo: string
      number: number
      type: 'rebase' | 'merge'
    }) =>
      AppRuntime.runPromiseExit(
        GitHub.PullRequest.updateBranch(input).pipe(Effect.scoped)
      ),
    onSuccess(_, { repo, number, type }) {
      showToast({
        kind: 'success',
        message: `${repo}#${number} updated with ${type}`,
      })
    },
    onError(error, { repo, number }) {
      const message = pipe(
        error.cause,
        Cause.map((error) =>
          Match.value(error).pipe(
            Match.when(
              Match.instanceOf(GitHub.PermissionError),
              () => `No permission to update ${repo}#${number}`
            ),
            Match.orElse(() => `Unable to update ${repo}#${number}`)
          )
        ),
        Cause.pretty
      )

      showToast({ kind: 'danger', message })
    },
  })

  useKeyboard((key) => {
    if (key.name === 'tab') {
      const direction = key.shift ? -1 : 1
      setElementFocusIndex((prev) => prev + direction)
    }
    if (key.name === 'm' && key.shift) {
      Match.value([repo, selectedPrNumber]).pipe(
        Match.when(
          [{ isSuccess: true, data: Option.isSome }, Option.isSome],
          ([repo, number]) =>
            updateBranch.mutate({
              repo: repo.data.value,
              number: number.value,
              type: 'merge',
            })
        )
      )
    }
    if (key.name === 'r' && key.shift) {
      Match.value([repo, selectedPrNumber]).pipe(
        Match.when(
          [{ isSuccess: true, data: Option.isSome }, Option.isSome],
          ([repo, number]) =>
            updateBranch.mutate({
              repo: repo.data.value,
              number: number.value,
              type: 'rebase',
            })
        )
      )
    }
  })

  return (
    <box padding={1} flexDirection='column'>
      <ascii-font text='ghui' font='tiny' marginBottom={2} />
      <box flexDirection='row' alignItems='center' gap={1}>
        {Match.value(repo).pipe(
          Match.when({ isLoading: true }, () => <Loading kind='dots' />),
          Match.when({ isSuccess: true }, ({ data: repo }) => (
            <>
              <text>{Option.getOrThrow(repo)}</text>
              <text>{'→'}</text>
              <text>pulls</text>
              {Option.isSome(selectedPrNumber) && (
                <>
                  <text>{'→'}</text>
                  <text>#{selectedPrNumber.value}</text>
                </>
              )}
            </>
          )),
          Match.orElse(() => null)
        )}
      </box>
      <box flexDirection='row'>
        <box
          minWidth={48}
          border
          borderStyle='rounded'
          borderColor={focusedElement === 'list' ? 'white' : 'gray'}
        >
          {Match.value(pulls).pipe(
            Match.when({ isLoading: true }, () => <Loading kind='dots' />),
            Match.when({ isSuccess: true }, ({ data: prs }) => (
              <select
                focused={focusedElement === 'list'}
                height='100%'
                options={prs.map((pr) => ({
                  name: pr.title,
                  value: pr.number,
                  description: `#${pr.number} | ${pr.user.login} | ${DateTime.format(pr.created_at)}`,
                }))}
                onChange={(index, option) => {
                  if (prs.length === 0) return
                  invariant(option)
                  invariant(typeof option.value === 'number')
                  setSelectedPrNumber(Option.some(option.value))
                }}
              />
            )),
            Match.orElse(() => null)
          )}
        </box>
        <scrollbox
          flexGrow={1}
          height='100%'
          border
          borderStyle='rounded'
          borderColor='gray'
          paddingLeft={2}
          paddingRight={2}
          focused={focusedElement === 'detail'}
          focusedBorderColor='white'
        >
          <box marginBottom={1} gap={1} flexDirection='row'>
            {Option.map(selectedPr, (pr) => (
              <>
                <text>
                  <span attributes={TextAttributes.DIM}>#{pr.number}</span>
                </text>
                <text>
                  <strong>{pr.title}</strong>
                </text>
              </>
            )).pipe(Option.getOrNull)}
          </box>

          {Match.value(description).pipe(
            Match.when({ isLoading: true }, () => <Loading kind='dots' />),
            Match.when({ status: 'success' }, ({ data }) =>
              data.length > 0 ? (
                <text>{data}</text>
              ) : (
                <text attributes={TextAttributes.DIM}>No PR description</text>
              )
            ),
            Match.orElse(() => null)
          )}
        </scrollbox>
      </box>
    </box>
  )
}
