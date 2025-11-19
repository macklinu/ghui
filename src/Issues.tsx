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

export const Issues = () => {
  const orgRepo = useCurrentRepo()
  const repo = RQE.useQuery(Queries.getRepo(orgRepo))
  const issues = RQE.useQuery(Queries.issues({ repo: orgRepo }))

  const [selectedIssueNumber, setSelectedIssueNumber] = useState<
    Option.Option<number>
  >(Option.none())

  useEffect(() => {
    if (issues.isSuccess) {
      setSelectedIssueNumber(Option.fromNullable(issues.data[0]?.number))
    }
  }, [issues.isSuccess, issues.data])

  const selectedIssue = Match.value([issues, selectedIssueNumber]).pipe(
    Match.when(
      [{ isSuccess: true }, Option.isSome],
      ([{ data }, issueNumber]) =>
        Option.fromNullable(
          data.find((issue) => issue.number === issueNumber.value)
        )
    ),
    Match.orElse(() => Option.none())
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
              <text>issues</text>
              {Option.isSome(selectedIssueNumber) && (
                <>
                  <text>{'→'}</text>
                  <text>#{selectedIssueNumber.value}</text>
                </>
              )}
            </>
          )),
          Match.orElse(() => null)
        )}
      </box>
      <box flexDirection='row'>
        <box minWidth={48} border borderStyle='rounded' borderColor='gray'>
          {Match.value(issues).pipe(
            Match.when({ isLoading: true }, () => <Loading kind='dots' />),
            Match.when({ isSuccess: true }, ({ data: issues }) => (
              <select
                focused
                height='100%'
                options={issues.map((issue) => ({
                  name: issue.title,
                  value: issue.number,
                  description: `#${issue.number} | ${issue.user.login} | ${DateTime.format(issue.created_at)}`,
                }))}
                onChange={(index, option) => {
                  invariant(option)
                  invariant(typeof option.value === 'number')
                  setSelectedIssueNumber(Option.some(option.value))
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
        >
          <box marginBottom={1} gap={1} flexDirection='row'>
            {Option.map(selectedIssue, (issue) => (
              <>
                <text>
                  <span attributes={TextAttributes.DIM}>#{issue.number}</span>
                </text>
                <text>
                  <strong>{issue.title}</strong>
                </text>
              </>
            )).pipe(Option.getOrNull)}
          </box>
          <text>
            {Match.value(issues).pipe(
              Match.when({ isSuccess: true }, ({ data }) =>
                Option.match(selectedIssueNumber, {
                  onNone: () => null,
                  onSome: (selectedIssueNumber) =>
                    data
                      .find((issue) => issue.number === selectedIssueNumber)
                      ?.body.pipe(Option.getOrElse(() => null)) ?? null,
                })
              ),
              Match.orElse(() => null)
            )}
          </text>
        </scrollbox>
      </box>
    </box>
  )
}
