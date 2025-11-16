import { Markdown } from './Markdown'
import { md } from './tags'

const welcomeMessage = md`
welcome to ghui, the TUI for [gh](https://cli.github.com)

If you're here, it's because you ran \`ghui\` without any arguments _and_ you aren't in a GitHub repo directory.

Here's how to remedy this:

- Run \`ghui prs\` in a repo that has been pushed to GitHub.
- Run \`ghui prs --repo macklinu/ghui\` from any directory, where \`--repo owner/name\` sets the default repo context for all commands.
- Run a command that doesn't depend on current repo context, like \`ghui prs --author @me\` to see all of your open PRs.
`.replaceAll(/\\/g, '')

export const SplashScreen = () => (
  <box
    paddingLeft={2}
    paddingRight={2}
    flexGrow={1}
    height='100%'
    maxWidth={64}
    margin='auto'
    flexDirection='column'
    gap={2}
  >
    <ascii-font text='ghui' font='tiny' />
    <Markdown>{welcomeMessage}</Markdown>
  </box>
)
