import { TextAttributes } from '@opentui/core'
import * as Match from 'effect/Match'

import * as View from './View'

export const Keybindings = ({ view }: { view: View.View }) => (
  <box flexDirection='column' gap={1} position='relative'>
    <text>
      <b>Keybindings</b>
    </text>

    {Match.value(view).pipe(
      Match.tagsExhaustive({
        Issues: () => null,
        PullRequests: () => (
          <box flexDirection='column'>
            <box gap={1} flexDirection='row'>
              <text minWidth={4}>
                <b>M</b>
              </text>
              <text
                attributes={TextAttributes.DIM}
              >{`gh pr update-branch {number}`}</text>
            </box>
            <box gap={1} flexDirection='row'>
              <text minWidth={4}>
                <b>R</b>
              </text>
              <text
                attributes={TextAttributes.DIM}
              >{`gh pr update-branch {number} --rebase`}</text>
            </box>
          </box>
        ),
        SplashScreen: () => null,
      })
    )}
  </box>
)
