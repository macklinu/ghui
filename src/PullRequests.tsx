import { TextAttributes } from '@opentui/core'
import { useKeyboard } from '@opentui/react'
import * as DateTime from 'effect/DateTime'
import * as Match from 'effect/Match'
import * as Option from 'effect/Option'
import { useCallback, useEffect, useState } from 'react'
import invariant from 'tiny-invariant'

import { Loading } from './Loading'
import * as Queries from './Queries'
import * as RQE from './ReactQueryEffect'
import { useCurrentRepo } from './RepoProvider'

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

  const readme = RQE.useQuery(
    Queries.pullRequestReadme({
      number: selectedPrNumber,
      repo: Option.none(),
    })
  )

  const shiftFocus = useCallback(() => {}, [])

  useKeyboard((key) => {
    if (key.name === 'tab') {
      shiftFocus()
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
        <box minWidth={48} border borderColor='gray'>
          {Match.value(pulls).pipe(
            Match.when({ isLoading: true }, () => <Loading kind='dots' />),
            Match.when({ isSuccess: true }, ({ data: prs }) => (
              <select
                focused
                height='100%'
                options={prs.map((pr) => ({
                  name: pr.title,
                  value: pr.number,
                  description: `#${pr.number} | ${pr.user.login} | ${DateTime.format(pr.created_at)}`,
                }))}
                onChange={(index, option) => {
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
          borderColor='gray'
          paddingLeft={2}
          paddingRight={2}
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

          {Match.value(readme).pipe(
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
