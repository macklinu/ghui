import { Result, useAtomSet, useAtomValue } from '@effect-atom/atom-react'
import { TextAttributes } from '@opentui/core'
import { useKeyboard } from '@opentui/react'
import * as DateTime from 'effect/DateTime'
import * as Exit from 'effect/Exit'
import * as Match from 'effect/Match'
import * as Option from 'effect/Option'
import { useEffect, useState } from 'react'
import invariant from 'tiny-invariant'

import * as GitHub from './GitHub'
import { Loading } from './Loading'
import { Repo } from './Repo'
import { useCurrentRepo } from './RepoProvider'
import { useToast } from './Toast'

const elementOrder = ['list', 'detail'] as const

export const PullRequests = ({ author: initialAuthor }: { author: Option.Option<string> }) => {
  const orgRepo = useCurrentRepo()
  // TODO filter author?
  const [_author, _setAuthor] = useState<Option.Option<string>>(initialAuthor)
  const repo = useAtomValue(Repo.getRepoAtom(orgRepo))

  const pulls = useAtomValue(GitHub.PullRequests.listAtom(orgRepo))

  const [elementFocusIndex, setElementFocusIndex] = useState(0)
  const focusedElement = elementOrder[elementFocusIndex % elementOrder.length]

  const [selectedPrNumber, setSelectedPrNumber] = useState<Option.Option<number>>(Option.none())

  const selectedPr = Match.value([pulls, selectedPrNumber]).pipe(
    Match.when([Result.isSuccess, Option.isSome], ([{ value }, prNumber]) =>
      Option.fromNullable(value.find((pr) => pr.number === prNumber.value))
    ),
    Match.orElse(() => Option.none())
  )

  useEffect(() => {
    if (Result.isSuccess(pulls)) {
      setSelectedPrNumber(Option.fromNullable(pulls.value[0]?.number))
    }
  }, [pulls])

  const description = useAtomValue(GitHub.PullRequest.markdownDescriptionAtom(selectedPrNumber))

  const showToast = useToast((state) => state.showToast)

  const updateBranch = useAtomSet(GitHub.PullRequest.updateBranchAtom, { mode: 'promiseExit' })

  useKeyboard((key) => {
    if (key.name === 'tab') {
      const direction = key.shift ? -1 : 1
      setElementFocusIndex((prev) => prev + direction)
    }
    if (key.name === 'm' && key.shift) {
      Match.value([repo, selectedPrNumber]).pipe(
        Match.when([Result.isSuccess, Option.isSome], async ([repo, number]) => {
          if (Option.isNone(repo.value)) {
            return
          }
          const options = {
            repo: repo.value.value,
            number: number.value,
            type: 'merge',
          } as const
          const result = await updateBranch(options)
          if (Exit.isSuccess(result)) {
            showToast({
              kind: 'success',
              message: `${options.repo}#${options.number} updated with ${options.type}`,
            })
          } else {
            showToast({ kind: 'danger', message: 'Unable to update PR branch' })
          }
        })
      )
    }
    if (key.name === 'r' && key.shift) {
      Match.value([repo, selectedPrNumber]).pipe(
        Match.when([Result.isSuccess, Option.isSome], async ([repo, number]) => {
          if (Option.isNone(repo.value)) {
            return
          }
          const options = {
            repo: repo.value.value,
            number: number.value,
            type: 'rebase',
          } as const
          const result = await updateBranch(options)
          if (Exit.isSuccess(result)) {
            showToast({
              kind: 'success',
              message: `${options.repo}#${options.number} updated with ${options.type}`,
            })
          } else {
            showToast({ kind: 'danger', message: 'Unable to update PR branch' })
          }
        })
      )
    }
  })

  return (
    <box padding={1} flexDirection='column'>
      <ascii-font text='ghui' font='tiny' marginBottom={2} />
      <box flexDirection='row' alignItems='center' gap={1}>
        {Result.builder(repo)
          .onWaiting(() => <Loading kind='dots' />)
          .onSuccess((repo) => (
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
          ))
          .orNull()}
      </box>
      <box flexDirection='row'>
        <box
          minWidth={48}
          border
          borderStyle='rounded'
          borderColor={focusedElement === 'list' ? 'white' : 'gray'}
        >
          {Match.value(pulls).pipe(
            Match.when(Result.isWaiting, () => <Loading kind='dots' />),
            Match.when(Result.isSuccess, ({ value: prs }) => (
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

          {Result.builder(description)
            .onWaiting(() => <Loading kind='dots' />)
            .onSuccess(
              Option.match({
                onNone: () => <text attributes={TextAttributes.DIM}>No PR description</text>,
                onSome: (value) => <text>{value}</text>,
              })
            )
            .onFailure(() => (
              <text attributes={TextAttributes.DIM}>Error fetching PR description</text>
            ))
            .orNull()}
        </scrollbox>
      </box>
    </box>
  )
}
