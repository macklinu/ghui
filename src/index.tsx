import { useAtomValue } from '@effect-atom/atom-react'
import * as Command from '@effect/cli/Command'
import * as Options from '@effect/cli/Options'
import * as BunContext from '@effect/platform-bun/BunContext'
import * as BunRuntime from '@effect/platform-bun/BunRuntime'
import { createCliRenderer } from '@opentui/core'
import { createRoot, useAppContext, useKeyboard, useTerminalDimensions } from '@opentui/react'
import * as Effect from 'effect/Effect'
import * as Equal from 'effect/Equal'
import * as Match from 'effect/Match'
import * as Option from 'effect/Option'
import * as Schema from 'effect/Schema'
import { useCallback, useState, type ComponentProps } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { version } from '../package.json'
import * as Dialog from './Dialog'
import { DialogKind } from './DialogKind'
import { Issues } from './Issues'
import { Keybindings } from './Keybindings'
import { PullRequests } from './PullRequests'
import { Repo } from './Repo'
import { RepoProvider } from './RepoProvider'
import { SplashScreen } from './SplashScreen'
import { useToast } from './Toast'
import * as View from './View'

const useCurrentDialog = () => {
  const [dialog, setDialog] = useState<Option.Option<DialogKind>>(Option.none())

  const closeDialog = useCallback(() => {
    setDialog(Option.none())
  }, [])

  const showDialog = useCallback(
    (kind: DialogKind) => {
      const newDialog = Option.some(kind)
      if (Equal.equals(dialog, newDialog)) {
        return
      }
      setDialog(newDialog)
    },
    [dialog]
  )

  return {
    dialog,
    closeDialog,
    showDialog,
  }
}

const App = ({ view: initialView }: { view: Option.Option<View.View> }) => {
  const [view, setView] = useState<View.View>(() =>
    Option.getOrElse(initialView, () => View.SplashScreen())
  )

  useAtomValue(Repo.currentRepoAtom)

  const { dialog, showDialog, closeDialog } = useCurrentDialog()

  const app = useAppContext()

  const dimensions = useTerminalDimensions()

  const toasts = useToast(useShallow((state) => state.toasts))

  useKeyboard((key) => {
    if (key.name === 'p') {
      setView(View.PullRequests({ author: Option.none() }))
    }
    if (key.name === 'i') {
      setView(View.Issues())
    }
    if (key.name === '`') {
      app.renderer?.console.toggle()
    }
    if (key.name === '?') {
      showDialog(DialogKind.Keybindings())
    }
    if (key.name === 'escape') {
      if (Option.isSome(dialog)) {
        closeDialog()
      } else {
        // TODO idk yet
      }
    }
  })

  return (
    <box
      {...dimensions}
      position='relative'
      flexDirection='column'
      borderColor='gray'
      borderStyle='rounded'
      padding={1}
    >
      <box>
        {Match.value(view).pipe(
          Match.when({ _tag: 'SplashScreen' }, () => <SplashScreen />),
          Match.when({ _tag: 'PullRequests' }, ({ author }) => <PullRequests author={author} />),
          Match.when({ _tag: 'Issues' }, () => <Issues />),
          Match.exhaustive
        )}
      </box>
      {Option.map(
        dialog,
        DialogKind.$match({
          Keybindings: () => (
            <Dialog.Component onClose={closeDialog}>
              <Keybindings view={view} />
            </Dialog.Component>
          ),
        })
      ).pipe(Option.getOrNull)}
      <box position='absolute' bottom={0} right={0} flexDirection='column-reverse' maxWidth={64}>
        {toasts.map((toast) => {
          const toastKindToIcon = {
            success: '✅',
            danger: '⛔️',
            warning: '⚠️',
          } as const
          return (
            <box
              border
              borderColor='gray'
              borderStyle='rounded'
              key={toast.id}
              flexDirection='row'
              gap={1}
              alignItems='flex-start'
            >
              <text>{toastKindToIcon[toast.kind]}</text>
              <text>{toast.message}</text>
            </box>
          )
        })}
      </box>
    </box>
  )
}

const renderApp = (
  { repo, ...props }: ComponentProps<typeof App> & { repo: Option.Option<string> } = {
    view: Option.none(),
    repo: Option.none(),
  }
) =>
  Effect.tryPromise(async () => {
    const renderer = await createCliRenderer({
      useAlternateScreen: true,
      useConsole: true,
      consoleOptions: {
        sizePercent: 50,
      },
    })

    return createRoot(renderer).render(
      <RepoProvider repo={repo}>
        <App {...props} />
      </RepoProvider>
    )
  })

const ghui = Command.make('ghui', {}, () => renderApp())

const ghuiPrs = Command.make(
  'prs',
  {
    author: Options.text('author').pipe(Options.withSchema(Schema.String), Options.optional),
    repo: Options.text('repo').pipe(
      Options.withSchema(Schema.String.pipe(Schema.pattern(/^\w[\w.-]*\/\w[\w.-]*$/))),
      Options.withDescription('The repo in org/repo format to set as the current repo context'),
      Options.optional
    ),
  },
  ({ author, repo }) => renderApp({ view: Option.some(View.PullRequests({ author })), repo })
)

const ghuiIssues = Command.make(
  'issues',
  {
    repo: Options.text('repo').pipe(
      Options.withSchema(Schema.String.pipe(Schema.pattern(/^\w[\w.-]*\/\w[\w.-]*$/))),
      Options.withDescription('The repo in org/repo format to set as the current repo context'),
      Options.optional
    ),
  },
  ({ repo }) => renderApp({ view: Option.some(View.Issues()), repo })
)

const cli = Command.run(ghui.pipe(Command.withSubcommands([ghuiPrs, ghuiIssues])), {
  name: 'ghui',
  version,
})

cli(process.argv).pipe(Effect.provide(BunContext.layer), BunRuntime.runMain)
