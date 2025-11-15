import * as Option from 'effect/Option'
import { createContext, useContext, type ReactNode } from 'react'

const RepoContext = createContext<Option.Option<string>>(Option.none())

export const RepoProvider = ({
  children,
  repo,
}: {
  children: ReactNode
  repo: Option.Option<string>
}) => <RepoContext.Provider value={repo}>{children}</RepoContext.Provider>

export const useCurrentRepo = () => useContext(RepoContext)
