import { useKeyboard } from '@opentui/react'
import * as DateTime from 'effect/DateTime'
import * as Match from 'effect/Match'
import * as Option from 'effect/Option'
import { useCallback, useState } from 'react'
import invariant from 'tiny-invariant'

import { Loading } from './Loading'
import * as Queries from './Queries'
import * as RQE from './ReactQueryEffect'

export const Issues = () => {
  const repo = RQE.useQuery(Queries.currentDirectoryRepo())
  const issues = RQE.useQuery(
    Queries.issues({
      repo: Option.none(),
    })
  )

  const [selectedIssue, setSelectedIssue] = useState<Option.Option<number>>(
    Option.none()
  )

  const shiftFocus = useCallback(() => {}, [])

  useKeyboard((key) => {
    if (key.name === 'tab') {
      shiftFocus()
    }
  })

  return (
    <box padding={2} flexDirection='column'>
      <ascii-font text='ghui' font='tiny' marginBottom={2} />
      <box flexDirection='row' alignItems='center' gap={1}>
        {Match.value(repo).pipe(
          Match.when({ isLoading: true }, () => <Loading kind='dots' />),
          Match.when({ isSuccess: true }, ({ data: repo }) => (
            <>
              <text>{Option.getOrThrow(repo)}</text>
              <text>{'→'}</text>
              <text>issues</text>
              {Option.isSome(selectedIssue) && (
                <>
                  <text>{'→'}</text>
                  <text>#{selectedIssue.value}</text>
                </>
              )}
            </>
          )),
          Match.orElse(() => null)
        )}
      </box>
      <box flexDirection='row'>
        <box minWidth={48} border borderColor='gray'>
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
                onSelect={(index, option) => {
                  invariant(option)
                  invariant(typeof option.value === 'number')
                  setSelectedIssue(Option.some(option.value))
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
          paddingTop={1}
          paddingBottom={1}
          paddingLeft={2}
          paddingRight={2}
        >
          <text>
            {Match.value(issues).pipe(
              Match.when({ isSuccess: true }, ({ data }) =>
                Option.match(selectedIssue, {
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
